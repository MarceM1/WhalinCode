import { EmptyBorder } from '../border';
import prettyMs from 'pretty-ms';
import { Mode, type ModeType } from '@whalincode/shared';
import type { Message } from '../../hooks/use-chat';
import { useTheme } from '../../providers/theme';
import { TextAttributes } from '@opentui/core';

type ClientMessagePart = Message['parts'][number];
type ToolPart = Extract<ClientMessagePart, { type: `tool-${string}` | 'dynamic-tool' }>;

type Props = {
    parts: ClientMessagePart[];
    model: string;
    mode: ModeType;
    durationMs?: number;
    streaming?: boolean;
};

function formatToolName(name: string): string {
    return name.replace(/([a-z0-9])([A-Z])/g, '$1 $2').replace(/^./, (c) => c.toUpperCase());
}

function isToolPart(part: ClientMessagePart): part is ToolPart {
    return part.type === 'dynamic-tool' || part.type.startsWith('tool-');
}

function formatToolArgs(tc: ToolPart): string {
    if (!('input' in tc) || tc.input == null) return '';
    if (typeof tc.input !== 'object') return String(tc.input);

    return Object.values(tc.input).map(String).join(' ');
}

type PartGroup = {
    type: ClientMessagePart['type'];
    parts: ClientMessagePart[];
    key: string;
};
function isRenderablePart(part: ClientMessagePart): boolean {
    return part.type === 'text' || part.type === 'reasoning' || isToolPart(part);
}

// Esta funcion es más cosmética que funcional. Se ve mucho mejor que, por ejemplo, todas las partes que correspondan a thinking
// se agrupen bajo un solo thinking en la ui, a que cada una de ellas corresponda a un "paso" de la construcción del plan
function groupConsecutiveParts(parts: ClientMessagePart[]): PartGroup[] {
    const groups: PartGroup[] = [];
    const renderable = parts.filter(isRenderablePart);
    for (let i = 0; i < renderable.length; i++) {
        const part = renderable[i]!;
        const lastGroup = groups[groups.length - 1];

        if (lastGroup && lastGroup.type === part.type) {
            lastGroup.parts.push(part);
        } else {
            const key = isToolPart(part)
                ? `group-tc-${part.toolCallId}`
                : `group-${part.type}-${i}`;

            groups.push({
                type: part.type,
                parts: [part],
                key: key,
            });
        }
    }

    return groups;
}
export function BotMessage({ parts, model, mode, durationMs, streaming = false }: Props) {
    const { colors } = useTheme();

    return (
        <box width="100%" alignItems="center">
            {groupConsecutiveParts(parts).map((group, i) => (
                <box key={group.key} width="100%" paddingTop={i === 0 ? 0 : 1}>
                    {group.parts.map((part, j) => {
                        if (part.type === 'reasoning') {
                            return (
                                <box
                                    key={`reasoning-${j}`}
                                    border={['left']}
                                    borderColor={colors.thinkingBorder}
                                    customBorderChars={{
                                        ...EmptyBorder,
                                        vertical: '┃',
                                        bottomLeft: '┗',
                                    }}
                                    width="100%"
                                    paddingX={2}
                                >
                                    <text attributes={TextAttributes.DIM}>
                                        <em fg={colors.thinking}>Thinking:</em> {part.text}
                                    </text>
                                </box>
                            );
                        }

                        if (isToolPart(part)) {
                            const toolName =
                                part.type === 'dynamic-tool'
                                    ? part.toolName
                                    : part.type.slice('tool-'.length);
                            return (
                                <box
                                    key={part.toolCallId}
                                    border={['left']}
                                    borderColor={colors.thinkingBorder}
                                    customBorderChars={{
                                        ...EmptyBorder,
                                        vertical: '┃',
                                        bottomLeft: '┗',
                                    }}
                                    width="100%"
                                    paddingX={2}
                                >
                                    <text attributes={TextAttributes.DIM}>
                                        <em fg={colors.info}>{formatToolName(toolName)}</em>{' '}
                                        {formatToolArgs(part)}
                                        {part.state !== 'output-available' &&
                                        part.state !== 'output-error'
                                            ? '...'
                                            : ''}
                                        {part.state === 'output-error' && (
                                            <em fg={colors.error}>{part.errorText}</em>
                                            // existe la posibilidad de que text andidado en text ocasione error, en ese aso, cambiar por em
                                        )}
                                    </text>
                                </box>
                            );
                        }

                        if (part.type === 'text') {
                            return (
                                <box key={`text-${j}`} width="100%" paddingX={3}>
                                    <text>{part.text}</text>
                                </box>
                            );
                        }
                    })}
                </box>
            ))}
            <box paddingX={3} paddingY={1} gap={1} width="100%">
                <box flexDirection="row" gap={2}>
                    <text fg={mode === Mode.PLAN ? colors.planMode : colors.primary}>◉</text>

                    <box flexDirection="row" gap={1}>
                        <text>{mode === Mode.PLAN ? 'Plan' : 'Build'}</text>
                        <text attributes={TextAttributes.DIM} fg={colors.dimSeparator}>
                            &gt;
                        </text>
                        <text attributes={TextAttributes.DIM}>{model}</text>
                        {durationMs != null && (
                            <>
                                <text attributes={TextAttributes.DIM} fg={colors.dimSeparator}>
                                    &gt;
                                </text>
                                <text attributes={TextAttributes.DIM}>
                                    {prettyMs(durationMs, { secondsDecimalDigits: 1 })}
                                </text>
                            </>
                        )}
                    </box>
                </box>
            </box>
        </box>
    );
}
