import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import {
    convertToModelMessages,
    createUIMessageStreamResponse,
    streamText,
    toUIMessageStream,
    validateUIMessages,
    type InferUITools,
    type LanguageModelUsage,
    type UIMessage,
} from 'ai';
import { db } from '@whalincode/database/client';
import type { Prisma } from '@whalincode/database';
import {
    buildToolContracts,
    getToolContracts,
    modeSchema,
    type ModeType,
    type ToolContracts,
} from '@whalincode/shared';
import { buildSystemPrompt } from '../system-prompt';
import type { AuthenticateEnv } from '../middleware/require-auth';
import { requireCreditsBalance } from '../middleware/require-credits-balance';
import { calculateCreditsForUsage } from '../lib/credits';
import { ingestAiUsage } from '../lib/polar';
import { isSupportedChatModel, resolveChatModel } from '../lib/models';

import * as Sentry from '@sentry/hono/bun';

/**
 * Numero máximo de mensajes acetables desde una unica peticion del cliente.
 *
 *Esto protege contra ataques de fuerza bruta y payloads excesivamente largos.
 * La longitud de la conversación se administra por separado a través del mecanismo de compactación de contexto.
 */
/* 
 TODO: Aplicar un límite al tamaño máximo del cuerpo de la solicitud HTTP (por   ejemplo, entre 1 y 5 MB).
* Limitar únicamente la cantidad de mensajes no es suficiente, ya que un solo
* mensaje puede contener una carga excesivamente grande. Este límite debería
* aplicarse en el servidor HTTP o en el framework antes de procesar el cuerpo
* de la solicitud.
*/
const MAX_INCOMING_MESSAGES = 50;
type ChatMessageMetadata = {
    mode?: ModeType;
    model?: string;
    durationMs?: number;
    usage?: LanguageModelUsage;
};

type WhalincodeUIMessage = UIMessage<ChatMessageMetadata, never, InferUITools<ToolContracts>>;

const submitSchema = z.object({
    id: z.string(),
    messages: z
        .array(
            z.custom<WhalincodeUIMessage>((value) => {
                return (
                    value != null && typeof value === 'object' && 'id' in value && 'parts' in value
                );
            }),
        )
        .min(1)
        .max(MAX_INCOMING_MESSAGES),
    mode: modeSchema,
    model: z.string().refine(isSupportedChatModel, 'Unsupported chat model'),
});

const submitValidator = zValidator('json', submitSchema, (result, c) => {
    if (!result.success) {
        return c.json({ error: 'Invalid request body' }, 400);
    }
});

function hasPendingToolCalls(message: WhalincodeUIMessage) {
    return message.parts.some((part) => {
        if (part.type === 'dynamic-tool' || part.type.startsWith('tool-')) {
            const state = (part as { state?: string }).state;
            return state !== 'output-available' && state !== 'output-error';
        }
        return false;
    });
}

const app = new Hono<AuthenticateEnv>().post(
    '/',
    requireCreditsBalance,
    submitValidator,
    async (c) => {
        const userId = c.get('userId');
        const { id, messages, mode, model } = c.req.valid('json');

        const session = await db.session.findUnique({
            where: { id, userId },
        });

        if (!session) {
            return c.json({ error: 'Session not found' }, 404);
        }

        const startTime = Date.now();

        // TODO: Reforzar la sincronización de mensajes entre el cliente y el servidor.
        // La estrategia actual de fusión confía en los mensajes entrantes únicamente por su ID.
        // Durante la refactorización del protocolo de mensajes, validar las transiciones
        // de estado permitidas (user, assistant, tool-call, tool-result) y verificar los
        // resultados de las herramientas contra el outputSchema de cada una antes de fusionarlos.
        const tools = getToolContracts(mode);
        const resolvedModel = resolveChatModel(model);
        const previousMessages = Array.isArray(session.messages)
            ? (session.messages as unknown as WhalincodeUIMessage[])
            : [];
        const mergedMessages = [...previousMessages];

        for (const message of messages) {
            const incomingMessage = {
                ...message,
                metadata: {
                    ...message.metadata,
                    mode,
                    model,
                },
            } satisfies WhalincodeUIMessage;

            const existingMessageIndex = mergedMessages.findIndex(
                (m) => m.id === incomingMessage.id,
            );

            if (existingMessageIndex === -1) {
                mergedMessages.push(incomingMessage);
            } else {
                mergedMessages[existingMessageIndex] = incomingMessage;
            }
        }

        let nextMessages: WhalincodeUIMessage[];
        try {
            nextMessages = await validateUIMessages<WhalincodeUIMessage>({
                messages: mergedMessages,
                tools,
            });
        } catch {
            return c.json({ error: 'Invalid message history' }, 400);
        }

        const modelMessages = await convertToModelMessages(nextMessages, { tools }); // evaluar type<WhalincodeUIMessage>
        let completedUsage: LanguageModelUsage | null = null;
        const result = streamText({
            model: resolvedModel.model,
            instructions: buildSystemPrompt({ mode }), // 'system' deprecated
            messages: modelMessages,
            tools,
            providerOptions: resolvedModel.providerOptions,
            abortSignal: c.req.raw.signal,
            onFinish: (e) => {
                completedUsage = e.usage; // 'totalUsage' deprecated
            },
        });

        return createUIMessageStreamResponse({
            stream: toUIMessageStream({
                stream: result.stream,
                originalMessages: nextMessages,
                tools,
                messageMetadata({ part }) {
                    if (part.type === 'start') {
                        return { mode, model };
                    }
                    if (part.type !== 'finish') return undefined;

                    return {
                        mode,
                        model,
                        durationMs: Date.now() - startTime,
                        ...(completedUsage ? { usage: completedUsage } : {}),
                    };
                },
                async onFinish(event) {
                    if (event.isAborted) return;

                    if (hasPendingToolCalls(event.responseMessage)) return;

                    try {
                        await db.session.update({
                            where: { id, userId },
                            data: {
                                messages: event.messages as unknown as Prisma.InputJsonValue,
                            },
                        });
                    } catch (error) {
                        Sentry.captureException(error, {
                            tags: { route: 'chat' },
                            extra: { sessionId: id },
                        });
                    }

                    if (!completedUsage) return;

                    try {
                        const billableUsage = calculateCreditsForUsage({
                            provider: resolvedModel.provider,
                            model: resolvedModel.modelId,
                            usage: completedUsage,
                        });

                        await ingestAiUsage({
                            externalCustomerId: userId,
                            eventId: event.responseMessage.id,
                            credits: billableUsage.credits,
                        });
                    } catch (error) {
                        console.error('Failed to ingest Polar AI usage for the chat message', {
                            error,
                            sessionId: id,
                            messageId: event.responseMessage.id,
                            userId,
                        });
                        Sentry.logger.error(
                            'Failed to ingest Polar AI usage for the chat message',
                            {
                                sessionId: id,
                                messageId: event.responseMessage.id,
                                userId,
                            },
                        );
                    }
                },
                onError(error) {
                    Sentry.captureException(error, {
                        tags: { route: 'chat' },
                        extra: { sessionId: id },
                    });
                    return 'The assistant failed to complete the response.';
                },
            }),
        });
    },
);

export default app;
