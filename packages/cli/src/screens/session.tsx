import { useState, useEffect, useMemo } from "react";
import { useParams, useLocation, useNavigate } from "react-router";
import { number, z } from "zod";
import type { InferResponseType } from "hono/client";

import { SessionShell } from "../components/session-shell";
import {
    UserMessage,
    BotMessage,
    ErrorMessage,
} from "../components/messages";
import { useToast } from "../providers/toast";
import { apiClient } from "../lib/api-client";
import { getErrorMessage } from "../lib/http-errors";
import { getDataPaths } from "@opentui/core";

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

function ChatMessage(
    { msg }: { msg: SessionData["messages"][number] }
) {
    if (msg.role === 'USER') {
        return <UserMessage message={msg.content} />
    };
    if (msg.role === 'ERROR') {
        return <ErrorMessage message={msg.content} />
    };

    return <BotMessage content={msg.content} model={msg.model} />
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

    return (
        <SessionShell onSubmit={() => { }} inputDisabled>
            {session.messages.map((msg) => (
                <ChatMessage key={msg.id} msg={msg} />
            ))}
        </SessionShell>
    );
}; 