import { z } from 'zod';
import { tool } from 'ai';

const TIMEOUT_MILLISECONDS = 600_000;

export const Mode = {
    BUILD: 'BUILD',
    PLAN: 'PLAN',
} as const;

export const modeSchema = z.enum([Mode.BUILD, Mode.PLAN]);

export type ModeType = (typeof Mode)[keyof typeof Mode];

export const toolInputSchemas = {
    readFile: z
        .object({
            path: z.string().describe('Relative path to the file to read'),
            startLine: z
                .number()
                .int()
                .positive()
                .optional()
                .describe('Optional starting line number (1-indexed) to read from'),
            endLine: z
                .number()
                .int()
                .positive()
                .optional()
                .describe('Optional ending line number (inclusive, 1-indexed) to read until'),
        })
        .refine(({ startLine, endLine }) => !startLine || !endLine || endLine >= startLine, {
            message: 'endLine must be greater than or equal to startLine',
        }),
    listDirectory: z.object({
        path: z.string().default('.').describe('Relative directory path to list'),
    }),
    glob: z.object({
        pattern: z.string().describe('Glob pattern to match files'),
        path: z.string().default('.').describe('Directory to search from'),
    }),
    grep: z.object({
        pattern: z.string().describe('Regex pattern to search for'),
        path: z.string().default('.').describe('Directory to search from'),
        include: z.string().optional().describe('Optional glob for files to include'),
        contextLines: z
            .number()
            .int()
            .nonnegative()
            .default(0)
            .describe('Number of lines to include before and after each match'),
    }),
    writeFile: z.object({
        path: z.string().describe('Relative path to write'),
        content: z.string().describe('File contents'),
    }),
    editFile: z.object({
        path: z.string().describe('Relative path to edit'),
        oldString: z.string().describe('Exact text to replace; must be unique'),
        newString: z.string().describe('Replacement text'),
    }),
    bash: z.object({
        command: z.string().describe('Shell command to run'),
        description: z.string().optional().describe('Short description of the command'),
        timeout: z
            .number()
            .int()
            .positive()
            .max(TIMEOUT_MILLISECONDS)
            .optional()
            .describe('Timeout in milliseconds'),
    }),
} as const;

export const toolOutputSchemas = {
    readFile: z.object({
        content: z.string().describe('Contents of the file'),
        totalLines: z.number().int().nonnegative().describe('Total number of lines in the file'),
        range: z
            .object({
                startLine: z.number().int().positive().describe('Starting line number (1-indexed)'),
                endLine: z
                    .number()
                    .int()
                    .positive()
                    .describe('Ending line number (inclusive, 1-indexed)'),
            })
            .optional(),
    }),
    listDirectory: z.object({
        path: z.string().describe('Directory path that was listed'),
        entries: z
            .array(
                z.object({
                    name: z.string().describe('Name of the entry'),
                    type: z.enum(['file', 'directory']).describe('Type of the entry'),
                }),
            )
            .describe('List of entries in the directory'),
    }),
    glob: z.object({
        files: z.array(z.string()).describe('List of file paths matching the glob pattern'),
        truncated: z
            .literal(true)
            .optional()
            .describe('Indicates if the result was truncated due to too many matches'),
    }),
    grep: z.object({
        matches: z.array(
            z.object({
                file: z.string(),
                line: z.number().int().positive(),
                content: z.string(),
                range: z
                    .object({
                        startLine: z.number().int().positive(),
                        endLine: z.number().int().positive(),
                    })
                    .optional(),
                context: z.string().optional(),
            }),
        ),
        filesScanned: z.number().int().nonnegative(),
        message: z.string().optional(),
        truncated: z.literal(true).optional(),
        maxMatches: z.number().int().positive().optional(),
    }),
    writeFile: z.object({
        success: z.boolean().describe('Indicates if the file was written successfully'),
        path: z.string().describe('Path of the file that was written'),
        bytesWritten: z
            .number()
            .int()
            .nonnegative()
            .describe('Number of bytes written to the file'),
    }),
    editFile: z.object({
        success: z.boolean().describe('Indicates if the file was edited successfully'),
        path: z.string().describe('Path of the file that was edited'),
    }),
    bash: z.object({
        stdout: z.string().describe('Standard output of the command'),
        stderr: z.string().describe('Standard error output of the command'),
        truncated: z.object({
            stdout: z.boolean().describe('Indicates if stdout was truncated'),
            stderr: z.boolean().describe('Indicates if stderr was truncated'),
        }),
        exitCode: z.number().int().describe('Exit code of the command'),
    }),
} as const;

export const readOnlyToolContracts = {
    readFile: tool({
        description:
            'Read a file from the current projects directory. Supports reading specific line ranges when only part of a file is needed.',
        inputSchema: toolInputSchemas.readFile,
        outputSchema: toolOutputSchemas.readFile,
    }),
    listDirectory: tool({
        description: 'List entries in a directory under the current project directory.',
        inputSchema: toolInputSchemas.listDirectory,
        outputSchema: toolOutputSchemas.listDirectory,
    }),
    glob: tool({
        description: 'Find files matching a glob pattern under the current project directory.',
        inputSchema: toolInputSchemas.glob,
        outputSchema: toolOutputSchemas.glob,
    }),
    grep: tool({
        description:
            'Search file contents with a regular expression under the current project directory.',
        inputSchema: toolInputSchemas.grep,
        outputSchema: toolOutputSchemas.grep,
    }),
} as const;

export const readOnlyToolNames = Object.keys(
    readOnlyToolContracts,
) as (keyof typeof readOnlyToolContracts)[];

export const buildToolContracts = {
    ...readOnlyToolContracts,
    writeFile: tool({
        description: 'Create or overwrite a file under the current project directory.',
        inputSchema: toolInputSchemas.writeFile,
        outputSchema: toolOutputSchemas.writeFile,
    }),
    editFile: tool({
        description: 'Replace exact text in a file under the current project directory.',
        inputSchema: toolInputSchemas.editFile,
        outputSchema: toolOutputSchemas.editFile,
    }),
    bash: tool({
        description: 'Run a shell command in the current project directory.',
        inputSchema: toolInputSchemas.bash,
        outputSchema: toolOutputSchemas.bash,
    }),
} as const;

export type ToolContracts = typeof buildToolContracts;

export function getToolContracts(mode: ModeType) {
    return mode === Mode.PLAN ? readOnlyToolContracts : buildToolContracts;
}
