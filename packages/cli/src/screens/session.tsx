import { useState, useEffect, useMemo } from "react";
import { useParams, useLocation, useNavigate } from "react-router";
import { z } from "zod";
import { useKeyboard } from "@opentui/react";
import prettyMs from "pretty-ms";
import { DEFAULT_CHAT_MODEL_ID, type SupportedChatModelId } from "@whalincode/shared";
import type { InferResponseType } from "hono/client";

import { SessionShell } from "../components/session-shell";
import {
    UserMessage,
    BotMessage,
    ErrorMessage,
} from "../components/messages";
import { useToast } from "../providers/toast";
import { useChat } from "../hooks/use-chat";
import type { Message, ClientMessagePart } from '../hooks/use-chat'
import { apiClient } from "../lib/api-client";
import { getErrorMessage } from "../lib/http-errors";
import { MessageStatus } from "@whalincode/database/enums";
import { useKeyboardLayer } from "../providers/keyboard-layer";

// Inferimos el tipo directamente desde el endpoint Hono.
//
// Esto evita mantener tipos duplicados entre cliente y servidor.
// Si cambia la respuesta del endpoint, el tipo se actualiza automáticamente.
type SessionData = InferResponseType<(typeof apiClient.sessions)[":id"]["$get"], 200>;

const sessionLocationSchema = z.object({
    // Valida el estado recibido durante la navegación.
    //
    // Permite recuperar una sesión prefetchada con tipado seguro
    // sin depender de casts manuales.
    session: z.custom<SessionData>((data) => data != null && typeof data === "object" && "id" in data)
});

function mapDbMessages(dbMessages: SessionData['messages']): Message[] {
    return dbMessages.map((msg): Message => {
        if (msg.role === 'ERROR') {
            return {
                id: msg.id,
                role: 'error',
                content: msg.content
            };
        };

        if (msg.role === 'USER') {
            return {
                id: msg.id,
                role: 'user',
                content: msg.content,
                mode: msg.mode,
                model: msg.model as SupportedChatModelId
            };
        };

        return {
            id: msg.id,
            role: 'assistant',
            content: msg.content,
            mode: msg.mode,
            model: msg.model as SupportedChatModelId,
            parts: [{ type: 'text', text: msg.content }],
            ...(msg.duration != null ? { duration: prettyMs(msg.duration * 1000) } : {}),
            interrupted: msg.status === MessageStatus.INTERRUPTED,
        };
    })
}

function ChatMessage(
    { msg }: { msg: Message }
) {
    if (msg.role === 'user') {
        return <UserMessage message={msg.content} />
    };
    if (msg.role === 'error') {
        return <ErrorMessage message={msg.content} />
    };

    return (
        <BotMessage
            parts={msg.parts}
            model={msg.model}
            mode={msg.mode}
            duration={msg.duration}
            streaming={false}
            interrupted={msg.interrupted}
        />
    )
}

function SessionChat({ session }: { session: SessionData }) {
    const [initialMessages] = useState(() => mapDbMessages(session.messages));
    const { isTopLayer } = useKeyboardLayer();
    const { messages, streaming, submit, abort, interrupt } = useChat(session.id, initialMessages)

    // Detiene los replys pendientes cuando el usuario deja la sesión
    useEffect(() => {
        return () => abort();
    }, [abort]);

    // Deja al usuario cancelar el reply solo antes de que el primer streamed chunck arrive.
    useKeyboard((key) => {
        if (key.name === 'escape' && isTopLayer('base') && streaming.status === 'streaming') {
            key.preventDefault();
            interrupt();
        }
    })

    return (
        <SessionShell
            onSubmit={(text) =>
                submit({
                    userText: text,
                    mode: 'BUILD',
                    model: DEFAULT_CHAT_MODEL_ID
                })
            }
            loading={streaming.status === 'streaming'}
            interruptible={streaming.status === 'streaming'}
        >
            {messages.map((msg) => (
                <ChatMessage key={msg.id} msg={msg} />
            ))}
            {streaming.status === 'streaming' && streaming.parts.length > 0 && (
                <BotMessage
                    parts={streaming.parts}
                    model={streaming.model}
                    mode={streaming.mode}
                    streaming
                />
            )}
        </SessionShell>
    )

};

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
        return parsed.success ? parsed.data.session : null;
    }, [location.state]);

    const [session, setSession] = useState<SessionData | null>(prefetched);

    useEffect(() => {
        if (prefetched) return;
        // Si ya existe una sesión prefetchada evitamos una carga
        // innecesaria y mostramos contenido instantáneamente.
        setSession(null);

        if (!id) return;

        let ignore = false;
        const fetchSession = async () => {
            try {
                const res = await apiClient.sessions[":id"].$get({
                    param: { id }
                });

                if (ignore) return;
                if (!res.ok) throw new Error(await getErrorMessage(res));

                const resolved = await res.json()
                setSession(resolved);

            } catch (error) {
                if (ignore) return;
                toast.show({
                    variant: "error",
                    message: error instanceof Error ? error.message : "Failed to load session",
                });
                navigate('/', { replace: true });
            };
        };

        fetchSession();

        return () => {
            ignore = true;
        };
    }, [id, prefetched, toast, navigate]);

    if (!session) {
        return (
            <SessionShell onSubmit={() => { }} inputDisabled loading />
        );
    };

    return <SessionChat key={session.id} session={session} />
}; 