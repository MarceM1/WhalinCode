import { createMiddleware } from 'hono/factory';
import type { AuthenticateEnv } from './require-auth';
import { getAvailableCreditsBalance } from '../lib/polar';

export const requireCreditsBalance = createMiddleware<AuthenticateEnv>(async (c, next) => {
    try {
        const userId = c.get('userId');
        const creditsBalance = await getAvailableCreditsBalance(userId);

        /**
         * Validación simple al inicio de una solicitud. Solo permite iniciar un nuevo
         * trabajo si el cliente todavía dispone de créditos.
         *
         * El sistema no reserva por adelantado el costo máximo que la solicitud podría
         * llegar a consumir. Como consecuencia, en aplicaciones de bajo volumen es
         * aceptable que, en casos excepcionales, se produzca un pequeño sobregasto.
         */
        if (creditsBalance <= 0) {
            return c.json({ error: 'No credits remaining. Run /upgrade to buy morecredits.' }, 402);
        }

        await next();
    } catch {
        return c.json({ error: 'Unable to verify credits balance right now.' }, 503);
    }
});
