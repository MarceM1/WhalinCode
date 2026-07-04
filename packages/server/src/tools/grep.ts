import { resolve, relative, join } from 'path';
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

function shouldSkip(filePath: string): boolean {
    const segments = filePath.split(/[\\/]/);
    return segments.some((s) => SKIP_DIRS.has(s));
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

                // Scan all files in the target directory
                const scanGlob = new Bun.Glob(include ?? '**/*');
                const filePaths: string[] = [];

                for await (const entry of scanGlob.scan({
                    cwd: resolved,
                    dot: false,
                    onlyFiles: true,
                })) {
                    if (!shouldSkip(entry) && !isHiddenPath(entry) && !isBinaryPath(entry)) {
                        filePaths.push(entry);
                    }
                }

                filePaths.sort();

                const matches: { file: string; line: number; content: string }[] = [];
                let truncated = false;
                let totalMatches = 0;

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
                            totalMatches++;

                            if (matches.length < MAX_MATCHES) {
                                matches.push({
                                    file: relative(cwd, absolutePath),
                                    line: i + 1,
                                    content: lines[i]!.trimEnd(),
                                });
                            } else {
                                truncated = true;
                            }
                        }
                    }
                }

                if (matches.length === 0) {
                    return { matches: [], message: 'No matches found' };
                }

                return {
                    matches,
                    ...(truncated ? { truncated: true, totalMatches } : {}),
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
