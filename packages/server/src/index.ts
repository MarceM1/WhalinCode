import { Hono } from 'hono';
import {HTTPException} from 'hono/http-exception';
import sessions from './routes/sessions.route';

const app = new Hono()


app.onError((error, c)=>{
    if(error instanceof HTTPException){
        return c.json({error: error.message || "Request Failed"}, error.status)
    };

    console.error('Unhandled server error: ', error);
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