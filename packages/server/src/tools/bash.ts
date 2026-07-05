import { platform } from 'os';
import { tool } from 'ai';
import { z } from 'zod';

const MAX_OUTPUT = 20_000;
const DEFAULT_TIMEOUT = 30_000;

/**
 * Resolve the shell invocation for the current platform so commands run
 * consistently across Windows, macOS and Linux.
 *
 * - On Windows we prefer PowerShell (available by default on modern Windows)
 *   and fall back to cmd.exe when it isn't present.
 * - On Unix-like systems we use the user's $SHELL, falling back to /bin/sh
 *   which is guaranteed to exist.
 */
function resolveShell(command: string): string[] {
    if (platform() === 'win32') {
        const comspec = process.env.ComSpec ?? 'cmd.exe';
        // /d skips AutoRun, /s + /c preserves quoting, /c runs and exits.
        return [comspec, '/d', '/s', '/c', command];
    }

    const shell = process.env.SHELL ?? '/bin/sh';
    return [shell, '-c', command];
}

export function createBashTool(cwd: string) {
    return tool({
        description:
            'Execute a shell command in the project. Use this for running tests, builds, git operations, package installs, and any other shell commands. Runs on the platform-native shell (PowerShell/cmd on Windows, sh on Unix).',
        inputSchema: z.object({
            command: z.string().describe('The shell command to execute'),
            timeout: z
                .number()
                .default(DEFAULT_TIMEOUT)
                .describe(
                    'The maximum time in milliseconds to wait for the command to complete. Default is 30 seconds.',
                ),
        }),
        execute: async ({ command, timeout }) => {
            let timedOut = false;

            try {
                const proc = Bun.spawn(resolveShell(command), {
                    cwd,
                    stdout: 'pipe',
                    stderr: 'pipe',
                    env: { ...process.env, TERM: 'dumb' },
                });

                const timer = setTimeout(() => {
                    timedOut = true;
                    proc.kill();
                }, timeout);

                const response = new Response(proc.stdout);

                const [stdout, stderr] = await Promise.all([
                    new Response(proc.stdout).text(),
                    new Response(proc.stderr).text(),
                ]);

                const exitCode = await proc.exited;
                clearTimeout(timer);

                const truncate = (s: string) =>
                    s.length > MAX_OUTPUT
                        ? s.slice(0, MAX_OUTPUT) + `\n... (truncated, ${s.length} total chars)`
                        : s;

                if (timedOut) {
                    return {
                        stdout: truncate(stdout),
                        stderr: truncate(stderr),
                        exitCode,
                        error: `Command timed out after ${timeout}ms and was terminated.`,
                    };
                }

                return {
                    stdout: truncate(stdout),
                    stderr: truncate(stderr),
                    exitCode,
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
