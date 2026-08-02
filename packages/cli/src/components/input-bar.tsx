import { readdir } from 'node:fs/promises';
import { resolve, relative, isAbsolute } from 'node:path';

import { useRef, useCallback, useEffect, useState, type RefObject } from 'react';

import { TextAttributes } from '@opentui/core';
import type { TextareaRenderable, ScrollBoxRenderable } from '@opentui/core';
import type { KeyBinding } from '@opentui/core';
import { useKeyboard, useRenderer } from '@opentui/react';

import { EmptyBorder } from './border';
import { Statusbar } from './status-bar';
import { CommandMenu } from './command-menu';
import type { Command } from './command-menu/types';
import { useCommandMenu } from './command-menu/use-command-menu';

import { useToast } from '../providers/toast';
import { useKeyboardLayer } from '../providers/keyboard-layer';
import { useDialog } from '../providers/dialog';
import { useTheme } from '../providers/theme';
import { usePromptConfig } from '../providers/prompt-config';

import { useNavigate } from 'react-router';

import { Mode } from '@whalincode/shared';

/**
 * ----------------------------------------------------------------------------------------------------
 * Constants
 * ----------------------------------------------------------------------------------------------------
 *
 * Shared constants used by the mention system and InputBar.
 */
const MAX_VISIBLE_OPTIONS = 8;
const CURRENT_DIRECTORY = process.cwd();
const MAX_FALLBACK_MENTION_CANDIDATES = 32;
const MENTION_QUERY_CHARACTER = /[A-Za-z0-9._/-]/;
const RECURSIVE_MENTION_IGNORED_DIRECTORIES = new Set([
    'node_modules',
    '.git',
    'dist',
    'build',
    'out',
    'public',
    'assets',
]);
/**
 * Directories skipped during recursive mention fallback.
 *
 * TODO:
 * Consider expanding this list with:
 * - .git
 * - .whalicode
 * - dist
 * - build
 * - out
 * - public
 * - assets
 */

/**
 * ----------------------------------------------------------------------------------------------------
 * Types
 * ----------------------------------------------------------------------------------------------------
 *
 * Domain types for mention parsing and completion
 */
type MentionMatch = {
    start: number;
    end: number;
    query: string;
};

type MentionCandidate = {
    path: string;
    kind: 'file' | 'directory';
};

type FileMentionMenuProps = {
    candidates: MentionCandidate[];
    selectedIndex: number;
    scrollRef: RefObject<ScrollBoxRenderable | null>;
    onSelect: (index: number) => void;
    onExecute: (index: number) => void;
};

type Props = {
    onSubmit: (text: string) => void;
    disabled?: boolean;
};

/**
 * -----------------------------------------------------------------------------------------------------
 * Filesystem
 * -----------------------------------------------------------------------------------------------------
 */
function isWithinCurrentDirectory(targetPath: string): boolean {
    const relativePath = relative(CURRENT_DIRECTORY, targetPath);
    return relativePath === '' || (!relativePath.startsWith('..') && !isAbsolute(relativePath));
}

/**
 * -----------------------------------------------------------------------------------------------------
 * Mention Parsing & Resolution
 * -----------------------------------------------------------------------------------------------------
 *
 * Mention functions
 */
