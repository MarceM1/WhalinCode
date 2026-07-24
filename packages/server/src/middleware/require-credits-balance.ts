import { createMiddleware } from 'hono/factory';
import type { AuthenticateEnv } from './require-auth';
import { getAvailableCreditsBalance } from '../lib/polar';

export const requireCreditsBalance = createMiddleware<AuthenticateEnv>(async (c, next) => {
    const userId = c.get('userId');
    let creditsBalance: number;
    try {
        creditsBalance = await getAvailableCreditsBalance(userId);
    } catch {
        return c.json({ error: 'Unable to verify credits balance right now.' }, 503);
    }

    /**
     * Validación simple al inicio de una solicitud. Solo permite iniciar un nuevo
     * trabajo si el cliente todavía dispone de créditos.
     *
     * El sistema no reserva por adelantado el costo máximo que la solicitud podría
     * llegar a consumir. Como consecuencia, en aplicaciones de bajo volumen es
     * aceptable que, en casos excepcionales, se produzca un pequeño sobregasto.
     */
    if (creditsBalance <= 0) {
        return c.json({ error: 'No credits remaining. Run /upgrade to buy more credits.' }, 402);
    }

    await next();
});
