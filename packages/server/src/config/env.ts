import { z } from 'zod';

const requiredEnv = (name: string) =>
    z
        .string({ error: `${name} environment variable is required` })
        .min(1, `${name} environment variable is required`);

const enumEnv = <const T extends readonly [string, ...string[]]>(values: T, name: string) =>
    z.enum(values, {
        error: `${name} must be one of: ${values.join(', ')}`,
    });

const envSchema = z.object({
    ANTHROPIC_API_KEY: requiredEnv('ANTHROPIC_API_KEY'),
    OPENAI_API_KEY: requiredEnv('OPENAI_API_KEY'),

    DATABASE_URL: requiredEnv('DATABASE_URL'),

    SENTRY_DSN: requiredEnv('SENTRY_DSN'),
    SENTRY_TRACES_SAMPLE_RATE: z.coerce.number().default(1.0),

    CLERK_SECRET_KEY: requiredEnv('CLERK_SECRET_KEY'),
    CLERK_PUBLISHABLE_KEY: requiredEnv('CLERK_PUBLISHABLE_KEY'),

    POLAR_ACCESS_TOKEN: requiredEnv('POLAR_ACCESS_TOKEN'),
    POLAR_PRODUCT_ID: requiredEnv('POLAR_PRODUCT_ID'),
    POLAR_CREDITS_METER_ID: requiredEnv('POLAR_CREDITS_METER_ID'),

    POLAR_SERVER: enumEnv(['sandbox', 'production'], 'POLAR_SERVER').default('sandbox'),
});

export const env = envSchema.parse(process.env);
