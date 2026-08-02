import type { DialogContextValue } from '../../providers/dialog';
import type { ToastContextValue } from '../../providers/toast';
import type { ModeType, SupportedChatModelId } from '@whalincode/shared';

export type CommandContext = {
    exit: () => void;

    /** navigation capability */
    navigate: (path: string) => void;

    /** UI feedback system */
    toast: ToastContextValue;

    /** modal/dialog system */
    dialog: DialogContextValue;

    /** prompt config system */
    mode: ModeType;
    setMode: (mode: ModeType) => void;
    setModel: (model: SupportedChatModelId) => void;
};
export type Command = {
    name: string;
    description: string;
    value: string;
    action?: (ctx: CommandContext) => void | Promise<void>;
};
