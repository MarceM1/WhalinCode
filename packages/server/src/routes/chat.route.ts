import { Hono} from 'hono';
import { streamSSE } from 'hono/streaming';
import { zValidator } from '@hono/zod-validator';
import * as Sentry from "@sentry/hono/bun";
import { z } from 'zod';
import { streamText as aiStreamText } from 'ai';
import { db } from "@whalincode/database/client";
import { Mode, MessageStatus } from '@whalincode/database/enums';
import type { Message, Prisma } from '@whalincode/database';
import { 
    type ChatStreamEvent,
    type MessagePart,
    toolCallArgsSchema,
    messagePartsSchema,
 } from '@whalincode/shared';
import { isSupportedChatModel, resolveChatModel } from '../lib/models';

const submitSchema = z.object({
    content: z.string(),
    mode: z.enum(Mode),
    model: z.string().refine(isSupportedChatModel,'Unsupported chat model'),
});

const submitValidator = zValidator('json', submitSchema, (result, c)=>{
   
    if (result.success === false) {
            const issues = result.error.issues.length;
    
            Sentry.logger.warn(
                'Submit validation failed',
                {
                    path: c.req.path,
                    issues,
                }
            );
    
            return c.json(
                { error: 'Invalid request body' },
                400
            );
        }
});

const activeResumeSessionIds = new Set<string>();

// Esta funcion se encarga de separar mensajes de error y mensajes del asistente vacios de la conversacion
function buildConversationHistory(
    messages: {
        role: 'USER' | 'ERROR' | 'ASSISTANT';
        content: string;
        status: MessageStatus;
    }[]
){
    return messages.flatMap((m)=>{
        if (m.role === 'ERROR' ) return [];
        if (m.role === 'ASSISTANT' && m.content.length === 0) return [];

        return [
            {
                role: m.role === 'USER' ? ('user' as const) : ('assistant' as const),
                content: m.content
            },
        ];
    });
};

function getResumableUserMessage(
    messages:{
        role: 'USER' | 'ASSISTANT' | 'ERROR';
        status: MessageStatus;
        model: string;
        mode: Mode
    }[],
) {
    const lastMessage = messages[messages.length - 1];
    if (!lastMessage) {
        Sentry.logger.warn('Failing getting resumable user message', {
            reason: 'no_pending_user_message',
        });
        return null;
    }
    if (lastMessage.role === 'USER') return lastMessage;
    if (lastMessage.role === 'ASSISTANT' && lastMessage.status === MessageStatus.INTERRUPTED) {
        const previousMessage = messages[messages.length - 2];
        if (previousMessage?.role === 'USER') return previousMessage;
    }
    return null;
};

type StreamParams = {
    sessionId: string;
    model: string;
    history:{ role: 'user' | 'assistant'; content: string }[];
    mode: Mode;
    abortController: AbortController;
};

