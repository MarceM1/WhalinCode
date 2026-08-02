import { constants } from 'fs';
import { mkdir, readFile, readdir, stat, writeFile, access } from 'fs/promises';
import { dirname, isAbsolute, join, relative, resolve, extname } from 'path';
import { toolInputSchemas, Mode, type ModeType } from '@whalincode/shared';
import fg from 'fast-glob';
import { clearTimeout } from 'timers';

const MAX_FILE_SIZE = 10_000;
const MAX_RESULTS = 200;
const MAX_MATCHES = 50;
const MAX_OUTPUT = 20_000;
const DEFAULT_TIMEOUT = 30_000;
const DEFAULT_SEARCH_IGNORE_PATTERNS: string[] = ['**/node_modules/**', '**/.git/**'];

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

function resolveInsideCwd(path: string) {
    const cwd = process.cwd();
    const resolved = resolve(cwd, path);
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

function truncate(value: string, limit: number) {
    return value.length > limit
        ? `${value.slice(0, limit)}\n... (truncated, ${value.length} totalchars)`
        : value;
}

export async function executeLocalTool(toolName: string, input: unknown, mode: ModeType) {
    if (mode === Mode.PLAN && !['readFile', 'listDirectory', 'glob', 'grep'].includes(toolName)) {
        throw new Error(`Tool ${toolName} is not available in PLAN mode`);
    }

    switch (toolName) {
        case 'readFile': {
            const { path, startLine, endLine } = toolInputSchemas.readFile.parse(input);
            const { resolved } = resolveInsideCwd(path);
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
            const { cwd, resolved } = resolveInsideCwd(path);
            const entries = await readdir(resolved);
            const results: { name: string; type: 'file' | 'directory' }[] = [];

            for (const entry of entries) {
                if (entry.startsWith('.') || DEFAULT_SEARCH_IGNORE_PATTERNS.includes(entry))
                    continue;
                const info = await stat(join(resolved, entry));
                results.push({ name: entry, type: info.isDirectory() ? 'directory' : 'file' });
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
            const { cwd, resolved } = resolveInsideCwd(path);

            const matches = await fg(pattern, {
                cwd: resolved,
                onlyFiles: true,
                dot: true,
                ignore: DEFAULT_SEARCH_IGNORE_PATTERNS,
            });

            const files = matches
                .slice(0, MAX_RESULTS)
                .map((match) => relative(cwd, resolve(resolved, match)))
                .sort();
            return { files, ...(matches.length > MAX_RESULTS ? { truncated: true } : {}) };
        }
        case 'grep': {
            const { path, pattern, include, contextLines } = toolInputSchemas.grep.parse(input);
            const { cwd, resolved } = resolveInsideCwd(path);

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
                ignore: DEFAULT_SEARCH_IGNORE_PATTERNS,
            });

            const matches: {
                file: string;
                line: number;
                content: string;
                range?: { startLine: number; endLine: number };
            }[] = [];

            let truncated = false;

            for (const file of files) {
                if (BINARY_EXTENSIONS.has(extname(file))) {
                    continue;
                }

                const absolutePath = resolve(resolved, file);

                let content: string;

                try {
                    content = await readFile(absolutePath, 'utf-8');
                } catch {
                    // Ignorar archivos inaccesibles, enlaces rotos, etc.
                    continue;
                }

                const lines = content.split(/\r?\n/);

                for (let i = 0; i < lines.length; i++) {
                    regex.lastIndex = 0;

                    if (!regex.test(lines[i]!)) {
                        continue;
                    }

                    const lineNumber = i + 1;

                    matches.push({
                        file: relative(cwd, absolutePath),
                        line: lineNumber,
                        content: lines[i]!,
                        range: {
                            startLine: Math.max(1, lineNumber - contextLines),
                            endLine: Math.min(lines.length, lineNumber + contextLines),
                        },
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
            if (matches.length === 0) {
                return {
                    matches: [],
                    message: 'No matches found.',
                    filesScanned: files.length,
                };
            }

            return {
                matches,
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
            const { cwd, resolved } = resolveInsideCwd(path);

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
            const { cwd, resolved } = resolveInsideCwd(path);
            const content = await readFile(resolved, 'utf-8');
            const ocurrences = content.split(oldString).length - 1;

            if (ocurrences === 0) throw new Error('oldString not foun in file');
            if (ocurrences > 1)
                throw new Error(`oldString is ambiguous; found ${ocurrences} matches`);

            await writeFile(resolved, content.replace(oldString, newString), 'utf-8');
            return { success: true as const, path: relative(cwd, resolved) };
        }
        case 'bash': {
            const { command, timeout = DEFAULT_TIMEOUT } = toolInputSchemas.bash.parse(input);

            const shell = await getShell();

            const proc = Bun.spawn([...shell, command], {
                cwd: resolveInsideCwd('.').resolved,
                stdout: 'pipe',
                stderr: 'pipe',
                env: { ...process.env, TERM: 'dumb' },
            });

            const timer = setTimeout(() => proc.kill(), timeout);
            const [stdout, stderr] = await Promise.all([
                new Response(proc.stdout).text(),
                new Response(proc.stderr).text(),
            ]);

            const exitCode = await proc.exited;

            clearTimeout(timer);

            return {
                stdout: truncate(stdout, MAX_OUTPUT),
                stderr: truncate(stderr, MAX_OUTPUT),
                exitCode,
            };
        }
        default:
            throw new Error(`Unknown tool: ${toolName}`);
    }
}
