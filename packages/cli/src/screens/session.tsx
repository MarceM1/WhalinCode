import { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router';
import { z } from 'zod';
import { useKeyboard } from '@opentui/react';
import { type ModeType, type SupportedChatModelId } from '@whalincode/shared';
import type { InferResponseType } from 'hono/client';

import { SessionShell } from '../components/session-shell';
import { UserMessage, BotMessage, ErrorMessage } from '../components/messages';
import { useToast } from '../providers/toast';
import { useChat } from '../hooks/use-chat';
import { usePromptConfig } from '../providers/prompt-config';
import type { Message } from '../hooks/use-chat';
import { apiClient } from '../lib/api-client';
import { getErrorMessage } from '../lib/http-errors';
import { useKeyboardLayer } from '../providers/keyboard-layer';

// Inferimos el tipo directamente desde el endpoint Hono.
//
// Esto evita mantener tipos duplicados entre cliente y servidor.
// Si cambia la respuesta del endpoint, el tipo se actualiza automáticamente.
type SessionData = InferResponseType<(typeof apiClient.sessions)[':id']['$get'], 200>;

const initialPromptSchema = z.object({
    message: z.string(),
    mode: z.custom<ModeType>(),
    model: z.custom<SupportedChatModelId>(),
});

const sessionLocationSchema = z.object({
    // Valida el estado recibido durante la navegación.
    //
    // Permite recuperar una sesión prefetchada con tipado seguro
    // sin depender de casts manuales.
    session: z.custom<SessionData>(
        (data) => data != null && typeof data === 'object' && 'id' in data,
    ),
    initialPrompt: initialPromptSchema.optional(),
});

type InitialPrompt = z.infer<typeof initialPromptSchema>;

function ChatMessage({ msg }: { msg: Message }) {
    if (msg.role === 'user') {
        const text = msg.parts
            .filter((p) => p.type === 'text')
            .map((p) => p.text)
            .join('');

        return <UserMessage message={text} mode={msg.metadata?.mode ?? 'BUILD'} />;
    }

    return (
        <BotMessage
            parts={msg.parts}
            model={msg.metadata?.model ?? 'unknown'}
            mode={msg.metadata?.mode ?? 'BUILD'}
            durationMs={msg.metadata?.durationMs}
            streaming={false}
        />
    );
}

function SessionChat({
    session,
    initialPrompt,
}: {
    session: SessionData;
    initialPrompt?: InitialPrompt;
}) {
    const [initialMessages] = useState(() => session.messages as unknown as Message[]);
    const { isTopLayer } = useKeyboardLayer();
    const { messages, status, submit, abort, interrupt, error } = useChat(
        session.id,
        initialMessages,
    );
    const { mode, model } = usePromptConfig();
    const hasSubmittedInitialPromptRef = useRef(false);

    // Detiene los replys pendientes cuando el usuario deja la sesión
    useEffect(() => {
        return () => void abort();
    }, [abort]);

    // Deja al usuario cancelar el reply solo antes de que el primer streamed chunck arrive.
    useKeyboard((key) => {
        if (key.name === 'escape' && isTopLayer('base') && status === 'streaming') {
            key.preventDefault();
            interrupt();
        }
    });

    // Envía el prompt inicial si existe y no se ha enviado aún.
    useEffect(() => {
        if (!initialPrompt || hasSubmittedInitialPromptRef.current) return;
        hasSubmittedInitialPromptRef.current = true;
        void submit({
            userText: initialPrompt.message,
            mode: initialPrompt.mode,
            model: initialPrompt.model,
        });
    }, [initialPrompt, submit]);

    return (
        <SessionShell
            onSubmit={(text) =>
                submit({
                    userText: text,
                    mode,
                    model,
                })
            }
            loading={status === 'submitted' || status === 'streaming'}
            interruptible={status === 'submitted' || status === 'streaming'}
        >
            {messages.map((msg) => (
                <ChatMessage key={msg.id} msg={msg} />
            ))}
            {error && <ErrorMessage message={error.message} />}
        </SessionShell>
    );
}

export function Session() {
    const { id } = useParams<{ id: string }>();
    const location = useLocation();
    const navigate = useNavigate();
    const toast = useToast();

    // Intenta recuperar una sesión previamente cargada desde
    // el estado de navegación.
    //
    // Esto permite mostrar contenido inmediatamente mientras
    // se sincroniza la información real desde la API.
    const prefetched = useMemo(() => {
        const parsed = sessionLocationSchema.safeParse(location.state);
        return parsed.success ? parsed.data : null;
    }, [location.state]);

    const [session, setSession] = useState<SessionData | null>(prefetched?.session ?? null);

    useEffect(() => {
        if (prefetched?.session) return;
        // Si ya existe una sesión prefetchada evitamos una carga
        // innecesaria y mostramos contenido instantáneamente.
        setSession(null);

        if (!id) return;

        let ignore = false;
        const fetchSession = async () => {
            try {
                const res = await apiClient.sessions[':id'].$get({
                    param: { id },
                });

                if (ignore) return;
                if (!res.ok) throw new Error(await getErrorMessage(res));

                const resolved = await res.json();
                setSession(resolved);
            } catch (error) {
                if (ignore) return;
                toast.show({
                    variant: 'error',
                    message: error instanceof Error ? error.message : 'Failed to load session',
                });
                navigate('/', { replace: true });
            }
        };

        fetchSession();

        return () => {
            ignore = true;
        };
    }, [id, prefetched, toast, navigate]);

    if (!session) {
        return <SessionShell onSubmit={() => {}} inputDisabled loading />;
    }

    return (
        <SessionChat key={session.id} session={session} initialPrompt={prefetched?.initialPrompt} />
    );
}
