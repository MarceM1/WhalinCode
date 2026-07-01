import { EmptyBorder } from "../border";
import { Mode } from "@whalincode/database/enums";
import type { ClientMessagePart, ClientToolCallPart } from "../../hooks/use-chat";
import { useTheme } from "../../providers/theme";
import { TextAttributes } from "@opentui/core";

type Props = {
    parts: ClientMessagePart[]
    model: string;
    mode: Mode;
    duration?: string;
    streaming?: boolean;
    interrupted?: boolean;
};

function formatToolName(name: string): string {
    return name
        .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
        .replace(/^./, (c) => c.toUpperCase());
};

function formatToolArgs(tc: ClientToolCallPart): string {
    return Object.values(tc.args).map(String).join(' ');
};

type PartGroup = {
    type: ClientMessagePart['type'];
    parts: ClientMessagePart[];
    key: string;
};

// Esta funcion es más cosmética que funcional. Se ve mucho mejor que, por ejemplo, todas las partes que correspondan a thinking
// se agrupen bajo un solo thinking en la ui, a que cada una de ellas corresponda a un "paso" de la construcción del plan
function groupConsecutiveParts(parts: ClientMessagePart[]): PartGroup[] {
    const groups: PartGroup[] = [];
    for (let i = 0; i < parts.length; i++) {
        const part = parts[i]!;
        const lastGroup = groups[groups.length - 1];

        if (lastGroup && lastGroup.type === part.type) {
            lastGroup.parts.push(part);
        } else {
            const key = part.type === 'tool-call' ? `group-tc-${part.id}` : `group-${part.type}-${i}`;
            
            groups.push({
                type: part.type,
                parts: [part],
                key: key
            });
        };
    };

    return groups;
};
export function BotMessage({
    parts,
    model,
    mode,
    duration,
    streaming = false,
    interrupted = false
}: Props) {

    const { colors } = useTheme();
    

    return (
        <box width="100%" alignItems="center">
            {groupConsecutiveParts(parts).map((group) => (
                <box
                    key={group.key}
                    paddingY={1}
                    width= '100%'
                >
                    {group.parts.map((part, j) => {
                        if (part.type === 'reasoning'){
                            return (
                                <box
                                    key={`reasoning-${j}`}
                                    border={["left"]}
                                    borderColor={colors.thinkingBorder}
                                    customBorderChars={{
                                        ...EmptyBorder,
                                        vertical: "┃",
                                        bottomLeft: "┗",
                                    }}
                                    width='100%'
                                    paddingX={2}
                                >
                                    <text attributes={TextAttributes.DIM}>
                                        <em fg={colors.thinking}>Thinking:</em> {part.text}
                                    </text>
                                </box>
                            );
                        };

                        if (part.type === 'tool-call') {
                             return (
                                <box
                                    key={part.id}
                                    border={["left"]}
                                    borderColor={colors.thinkingBorder}
                                    customBorderChars={{
                                        ...EmptyBorder,
                                        vertical: "┃",
                                        bottomLeft: "┗",
                                    }}
                                    width='100%'
                                    paddingX={2}
                                >
                                    <text attributes={TextAttributes.DIM}>
                                        <em fg={colors.info}>{formatToolName(part.name)}</em>
                                        {formatToolArgs(part)}
                                        {part.status === 'calling' ? '...' : ''}
                                    </text>
                                </box>
                            );
                        };

                        if (part.type === 'text') {
                            return (
                                <box
                                    key={`text-${j}`}
                                    width='100%'
                                    paddingX={3}
                                >
                                    <text>{part.text}</text>
                                </box>
                            );
                        };
                    })}
                </box>
            ))}
            <box paddingX={3} paddingBottom={1} gap={1} width="100%">
                <box flexDirection="row" gap={2}>
                    <text
                        attributes={interrupted ? TextAttributes.DIM : 0}
                        fg={interrupted
                            ? undefined
                            : mode === Mode.PLAN
                                ? colors.planMode
                                : colors.primary}
                    >
                        ◉
                    </text>
                    <box flexDirection='row' gap={1}>
                        <text attributes={interrupted ? TextAttributes.DIM : 0}>
                            {mode === Mode.PLAN ? 'Plan' : 'Build'}
                        </text>
                        <text attributes={TextAttributes.DIM} fg={colors.dimSeparator}>
                            &gt;
                        </text>
                        <text attributes={TextAttributes.DIM}>
                            {model}
                        </text>
                        {(duration || interrupted) && (
                            <>
                                <text attributes={TextAttributes.DIM} fg={colors.dimSeparator}>
                                    &gt;
                                </text>
                                <text attributes={TextAttributes.DIM}>
                                    {interrupted ? 'Interrupted' : duration}
                                </text>
                            </>
                        )}
                    </box>
                </box>
            </box>
        </box>
    );
}