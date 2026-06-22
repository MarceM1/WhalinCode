import 'dotenv/config'
import { env } from './config/env';
import { Hono } from 'hono';
import {sentry} from '@sentry/hono/bun';
import * as Sentry from "@sentry/hono/bun";

import {HTTPException} from 'hono/http-exception';

import sessions from './routes/sessions.route';
import chat from './routes/chat.route';


const app = new Hono()



app.use(
  sentry(app, {
    dsn: env.SENTRY_DSN,
    tracesSampleRate: env.SENTRY_TRACES_SAMPLE_RATE,
    enableLogs: true,
    // To disable sending user data, uncomment the line below. For more info visit:
    // https://docs.sentry.io/platforms/javascript/guides/hono/configuration/options/#dataCollection
    // dataCollection: { userInfo: false },
  }),
);


app.onError((error, c)=>{
    if(error instanceof HTTPException){
        Sentry.logger.warn("Handled HTTP error: ", {
            status: error.status,
            message: error.message || 'Request failed',
            path: c.req.path,
            method: c.req.method
        });

        return c.json({error: error.message || "Request failed"}, error.status);
    };

    Sentry.logger.error('Unhandled server error: ', {
        status: 500,
        message: error instanceof Error ? error.message : 'Unknown error',
        path: c.req.path,
        method: c.req.method
    });
    return c.json({error: "Internal Server Error"}, 500);
});

app.notFound((c) => {
  return c.text('Oops! Esta pagina no existe.', 404)
})

const routes = app.route('/sessions', sessions).route('/chat', chat)

export type AppType = typeof routes;

// idleTimeout DEBE de ser alto, de otra manera, las llamadas al LLM puede no estar completandose en el tiempo disponible.
export default {
    port: 3000,
    fetch: app.fetch,
    idleTimeout: 255,
};