async function getMentionCandidates(query: string): Promise<MentionCandidate[]> {
    const normalizedQuery = query.startsWith('./') ? query.slice(2) : query;
    if (normalizedQuery.startsWith('/')) {
        return [];
    }

    const hasTrailingSlash = normalizedQuery.endsWith('/');
    const lastSlashIndex = hasTrailingSlash
        ? normalizedQuery.length - 1
        : normalizedQuery.lastIndexOf('/');

    const directoryPart = hasTrailingSlash
        ? normalizedQuery.slice(0, -1)
        : lastSlashIndex === -1
          ? ''
          : normalizedQuery.slice(0, lastSlashIndex);

    const namePrefix = hasTrailingSlash ? '' : normalizedQuery.slice(lastSlashIndex + 1);

    const absoluteDirectory = resolve(CURRENT_DIRECTORY, directoryPart || '.');
    if (!isWithinCurrentDirectory(absoluteDirectory)) {
        return [];
    }

    try {
        const entries = await readdir(absoluteDirectory, { withFileTypes: true });
        const lowercasePrefix = namePrefix.toLowerCase();
        const showHiddenEntries = namePrefix.startsWith('.');

        const directMatches = entries
            .filter((entry) => showHiddenEntries || !entry.name.startsWith('.'))
            .filter((entry) => {
                return (
                    lowercasePrefix === '' || entry.name.toLowerCase().startsWith(lowercasePrefix)
                );
            })
            .sort((left, right) => {
                if (left.isDirectory() !== right.isDirectory()) {
                    return left.isDirectory() ? -1 : 1;
                }
                return left.name.localeCompare(right.name);
            })
            .map((entry) => {
                const path = directoryPart ? `${directoryPart}/${entry.name}` : entry.name;
                const kind: MentionCandidate['kind'] = entry.isDirectory() ? 'directory' : 'file';

                return {
                    path: kind === 'directory' ? `${path}/` : path,
                    kind,
                };
            });

        // if (directMatches.length > 0 || directoryPart !== '' || namePrefix !== '') {
        //     return directMatches;
        // }

        if (directMatches.length > 0 || namePrefix === '' || namePrefix.length < 2) {
            return directMatches;
        }

        if (directoryPart !== '') {
            return [];
        }

        const fallbackMatches: MentionCandidate[] = [];
        const visit = async (absoluteDirectory: string, directoryPart: string): Promise<void> => {
            const entries = await readdir(absoluteDirectory, { withFileTypes: true });

            for (const entry of entries) {
                if (!showHiddenEntries && entry.name.startsWith('.')) {
                    continue;
                }

                if (entry.isDirectory() && RECURSIVE_MENTION_IGNORED_DIRECTORIES.has(entry.name)) {
                    continue;
                }

                const path = directoryPart ? `${directoryPart}/${entry.name}` : entry.name;
                const kind: MentionCandidate['kind'] = entry.isDirectory() ? 'directory' : 'file';

                if (entry.name.toLowerCase().startsWith(lowercasePrefix)) {
                    fallbackMatches.push({
                        path: kind === 'directory' ? `${path}/` : path,
                        kind,
                    });
                    if (fallbackMatches.length >= MAX_FALLBACK_MENTION_CANDIDATES) {
                        return;
                    }
                }

                if (entry.isDirectory()) {
                    await visit(resolve(absoluteDirectory, entry.name), path);
                    if (fallbackMatches.length >= MAX_FALLBACK_MENTION_CANDIDATES) {
                        return;
                    }
                }
            }
        };

        await visit(CURRENT_DIRECTORY, '');

        return fallbackMatches.sort((left, right) => left.path.localeCompare(right.path));
    } catch {
        return [];
    }
}

function isMentionQueryCharacter(char: string): boolean {
    return MENTION_QUERY_CHARACTER.test(char);
}

function findActiveMention(text: string, cursorOffset: number): MentionMatch | null {
    const safeOffset = Math.max(0, Math.min(cursorOffset, text.length));

    let start = safeOffset;
    while (start > 0 && !/\s/.test(text[start - 1]!)) {
        start -= 1;
    }

    let end = safeOffset;
    while (end < text.length && !/\s/.test(text[end]!)) {
        end += 1;
    }

    const token = text.slice(start, end);
    const relativeCursor = safeOffset - start;

    const mentionStart = token.lastIndexOf('@', relativeCursor);
    if (mentionStart === -1) return null;

    const previousCharacter = token[mentionStart - 1];
    if (previousCharacter && isMentionQueryCharacter(previousCharacter)) {
        return null;
    }

    let mentionEnd = mentionStart + 1;
    while (mentionEnd < token.length && isMentionQueryCharacter(token[mentionEnd]!)) {
        mentionEnd += 1;
    }

    if (relativeCursor < mentionStart || relativeCursor > mentionEnd) {
        return null;
    }

    return {
        start: start + mentionStart,
        end: start + mentionEnd,
        query: token.slice(mentionStart + 1, mentionEnd),
    };
}

/**
 * -----------------------------------------------------------------------------------------------------
 * Mention UI
 * -----------------------------------------------------------------------------------------------------
 *
 * Mention UI component
 */
