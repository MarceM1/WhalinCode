import { constants } from 'fs';
import { mkdir, readFile, readdir, stat, writeFile, access, realpath } from 'fs/promises';
import { dirname, isAbsolute, join, relative, resolve, extname } from 'path';
import { toolInputSchemas, Mode, readOnlyToolNames, type ModeType } from '@whalincode/shared';
import fg from 'fast-glob';
import { clearTimeout } from 'timers';
import { check } from 'recheck';

// Prevent loading very large files into context while allowing normal source files.
// Large files should be inspected using startLine/endLine ranges.
const MAX_FILE_SIZE = 175_000;
const MAX_RANGE_FILE_SIZE = 50_000_000;
const MAX_RESULTS = 200;
const MAX_MATCHES = 50;
const MAX_OUTPUT = 20_000;
const DEFAULT_TIMEOUT = 30_000;
const DEFAULT_IGNORED_DIRECTORY_NAMES = new Set(['node_modules', '.git']);
const DEFAULT_IGNORED_GLOBS: string[] = ['**/node_modules/**', '**/.git/**'];
const MAX_GREP_FILE_SIZE = 1_000_000;
const MAX_GREP_DURATION_MS = 10_000;

const BINARY_EXTENSIONS = new Set([
    '.png',
    '.jpg',
    '.jpeg',
    '.gif',
    '.ico',
    '.pdf',
    '.zip',
    '.gz',
    '.7z',
    '.rar',
    '.woff',
    '.woff2',
    '.ttf',
    '.otf',
    '.exe',
    '.dll',
    '.so',
    '.dylib',
    '.webp',
    '.avif',
    '.bmp',
    '.mp3',
    '.mp4',
    '.mov',
    '.avi',
    '.wav',
    '.class',
    '.jar',
    '.o',
    '.obj',
    '.a',
    '.lib',
]);

async function realPathOfNearesExisting(target: string): Promise<string> {
    let current = target;
    const suffixes: string[] = [];

    // Sube hasta el primer ancestro existente para poder resolver symlinks
    // incluso cuando el archivo destino aún no existe
    for (;;) {
        try {
            return resolve(await realpath(current), ...suffixes.reverse());
        } catch {
            const parent = dirname(current);
            if (parent === current) {
                return target;
            }
            suffixes.push(relative(parent, current));
            current = parent;
        }
    }
}

async function resolveInsideCwd(path: string) {
    const cwd = await realpath(process.cwd());
    const resolved = await realPathOfNearesExisting(resolve(cwd, path));
    const rel = relative(cwd, resolved);

    if (rel.startsWith('..') || isAbsolute(rel)) {
        throw new Error('Path is outside the project directory.');
    }

    return { cwd, resolved };
}

async function getShell(): Promise<string[]> {
    if (process.platform !== 'win32') {
        return ['bash', '-c'];
    }

    // Los modelos de IA para programación (Claude, Codex, Gemini, etc.) generan
    // comandos Bash por defecto, independientemente del sistema operativo donde
    // se ejecute WhalinCode. En lugar de intentar traducir comandos arbitrarios
    // de Bash a PowerShell o CMD, requerimos un shell compatible con Bash en
    // Windows (actualmente Git Bash). Esto mantiene un comportamiento consistente
    // entre plataformas y simplifica la implementación en esta etapa del proyecto.
    const GIT_BASH_CANDIDATES = [
        'C:\\Program Files\\Git\\bin\\bash.exe',
        'C:\\Program Files\\Git\\usr\\bin\\bash.exe',
        'C:\\Program Files (x86)\\Git\\bin\\bash.exe',
        'C:\\Program Files (x86)\\Git\\usr\\bin\\bash.exe',
    ];

    for (const candidate of GIT_BASH_CANDIDATES) {
        try {
            await access(candidate, constants.X_OK);
            return [candidate, '-c'];
        } catch {
            // Try next location.
        }
    }

    // TODO: Añadir soporte para WSL cuando la capa de ejecución de procesos sea más flexible.
    // Ejemplo:
    // return ['wsl', 'bash', '-c'];

    throw new Error(
        [
            'No Bash-compatible shell was found.',
            '',
            'WhalinCode executes Bash commands because current AI coding models generate Bash by default.',
            '',
            'On Windows, install one of the following:',
            '  • Git for Windows (recommended): https://git-scm.com/download/win',
            '  • Windows Subsystem for Linux (WSL): https://learn.microsoft.com/windows/wsl/install',
        ].join('\n'),
    );
}

const decoder = new TextDecoder();

export interface ReadLimitedStreamResult {
    text: string;
    truncated: boolean;
}

