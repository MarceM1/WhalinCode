import { Hono } from 'hono';
// import { HTTPException } from 'hono/http-exception';
import { zValidator } from '@hono/zod-validator';
import * as Sentry from '@sentry/hono/bun';
import { z } from 'zod';
import { db } from '@whalincode/database/client';
import type { AuthenticateEnv } from '../middleware/require-auth';

import { requireCreditsBalance } from '../middleware/require-credits-balance';

const createSessionSchema = z.object({
    title: z.string(),
});

const createSessionValidator = zValidator('json', createSessionSchema, (result, c) => {
    // if(!result.success){
    //     Sentry.logger.warn('Session creation validation failed', {
    //         path: c.req.path,
    //         issues: result.error.issues.length
    //     });

    //     return c.json({error: 'Invalid request body'}, 400);
    // }
    //     if (!result.success) {
    //     const error = result.error;

    //     Sentry.logger.warn('Session creation validation failed', {
    //         path: c.req.path,
    //         issues: error.issues.length,
    //     });

    //     return c.json({ error: 'Invalid request body' }, 400);
    // }
    if (result.success === false) {
        const issues = result.error.issues.length;

        Sentry.logger.warn('Session creation validation failed', {
            path: c.req.path,
            issues,
        });

        return c.json({ error: 'Invalid request body' }, 400);
    }
});

const app = new Hono<AuthenticateEnv>()
    .get('/', async (c) => {
        const userId = c.get('userId');
        const sessions = await db.session.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
            select: {
                id: true,
                title: true,
                createdAt: true,
            },
        });

        Sentry.logger.info('Listed sessions', {
            count: sessions.length,
        });

        return c.json(sessions);
    })
    .get('/:id', async (c) => {
        // Mock: Uncomment to simulate slow session loading
        // await new Promise((r) => setTimeout(r, 5000));

        // Mock: Uncomment to simulate an error during session loading
        // throw new HTTPException({
        //     status: 500, message:'Mock error: session loading failed'})

        const id = c.req.param('id');
        const userId = c.get('userId');
        const session = await db.session.findUnique({
            where: { id, userId },
        });

        if (!session || session.userId !== userId) {
            Sentry.logger.warn('Session not found', {
                sessionId: id,
                userId,
            });

            return c.json({ error: 'Session not found' }, 404);
        }

        Sentry.logger.info('Loaded session', {
            sessionId: id,
            messageCount: Array.isArray(session.messages) ? session.messages.length : 0,
            userId,
        });

        return c.json(session);
    })
    .post('/', requireCreditsBalance, createSessionValidator, async (c) => {
        // Mock: Uncomment to simulate slow session loading
        // await new Promise((r) => setTimeout(r, 5000));

        // Mock: Uncomment to simulate an error during session loading
        // throw new HTTPException(500, {message:'Mock error: session loading failed'});
        const userId = c.get('userId');

        const { title } = c.req.valid('json');

        const session = await db.session.create({
            data: {
                title,
                userId,
            },
        });

        Sentry.logger.info('Created session', {
            sessionId: session.id,
            userId,
            title: session.title,
        });

        return c.json(session, 201);
    });

export default app;