function FileMentionMenu({
    candidates,
    selectedIndex,
    scrollRef,
    onSelect,
    onExecute,
}: FileMentionMenuProps) {
    const { colors } = useTheme();
    const visibleHeight = Math.min(candidates.length, MAX_VISIBLE_OPTIONS);

    if (candidates.length === 0) {
        return (
            <box>
                <text attributes={TextAttributes.DIM}>No matching files or directories found.</text>
            </box>
        );
    }

    return (
        <scrollbox ref={scrollRef} height={visibleHeight}>
            {candidates.map((candidate, index) => {
                const isSelected = index === selectedIndex;
                return (
                    <box
                        key={index}
                        flexDirection="row"
                        paddingX={1}
                        height={1}
                        overflow="hidden"
                        backgroundColor={isSelected ? colors.selection : undefined}
                        onMouseOver={() => onSelect(index)}
                        onMouseDown={() => onExecute(index)}
                    >
                        <box flexGrow={1} flexShrink={1} overflow="hidden">
                            <text selectable={false} fg={isSelected ? 'black' : 'white'}>
                                {candidate.path}
                            </text>
                        </box>
                        <box width={8} alignItems="flex-end" flexShrink={1}>
                            <text selectable={false} fg={isSelected ? 'black' : 'gray'}>
                                {candidate.kind === 'directory' ? 'Folder' : 'File'}
                            </text>
                        </box>
                    </box>
                );
            })}
        </scrollbox>
    );
}

/**
 * -----------------------------------------------------------------------------------------------------
 * Key Binding
 * -----------------------------------------------------------------------------------------------------
 *
 */
export const TEXTAREA_KEY_BINDINGS: KeyBinding[] = [
    { name: 'return', action: 'submit' },
    { name: 'enter', action: 'submit' },
    { name: 'return', shift: true, action: 'newline' },
    { name: 'enter', shift: true, action: 'newline' },
];

/**
 * -----------------------------------------------------------------------------------------------------
 * InputBar Component
 * -----------------------------------------------------------------------------------------------------
 *
 * Main prompt input component responsible for:
 * - Managing textarea state.
 * - Coordinating command and mention completion.
 * - Handling keyboard interactions.
 * - Submitting prompts and executing commands.
 */