async function streamAIResponse(
    stream: Parameters<Parameters<typeof streamSSE>[1]>[0],
    params: StreamParams
) {
    const { sessionId, model, history, mode, abortController } = params;
    const startTime = Date.now();
    const parts: MessagePart[]= [];
    
    Sentry.logger.info('AI generation started', {
        sessionId,
        model,
        mode,
        messageCount: history.length,
    });
    
    const resolvedModel = resolveChatModel(model);


    const persistInterrumpedMessage = async () => {
        const fullText = parts
            .filter((part) => part.type === 'text')
            .map((part)=> part.text)
            .join('')
        ;

        if (fullText.length === 0 && parts.length === 0) return;

        const validateParts: Prisma.InputJsonValue | undefined = parts.length > 0 ? messagePartsSchema.parse(parts) : undefined;

        const elapsedMs = Date.now() - startTime

        await db.message.create({
            data:{
                sessionId,
                role: 'ASSISTANT',
                status: MessageStatus.INTERRUPTED,
                model,
                content: fullText,
                parts: validateParts,
                mode,
                duration: Math.round(elapsedMs / 1000) 
            },
        });
    };

    try {
        const result =  aiStreamText({
            model: resolvedModel.model,
            messages: history,
            abortSignal: abortController.signal,
            providerOptions: resolvedModel.providerOptions
        });

        if (!result) return;

        for await (const part of result.fullStream) {
            if (stream.aborted) {
                await persistInterrumpedMessage();
                return;
            };

            if (part.type === 'reasoning-delta') {
                const last = parts[parts.length - 1];

                if(last && last.type === 'reasoning') {
                    last.text += part.text;
                }else {
                    parts.push({
                        type:'reasoning',
                        text: part.text
                    });
                };
                const event: ChatStreamEvent = {type: 'reasoning-delta', text: part.text};
                await stream.writeSSE({event: 'reasoning-delta', data: JSON.stringify(event)});
            };

            if(part.type === 'text-delta') {
                const last = parts[parts.length -1];

                if(last && last.type === 'text') {
                    last.text += part.text;
                }else {
                    parts.push({
                        type:'text',
                        text: part.text
                    });
                };
                const event: ChatStreamEvent = {type: 'text-delta', text: part.text};
                await stream.writeSSE({event: 'text-delta', data: JSON.stringify(event)});
            };

            if (part.type === 'tool-call') {
                const args = toolCallArgsSchema.parse(part.input);

                parts.push({
                    type: 'tool-call',
                    id: part.toolCallId,
                    name: part.toolName,
                    args,
                });

                const event: ChatStreamEvent = {
                    type: 'tool-call',
                    toolCallId: part.toolCallId,
                    toolName: part.toolName,
                    args,
                };

                await stream.writeSSE({
                    event: 'tool-call',
                    data: JSON.stringify(event),
                });
            };

            if (part.type === 'tool-result') {
                const resultStr =
                    typeof part.output === 'string' ? part.output : JSON.stringify(part.output);

                const toolCallPart = parts.find((p): p is Extract<MessagePart, {type: 'tool-call'}> => p.type === 'tool-call' && p.id === part.toolCallId);

                if (toolCallPart) {
                    toolCallPart.results  = resultStr;
                };

                const event: ChatStreamEvent = {
                    type: 'tool-call-result',
                    toolCallId: part.toolCallId,
                    result: resultStr,
                };

                await stream.writeSSE({
                    event: 'tool-call-result',
                    data: JSON.stringify(event),
                });
                
            };

            if (part.type === 'error') {
                throw part.error;
            };
        };

        if (stream.aborted || abortController.signal.aborted) {
            await persistInterrumpedMessage();
            return;
        };

        const elapsedMs = Date.now() - startTime;

        const fullText = parts
            .filter((part) => part.type === 'text')
            .map((part)=> part.text)
            .join('')
        ;

        const validateParts: Prisma.InputJsonValue | undefined = parts.length > 0 ? messagePartsSchema.parse(parts) : undefined;

        const assistantMessage = await db.message.create({
            data: {
                sessionId,
                role: 'ASSISTANT',
                model,
                mode,
                content: fullText,
                parts: validateParts,
                status: MessageStatus.COMPLETE,
                duration: Math.round(elapsedMs / 1000),
            },
        });

        const doneEvent: ChatStreamEvent = {
            type: 'done',
            messageId: assistantMessage.id,
            durationMs: elapsedMs,
        };

        Sentry.logger.info('AI generation completed', {
            sessionId,
            model,
            mode,
            durationMs: elapsedMs,
            outputLength: fullText.length,
        });

        await stream.writeSSE({event: 'done', data: JSON.stringify(doneEvent)});

    } catch (error) {
        Sentry.captureException(error);

        Sentry.logger.error('AI generation failed', {
            sessionId,
            model,
            mode,
            error: error instanceof Error
                        ? error.message
                        : String(error),
        });

        if (abortController.signal.aborted) {
            await persistInterrumpedMessage();
            return;
        };

        const message = error instanceof Error ? error.message : String(error);

        await db.message.create({
            data: {
                sessionId,
                role: 'ERROR',
                model,
                mode,
                status: MessageStatus.COMPLETE,
                content: message,
            },
        });

        const errorEvent: ChatStreamEvent = {
            type: 'error',
            message,
        };

        await stream.writeSSE({event: 'error', data: JSON.stringify(errorEvent)});
    
    };

};

