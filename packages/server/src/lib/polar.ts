import { Polar } from '@polar-sh/sdk';
import { env } from '../config/env';

const polar = new Polar({
    accessToken: env.POLAR_ACCESS_TOKEN,
    server: env.POLAR_SERVER,
});

function hasStatusCode(error: unknown): error is { statusCode: number } {
    return (
        typeof error === 'object' &&
        error !== null &&
        'statusCode' in error &&
        typeof error.statusCode === 'number'
    );
}

type CreateCheckoutUrlParams = {
    customerExternalId: string;
    requestUrl: string;
};

export async function createCheckoutUrl({
    customerExternalId,
    requestUrl,
}: CreateCheckoutUrlParams) {
    const result = await polar.checkouts.create({
        products: [env.POLAR_PRODUCT_ID],
        /**
         * TODO(seguridad):
         * Actualmente las URLs de retorno utilizadas por Polar se construyen a partir
         * de la URL de la solicitud entrante.
         *
         * Esto asume que el origen de la petición es confiable (por ejemplo, detrás de
         * Railway o un reverse proxy correctamente configurado).
         *
         * Antes de considerar la aplicación lista para producción, reemplazar este
         * comportamiento por una URL canónica del servidor (APP_URL/API_URL) obtenida
         * desde la configuración, evitando depender de un origen controlado por el
         * cliente para construir las URLs de éxito y retorno.
         *
         * Tema relacionado:
         * - Protección frente a Host Header Injection / Open Redirect.
         */
        successUrl: new URL('/billing/success', requestUrl).toString(),
        externalCustomerId: customerExternalId,
        metadata: { source: 'whalincode-cli' },
    });

    return result.url;
}

export async function createCustomerPortalUrl({
    customerExternalId,
    requestUrl,
}: CreateCheckoutUrlParams) {
    const result = await polar.customerSessions.create({
        externalCustomerId: customerExternalId,
        returnUrl: new URL('/billing/success', requestUrl).toString(),
    });

    return result.customerPortalUrl;
}

export async function getAvailableCreditsBalance(customerExternalId: string) {
    try {
        const customerState = await polar.customers.getStateExternal({
            externalId: customerExternalId,
        });

        const matchingMeters = customerState.activeMeters.filter(
            (meter) => meter.meterId === env.POLAR_CREDITS_METER_ID,
        );

        if (matchingMeters.length > 1) {
            throw new Error('Expected exactly one matching Polar credits meter');
        }

        const creditsMeter = matchingMeters[0];
        return creditsMeter?.balance ?? 0;
    } catch (error) {
        if (hasStatusCode(error) && error.statusCode === 404) {
            return 0;
        }

        throw error;
    }
}

type IngestAiUsagePArams = {
    externalCustomerId: string;
    eventId: string;
    credits: number;
};

export async function ingestAiUsage({ externalCustomerId, eventId, credits }: IngestAiUsagePArams) {
    if (credits <= 0) {
        return;
    }

    await polar.events.ingest({
        events: [
            {
                name: 'whalincode_usage',
                externalId: eventId,
                externalCustomerId,
                metadata: { credits },
            },
        ],
    });
}
