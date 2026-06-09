import { Hono } from 'hono';
import {sentry} from '@sentry/hono/bun';
import * as Sentry from "@sentry/hono/bun";

import {HTTPException} from 'hono/http-exception';

import sessions from './routes/sessions.route';

const app = new Hono()

app.use(
  sentry(app, {
    dsn: "https://d5e28057d63a88635f61be506eee8a15@o4508005885280256.ingest.us.sentry.io/4511532498616320",
    tracesSampleRate: 1.0,
    enableLogs: true,
    // To disable sending user data, uncomment the line below. For more info visit:
    // https://docs.sentry.io/platforms/javascript/guides/hono/configuration/options/#dataCollection
    // dataCollection: { userInfo: false },
  }),
);

// app.get("/debug-sentry", () => {
//   // Send a log before throwing the error
//   Sentry.logger.info('User triggered test error', {
//     action: 'test_error_endpoint',
//   });
//   // Send a test metric before throwing the error
//   Sentry.metrics.count('test_counter', 1);
//   throw new Error("My first Sentry error!");
// });


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

const routes = app.route('/sessions', sessions)

export type AppType = typeof routes;

// idleTimeout DEBE de ser alto, de otra manera, las llamadas al LLM puede no estar completandose en el tiempo disponible.
export default {
    port: 3000,
    fetch: app.fetch,
    idleTimeout: 255,
};