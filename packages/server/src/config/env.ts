import {z} from 'zod';

const envSchema = z.object({
    ANTHROPIC_API_KEY: z.string().min(1),
    OPENAI_API_KEY: z.string().min(1),
    DATABASE_URL: z.string().min(1),
    SENTRY_DSN: z.string().min(1),
    SENTRY_TRACES_SAMPLE_RATE: z
        .coerce
        .number()
        .default(1.0),
});

export const env = envSchema.parse(process.env);