const app = new Hono()
    .post('/:sessionId/resume', async (c) =>{
        const sessionId = c.req.param('sessionId');

        const session = await db.session.findUnique({
            where: { id: sessionId },
            include: { messages: {orderBy: { createdAt: 'asc' } } },
        });

        if (!session) {
            Sentry.logger.warn('Session not found', {
                    sessionId,
                    userId: 'mock-user',
                });
            return c.json({ error: 'Session not found' }, 404);
        };

        const resumableMessage = getResumableUserMessage(session.messages);

        if (!resumableMessage) {
            Sentry.logger.warn('Resume rejected', {
                sessionId,
                reason: 'no_pending_user_message',
            });

            return c.json({ error: 'Session has no pending user message to resume' }, 409);
        };

        if (!isSupportedChatModel(resumableMessage.model)) {
            Sentry.logger.warn('Unsupported model detected', {
                sessionId,
                model: resumableMessage.model,
            });

            return c.json({error: `Session uses unsupported model: ${resumableMessage.model}` }, 409);
        };

        if (activeResumeSessionIds.has(sessionId)) {
            return c.json({error: 'Session already has an active resume'}, 409);
        };

        activeResumeSessionIds.add(sessionId);

        const history = buildConversationHistory(session.messages);
        const abortController = new AbortController();

        try {
            return streamSSE(
                c,
                async (stream) => {
                    stream.onAbort(() => {
                        Sentry.logger.info('Stream aborted by client', {
                            sessionId,
                        });
                        abortController.abort();
                    });

                    try {
                        await streamAIResponse(stream, {
                            sessionId,
                            model: resumableMessage.model,
                            history,
                            mode: resumableMessage.mode,
                            abortController,
                        }); 
                    } finally {
                        activeResumeSessionIds.delete(sessionId)
                    }
                },
                async (error, stream) => {
                    Sentry.captureException(error);

                    Sentry.logger.error('SSE stream error', {
                        sessionId,
                        error:
                            error instanceof Error
                                ? error.message
                                : String(error),
                    });

                    activeResumeSessionIds.delete(sessionId)
                    const message = error instanceof Error ? error.message : String(error);
                    const errorEvent: ChatStreamEvent = {
                        type: 'error',
                        message,
                    }
                    await stream.writeSSE({event: 'error', data: JSON.stringify(errorEvent)});
                },
            );
        } catch (error) {
            Sentry.captureException(error);

            Sentry.logger.error('SSE stream error', {
                sessionId,
                error: error instanceof Error
                        ? error.message
                        : String(error),
            });

            activeResumeSessionIds.delete(sessionId)
            throw error;
        };
    })
    .post('/:sessionId', submitValidator, async (c) => {
        const sessionId = c.req.param('sessionId');
        const session = await db.session.findUnique({
            where: { id: sessionId },
            include: { messages: {orderBy: { createdAt: 'asc' } } },
        });

        if (!session) {
             Sentry.logger.warn('Session not found', {
                sessionId,
                userId: 'mock-user',
            });

            return c.json({ error: 'Session not found' }, 404);
        };

        const data = c.req.valid('json');

        await db.message.create({
            data: {
                sessionId,
                role: 'USER',
                model: data.model,
                mode: data.mode,
                content: data.content,
                status: MessageStatus.COMPLETE,
            },
        });

        const history = buildConversationHistory([
            ...session.messages, // TODO: Establecer limitaciones de la historia de conversaciones. Quizas 5 o 10 mensajes
            { 
                role: 'USER' as const, 
                content: data.content, 
                status: MessageStatus.COMPLETE 
            },
        ]);

        const abortController = new AbortController();

        return streamSSE(
            c,
            async (stream) => {
                stream.onAbort(()=>{
                     Sentry.logger.info('Stream aborted by client', {
                        sessionId,
                    });
                    abortController.abort();
                });

                await streamAIResponse(stream, {
                    sessionId,
                    model: data.model,
                    history,
                    mode: data.mode,
                    abortController,
                });
            },
            async (error, stream) => {
                const message = error instanceof Error ? error.message : String(error);
                const errorEvent: ChatStreamEvent = {
                    type: 'error',
                    message,
                };

                await stream.writeSSE({event: 'error', data: JSON.stringify(errorEvent)});
            }
        );
    });

    export default app;