export function InputBar({ onSubmit, disabled = false }: Props) {
    /**
     * -----------------------------------------------------------------------------
     * Providers & Context
     * -----------------------------------------------------------------------------
     *
     * External services and shared application state used by the InputBar.
     */
    const { mode, toggleMode, setMode, setModel } = usePromptConfig();
    const { colors } = useTheme();
    const { isTopLayer, push, pop, setResponder } = useKeyboardLayer();
    const renderer = useRenderer();
    const toast = useToast();
    const dialog = useDialog();
    const navigate = useNavigate();

    /**
     * -----------------------------------------------------------------------------
     * Refs
     * -----------------------------------------------------------------------------
     *
     * Mutable references used to access renderables and persist transient state
     * without triggering re-renders.
     */
    const textareaRef = useRef<TextareaRenderable | null>(null);
    const onSubmitRef = useRef<() => void>(() => {});
    const activeMentionRef = useRef<MentionMatch | null>(null);
    const mentionScrollRef = useRef<ScrollBoxRenderable>(null); // probar <ScrollBoxRenderable | null>

    /**
     * -----------------------------------------------------------------------------
     * Local State
     * -----------------------------------------------------------------------------
     *
     * React state controlling the current mention session and suggestion list.
     */
    const [activeMention, setActiveMention] = useState<MentionMatch | null>(null);
    const [mentionCandidates, setMentionCandidates] = useState<MentionCandidate[]>([]);
    const [mentionSelectedIndex, setMentionSelectedIndex] = useState(0);

    /**
     * -----------------------------------------------------------------------------
     * Command Menu
     * -----------------------------------------------------------------------------
     *
     * State and actions exposed by the command menu hook.
     */
    const {
        showCommandMenu,
        commandQuery,
        selectedIndex,
        scrollRef,
        handleContentChange,
        resolveCommand,
        setSelectedIndex,
    } = useCommandMenu();

    /**
     * -----------------------------------------------------------------------------
     * Derived State
     * -----------------------------------------------------------------------------
     */
    const showMentionMenu = activeMention !== null;

    /**
     * -----------------------------------------------------------------------------
     * Mention Actions
     * -----------------------------------------------------------------------------
     *
     * Synchronize, update and apply file mention completions.
     */

    const closeMentionMenu = useCallback(() => {
        activeMentionRef.current = null;
        setActiveMention(null);
        setMentionCandidates([]);
        pop('mention');
    }, [pop]);

    const syncMentionMenu = useCallback(
        (text: string, cursorOffset: number) => {
            const nextMention = findActiveMention(text, cursorOffset);
            const prevMention = activeMentionRef.current;
            const mentionChanged =
                prevMention?.start !== nextMention?.start ||
                prevMention?.end !== nextMention?.end ||
                prevMention?.query !== nextMention?.query;

            if (!nextMention) {
                if (prevMention) {
                    closeMentionMenu();
                }
                return;
            }

            activeMentionRef.current = nextMention;

            push('mention', () => {
                closeMentionMenu();
                return true;
            });

            if (mentionChanged) {
                setActiveMention(nextMention);

                setMentionSelectedIndex(0);
                mentionScrollRef.current?.scrollTo(0);
            }
        },
        [closeMentionMenu, push],
    );

    const handleMentionExecute = useCallback(
        (index: number) => {
            const textarea = textareaRef.current;
            const mention = activeMentionRef.current;
            const candidate = mentionCandidates[index];

            if (!textarea || !mention || !candidate) return;

            const insertion = candidate.kind === 'directory' ? candidate.path : `${candidate.path}`;

            const newText = `${textarea.plainText.slice(0, mention.start)}@${insertion}${textarea.plainText.slice(mention.end)}`;

            textarea.replaceText(newText);
            textarea.cursorOffset = mention.start + insertion.length + 1; // Move cursor after the inserted mention

            syncMentionMenu(newText, textarea.cursorOffset);
        },
        [mentionCandidates, syncMentionMenu],
    );

    /**
     * -----------------------------------------------------------------------------
     * Textarea Actions
     * -----------------------------------------------------------------------------
     *
     * Handlers related to editing and submitting the prompt.
     */
    const handleTextareaContentChange = useCallback(() => {
        const textarea = textareaRef.current;
        if (!textarea) return;

        const text = textarea.plainText;

        handleContentChange(text);
        syncMentionMenu(text, textarea.cursorOffset);
    }, [handleContentChange, syncMentionMenu]);

    const handleSubmit = useCallback(() => {
        if (disabled) return;

        const textarea = textareaRef.current;
        if (!textarea) return;

        const text = textarea.plainText.trim();
        if (text.length === 0) return;

        onSubmit(text);
        textarea.setText('');
    }, [disabled, onSubmit]);

    const handleTextareaCursorChange = useCallback(() => {
        const textarea = textareaRef.current;
        if (!textarea) return;

        syncMentionMenu(textarea.plainText, textarea.cursorOffset);
    }, [syncMentionMenu]);

    /**
     * -----------------------------------------------------------------------------
     * Command Actions
     * -----------------------------------------------------------------------------
     *
     * Execute slash commands and dispatch command-specific behavior.
     */
    const handleCommand = useCallback(
        (command: Command | undefined) => {
            const textarea = textareaRef.current;
            if (!textarea || !command) return;

            textarea.setText('');

            if (command.action) {
                command.action({
                    exit: () => renderer.destroy(),
                    toast,
                    dialog,
                    navigate,
                    mode,
                    setMode,
                    setModel,
                });
            } else {
                textarea.insertText(command.value + ' ');
            }
        },
        [renderer, toast, dialog, navigate, mode, setMode, setModel],
    );

    const handleCommandExecute = useCallback(
        (index: number) => {
            const command = resolveCommand(index);
            handleCommand(command);
        },
        [handleCommand, resolveCommand],
    );

    /**
     * -----------------------------------------------------------------------------
     * Effects
     * -----------------------------------------------------------------------------
     *
     * Synchronize asynchronous state and integrate with the underlying textarea.
     */
    // Mantiene el file seleccionado sincronizado con el actual @mention token.
    useEffect(() => {
        if (!activeMention) {
            setMentionCandidates([]);
            return;
        }

        let ignore = false;
        const loadCandidates = async () => {
            const nextCandidates = await getMentionCandidates(activeMention.query);
            if (ignore) return;

            setMentionCandidates(nextCandidates);
            setMentionSelectedIndex((currentIndex) => {
                if (nextCandidates.length === 0) {
                    return 0;
                }
                return Math.min(currentIndex, nextCandidates.length - 1);
            });
        };

        void loadCandidates();

        return () => {
            ignore = true;
        };
    }, [activeMention]);

    // Wire up textarea submit handler once so it always reads the latest state.
    useEffect(() => {
        const textarea = textareaRef.current;
        if (!textarea) return;

        textarea.onSubmit = () => {
            onSubmitRef.current();
        };
    }, []);

    /**
     * -----------------------------------------------------------------------------
     * Submit Dispatcher
     * -----------------------------------------------------------------------------
     *
     * Resolves what should happen when the user submits the prompt depending on
     * the current UI state (commands, mentions or regular prompt submission).
     */
    onSubmitRef.current = () => {
        if (disabled) return;

        if (showCommandMenu) {
            const command = resolveCommand(selectedIndex);
            if (command) {
                handleCommand(command);
                return;
            }
        }

        if (showMentionMenu) {
            const candidate = mentionCandidates[mentionSelectedIndex];
            if (candidate) {
                handleMentionExecute(mentionSelectedIndex);
                return;
            }
        }

        handleSubmit();
    };

    /**
     * -----------------------------------------------------------------------------
     * Keyboard Bindings
     * -----------------------------------------------------------------------------
     *
     * Register keyboard shortcuts for the different interaction layers.
     */
    useKeyboard((key) => {
        if (disabled) return;
        if (!isTopLayer('base')) return;
        if (key.name === 'tab') {
            key.preventDefault();
            toggleMode();
        }
    });

    // Register the base layer responder for ctrl+c dismissal of the command menu.
    useEffect(() => {
        setResponder('base', () => {
            if (disabled) return false;

            const textarea = textareaRef.current;
            if (!textarea) return false;

            if (textarea && textarea.plainText.length > 0) {
                textarea.setText('');
                return true;
            }
            return false;
        });

        return () => {
            setResponder('base', null);
        };
    }, [disabled, setResponder]);

    useKeyboard((key) => {
        if (disabled) return;
        if (!showMentionMenu || !isTopLayer('mention')) return;

        if (key.name === 'escape') {
            key.preventDefault();
            closeMentionMenu();
        } else if (key.name === 'up') {
            key.preventDefault();
            setMentionSelectedIndex((currentIndex) => {
                const nextIndex = Math.max(0, currentIndex - 1);
                const scrollBox = mentionScrollRef.current;
                if (scrollBox && nextIndex < scrollBox.scrollTop) {
                    scrollBox.scrollTo(nextIndex);
                }
                return nextIndex;
            });
        } else if (key.name === 'down') {
            key.preventDefault();
            setMentionSelectedIndex((currentIndex) => {
                if (mentionCandidates.length === 0) return 0;

                const nextIndex = Math.min(mentionCandidates.length - 1, currentIndex + 1);
                const scrollBox = mentionScrollRef.current;

                if (scrollBox) {
                    const viewportHeight = scrollBox.viewport.height;
                    const visibleEnd = scrollBox.scrollTop + viewportHeight - 1;
                    if (nextIndex > visibleEnd) {
                        scrollBox.scrollTo(nextIndex - viewportHeight + 1);
                    }
                }

                return nextIndex;
            });
        } else if (key.name === 'right') {
            key.preventDefault();

            if (mentionCandidates.length === 0) return;

            handleMentionExecute(mentionSelectedIndex);
        }
    });

    /**
     * -----------------------------------------------------------------------------
     * Render
     * -----------------------------------------------------------------------------
     */
    return (
        <box width="100%" alignItems="center">
            <box
                width="100%"
                border={['left']}
                borderColor={mode === Mode.BUILD ? colors.primary : colors.planMode}
                customBorderChars={{
                    ...EmptyBorder,
                    vertical: '┃',
                    bottomLeft: '┗',
                }}
            >
                <box
                    position="relative"
                    justifyContent="center"
                    paddingX={2}
                    paddingY={1}
                    backgroundColor={colors.surface}
                    width="100%"
                    gap={1}
                >
                    {showCommandMenu && (
                        <box
                            position="absolute"
                            bottom="100%"
                            left={0}
                            width="100%"
                            gap={1}
                            backgroundColor={colors.surface}
                            paddingBottom={1}
                        >
                            <CommandMenu
                                query={commandQuery}
                                selectedIndex={selectedIndex}
                                scrollRef={scrollRef}
                                onSelect={setSelectedIndex}
                                onExecute={handleCommandExecute}
                            />
                        </box>
                    )}
                    {!showCommandMenu && showMentionMenu && (
                        <box
                            position="absolute"
                            bottom="100%"
                            left={0}
                            width="100%"
                            backgroundColor={colors.surface}
                            zIndex={10}
                        >
                            <FileMentionMenu
                                candidates={mentionCandidates}
                                selectedIndex={mentionSelectedIndex}
                                scrollRef={mentionScrollRef}
                                onSelect={setMentionSelectedIndex}
                                onExecute={handleMentionExecute}
                            />
                        </box>
                    )}
                    <textarea
                        ref={textareaRef}
                        focused={
                            !disabled &&
                            (isTopLayer('base') || isTopLayer('command') || isTopLayer('mention'))
                        }
                        keyBindings={TEXTAREA_KEY_BINDINGS}
                        onContentChange={handleTextareaContentChange}
                        placeholder="Describe una tarea, usa @ para referenciar archivos o / para ejecutar comandos..."
                        onCursorChange={handleTextareaCursorChange}
                    />
                    <Statusbar />
                </box>
            </box>
        </box>
    );
}
