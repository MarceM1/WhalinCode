import { resolve, relative, join } from 'path';
import { readdir } from 'fs/promises';
import { tool } from 'ai';
import { z } from 'zod';

const MAX_MATCHES = 50;

const SKIP_DIRS = new Set(['node_modules', '.git', '.svn', '.hg', '.DS_Store']);

const BINARY_EXTENSIONS = new Set([
    '.png',
    '.jpg',
    '.jpeg',
    '.gif',
    '.bmp',
    '.ico',
    '.webp',
    '.svg',
    '.woff',
    '.woff2',
    '.ttf',
    '.eot',
    '.otf',
    '.zip',
    '.tar',
    '.gz',
    '.bz2',
    '.7z',
    '.rar',
    '.exe',
    '.dll',
    '.so',
    '.dylib',
    '.bin',
    '.pdf',
    '.doc',
    '.docx',
    '.xls',
    '.xlsx',
    '.mp3',
    '.mp4',
    '.avi',
    '.mov',
    '.wav',
    '.lock',
]);

function isBinaryPath(filePath: string): boolean {
    const ext = filePath.slice(filePath.lastIndexOf('.')).toLowerCase();
    return BINARY_EXTENSIONS.has(ext);
}

function isHiddenPath(filePath: string): boolean {
    return filePath
        .split(/[\\/]/)
        .some((segment) => segment.startsWith('.') && segment !== '.' && segment !== '..');
}

/**
 * Recursively walk a directory, pruning skip/hidden directories during
 * traversal so we never descend into node_modules (etc.). Returns file paths
 * relative to `root`. An optional glob matcher filters files by pattern.
 */
async function walkFiles(
    root: string,
    matcher: Bun.Glob | null,
    dir = root,
    results: string[] = [],
): Promise<string[]> {
    let entries;

    try {
        entries = await readdir(dir, { withFileTypes: true });
    } catch {
        return results;
    }

    for (const entry of entries) {
        const name = entry.name;

        if (entry.isDirectory()) {
            // Prune excluded and hidden directories up front so we never
            // traverse into them (e.g. node_modules, .git).
            if (SKIP_DIRS.has(name) || name.startsWith('.')) {
                continue;
            }
            await walkFiles(root, matcher, join(dir, name), results);
            continue;
        }

        if (!entry.isFile()) {
            continue;
        }

        const relPath = relative(root, join(dir, name));

        if (matcher && !matcher.match(relPath)) {
            continue;
        }

        if (!isHiddenPath(relPath) && !isBinaryPath(relPath)) {
            results.push(relPath);
        }
    }

    return results;
}

export function createGrepTool(cwd: string) {
    return tool({
        description:
            'Search file contents using a regex pattern. Returns matching lines with file paths and line numbers. Skips hidden directories, node_modules, and binary files.',
        inputSchema: z.object({
            pattern: z.string().describe('Regex pattern to search for.'),
            path: z
                .string()
                .default('.')
                .describe('Relative directory to search in (defaults to project root)'),
            include: z
                .string()
                .describe('Glob pattern to filter files (e.g. "*/*.ts", "src/**/*.tsx")')
                .optional(),
        }),
        execute: async ({ pattern, path, include }) => {
            const resolved = resolve(cwd, path);

            if (!resolved.startsWith(cwd)) {
                return {
                    error: `Path is outside of project directory: ${path}`,
                };
            }

            try {
                const regex = new RegExp(pattern);

                // Scan all files in the target directory, pruning
                // node_modules and hidden directories during traversal.
                const matcher = include ? new Bun.Glob(include) : null;
                const filePaths = await walkFiles(resolved, matcher);

                filePaths.sort();

                const matches: { file: string; line: number; content: string }[] = [];
                let truncated = false;
                let scanedMatches = 0;

                for (const filePath of filePaths) {
                    if (truncated) break;

                    const absolutePath = join(resolved, filePath);
                    let text: string;

                    try {
                        const file = Bun.file(absolutePath);
                        text = await file.text();
                    } catch {
                        // Skip files that can't be read
                        continue;
                    }

                    const lines = text.split('\n');

                    for (let i = 0; i < lines.length; i++) {
                        if (regex.test(lines[i]!)) {
                            scanedMatches++;

                            if (matches.length < MAX_MATCHES) {
                                matches.push({
                                    file: relative(cwd, absolutePath),
                                    line: i + 1,
                                    content: lines[i]!.trimEnd(),
                                });
                            } else {
                                truncated = true;
                                break;
                            }
                        }
                    }
                }

                if (matches.length === 0) {
                    return { matches: [], message: 'No matches found' };
                }

                return {
                    matches,
                    ...(truncated ? { truncated: true, scanedMatches } : {}),
                };
            } catch (error) {
                const message = error instanceof Error ? error.message : String(error);

                // Check if it's an invalid regex
                if (error instanceof SyntaxError) {
                    return { error: `Invalid regex pattern: ${message}` };
                }

                return {
                    error: `Failed to search files: ${message}`,
                };
            }
        },
    });
}