export async function readLimitedStream(
    stream: ReadableStream<Uint8Array>,
    maxBytes: number,
): Promise<ReadLimitedStreamResult> {
    const reader = stream.getReader();

    const chunks: Uint8Array[] = [];
    let totalBytes = 0;
    let truncated = false;

    try {
        while (true) {
            const { done, value } = await reader.read();

            if (done) {
                break;
            }

            if (!value) {
                continue;
            }

            const remaining = maxBytes - totalBytes;

            if (remaining <= 0) {
                truncated = true;
                await reader.cancel();
                break;
            }

            if (value.byteLength <= remaining) {
                chunks.push(value);
                totalBytes += value.byteLength;
                continue;
            }

            chunks.push(value.subarray(0, remaining));
            totalBytes += remaining;
            truncated = true;

            await reader.cancel();
            break;
        }
    } finally {
        reader.releaseLock();
    }

    const buffer = new Uint8Array(totalBytes);

    let offset = 0;

    for (const chunk of chunks) {
        buffer.set(chunk, offset);
        offset += chunk.byteLength;
    }

    return {
        text: decoder.decode(buffer),
        truncated,
    };
}
function truncate(value: string, limit: number) {
    return value.length > limit
        ? `${value.slice(0, limit)}\n... (truncated, ${value.length} totalchars)`
        : value;
}

