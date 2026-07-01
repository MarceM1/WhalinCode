import { resolve, relative } from 'path';
import { tool } from 'ai';
import { z } from 'zod';

const MAX_RESULT = 200;

export function createGlobTool(cwd: string) {
    return tool({
        description:
            'Find files matching a glob pattern in the project. Returns file paths relative to the project root. Skips node_modules and hidden directories.',
        inputSchema: z.object({
            pattern: z.string().describe('Glob pattern to math (e.g. "*/*.ts", "src/**/*.tsx")'),
            path: z
                .string()
                .default('.')
                .describe('Relative directory to search in (defaults to project root)'),
        }),
        execute: async ({ pattern, path }) => {
            const resolved = resolve(cwd, path);

            if (!resolved.startsWith(cwd)) {
                return {
                    error: `Path is outside of project directory: ${path}`,
                };
            }

            try {
                const glob = new Bun.Glob(pattern);
                const files: string[] = [];
                let truncated = false;

                for await (const match of glob.scan({
                    cwd: resolved,
                    dot: false,
                    onlyFiles: true,
                })) {
                    // Skip node_modules matches
                    if (match.includes('node_modules')) continue;

                    if (files.length >= MAX_RESULT) {
                        truncated = true;
                        break;
                    }

                    // Return paths relative to project root
                    const absoluteMatch = resolve(resolved, match);
                    files.push(relative(cwd, absoluteMatch));
                }

                files.sort();

                return {
                    files,
                    ...(truncated ? { truncated: true } : {}),
                };
            } catch (error) {
                const message = error instanceof Error ? error.message : String(error);
                return {
                    error: `Failed to execute command: ${message}`,
                };
            }
        },
    });
}