export async function executeLocalTool(toolName: string, input: unknown, mode: ModeType) {
    if (mode === Mode.PLAN && !readOnlyToolNames.includes(toolName as never)) {
        throw new Error(`Tool ${toolName} is not available in PLAN mode`);
    }

    switch (toolName) {
        case 'readFile': {
            const { path, startLine, endLine } = toolInputSchemas.readFile.parse(input);
            const { resolved } = await resolveInsideCwd(path);
            const info = await stat(resolved);

            if (!info.isFile()) {
                throw new Error('Path is not a file.');
            }

            if (!startLine && !endLine && info.size > MAX_FILE_SIZE) {
                throw new Error(
                    `File is ${info.size} bytes, which exceeds the ${MAX_FILE_SIZE} byte limit.  Request a line range with startLine and endLine.`,
                );
            }

            if (info.size > MAX_RANGE_FILE_SIZE) {
                throw new Error(
                    `File is ${info.size} bytes, which exceeds the ${MAX_RANGE_FILE_SIZE} byte limit.  Request a smaller line range with startLine and endLine.`,
                );
            }
            const content = await readFile(resolved, 'utf-8');

            const lines = content.split('\n');

            const selectedContent =
                startLine || endLine
                    ? lines.slice((startLine ?? 1) - 1, endLine ?? lines.length).join('\n')
                    : content;
            return {
                content: selectedContent,
                totalLines: lines.length,
                ...(startLine || endLine
                    ? {
                          range: {
                              startLine: startLine ?? 1,
                              endLine: endLine ?? lines.length,
                          },
                      }
                    : {}),
            };
        }
        case 'listDirectory': {
            const { path } = toolInputSchemas.listDirectory.parse(input);
            const { cwd, resolved } = await resolveInsideCwd(path);
            const entries = await readdir(resolved, { withFileTypes: true });
            const results: { name: string; type: 'file' | 'directory' }[] = [];

            for (const entry of entries) {
                if (entry.name.startsWith('.') || DEFAULT_IGNORED_DIRECTORY_NAMES.has(entry.name))
                    continue;
                results.push({
                    name: entry.name,
                    type: entry.isDirectory() ? 'directory' : 'file',
                });
            }

            results.sort((a, b) =>
                a.type !== b.type
                    ? a.type === 'directory'
                        ? -1
                        : 1
                    : a.name.localeCompare(b.name),
            );

            return { path: relative(cwd, resolved) || '.', entries: results };
        }
        case 'glob': {
            const { pattern, path } = toolInputSchemas.glob.parse(input);
            const { cwd, resolved } = await resolveInsideCwd(path);

            const matches = await fg(pattern, {
                cwd: resolved,
                onlyFiles: true,
                dot: true,
                ignore: DEFAULT_IGNORED_GLOBS,
            });

            const files = matches
                .slice(0, MAX_RESULTS)
                .map((match) => relative(cwd, resolve(resolved, match)))
                .sort();
            return { files, ...(matches.length > MAX_RESULTS ? { truncated: true } : {}) };
        }
        case 'grep': {
            const { path, pattern, include, contextLines } = toolInputSchemas.grep.parse(input);
            const { cwd, resolved } = await resolveInsideCwd(path);

            const analysis = await check(pattern, '');

            if (analysis.status !== 'safe') {
                throw new Error(
                    `Regular expression failed safety validation (${analysis.status}).`,
                );
            }

            let regex: RegExp;

            try {
                regex = new RegExp(pattern);
            } catch {
                throw new Error(`Invalid regular expression: ${pattern}`);
            }

            const files = await fg(include ?? '**/*', {
                cwd: resolved,
                onlyFiles: true,
                dot: true,
                ignore: DEFAULT_IGNORED_GLOBS,
            });

            const matches: {
                file: string;
                line: number;
                content: string;
                range?: { startLine: number; endLine: number };
                context?: string;
            }[] = [];

            let truncated = false;
            const deadline = Date.now() + MAX_GREP_DURATION_MS;

            for (const file of files) {
                if (Date.now() > deadline) {
                    truncated = true;
                    break;
                }

                if (BINARY_EXTENSIONS.has(extname(file))) {
                    continue;
                }

                const absolutePath = resolve(resolved, file);

                try {
                    if ((await stat(absolutePath)).size > MAX_GREP_FILE_SIZE) continue;
                } catch {
                    continue;
                }

                let content: string;

                try {
                    content = await readFile(absolutePath, 'utf-8');
                } catch {
                    // Ignorar archivos inaccesibles, enlaces rotos, etc.
                    continue;
                }

                const lines = content.split(/\r?\n/);

                for (let i = 0; i < lines.length; i++) {
                    if (!regex.test(lines[i]!)) {
                        continue;
                    }

                    const lineNumber = i + 1;
                    const startLine = Math.max(1, lineNumber - contextLines);
                    const endLine = Math.min(lines.length, lineNumber + contextLines);

                    matches.push({
                        file: relative(cwd, absolutePath),
                        line: lineNumber,
                        content: lines[i]!,
                        ...(contextLines > 0
                            ? {
                                  range: {
                                      startLine,
                                      endLine,
                                  },
                                  context: lines.slice(startLine - 1, endLine).join('\n'),
                              }
                            : {}),
                    });

                    if (matches.length >= MAX_MATCHES) {
                        truncated = true;
                        break;
                    }
                }
                if (truncated) {
                    break;
                }
            }
            return {
                matches,
                ...(matches.length === 0
                    ? {
                          message: 'No matches found.',
                      }
                    : {}),
                filesScanned: files.length,
                ...(truncated
                    ? {
                          truncated: true,
                          maxMatches: MAX_MATCHES,
                      }
                    : {}),
            };
        }
        case 'writeFile': {
            const { path, content } = toolInputSchemas.writeFile.parse(input);
            const { cwd, resolved } = await resolveInsideCwd(path);

            await mkdir(dirname(resolved), { recursive: true });
            await writeFile(resolved, content, 'utf-8');

            return {
                success: true as const,
                path: relative(cwd, resolved),
                bytesWritten: Buffer.byteLength(content, 'utf-8'),
            };
        }
        case 'editFile': {
            const { path, oldString, newString } = toolInputSchemas.editFile.parse(input);
            const { cwd, resolved } = await resolveInsideCwd(path);
            const content = await readFile(resolved, 'utf-8');
            const occurrences = content.split(oldString).length - 1;

            if (occurrences === 0) throw new Error('oldString not foun in file');
            if (occurrences > 1)
                throw new Error(`oldString is ambiguous; found ${occurrences} matches`);

            await writeFile(
                resolved,
                content.replace(oldString, () => newString),
                'utf-8',
            );
            return { success: true as const, path: relative(cwd, resolved) };
        }
        case 'bash': {
            const { command, timeout = DEFAULT_TIMEOUT } = toolInputSchemas.bash.parse(input);

            const shell = await getShell();

            const proc = Bun.spawn([...shell, command], {
                cwd: (await resolveInsideCwd('.')).resolved,
                stdout: 'pipe',
                stderr: 'pipe',
                env: { ...process.env, TERM: 'dumb' },
            });

            const timer = setTimeout(() => {
                proc.kill();

                setTimeout(() => {
                    if (!proc.killed) {
                        proc.kill('SIGKILL');
                    }
                }, 1000);
            }, timeout);

            try {
                const [stdout, stderr] = await Promise.all([
                    readLimitedStream(proc.stdout, MAX_OUTPUT),
                    readLimitedStream(proc.stderr, MAX_OUTPUT),
                ]);

                const exitCode = await proc.exited;

                return {
                    stdout: stdout.text,
                    stderr: stderr.text,
                    truncated: {
                        stdout: stdout.truncated,
                        stderr: stderr.truncated,
                    },
                    exitCode,
                };
            } catch (error) {
                if (!proc.killed) {
                    proc.kill();
                }
                throw error;
            } finally {
                clearTimeout(timer);
            }
        }
        default:
            throw new Error(`Unknown tool: ${toolName}`);
    }
}
