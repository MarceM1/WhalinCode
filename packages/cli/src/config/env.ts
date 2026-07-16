import { z } from 'zod';

const envSchema = z.object({
    API_URL: z.string().min(1),
    CLERK_FRONTEND_API: z.string().min(1),
    CLERK_OAUTH_CLIENT_ID: z.string().min(1),
    CLERK_OAUTH_CLIENT_SECRET: z.string().min(1),
    JWT_SECRET: z.string().min(1),
    CLERK_PUBLISHABLE_KEY: z.string().min(1),
    CLERK_SECRET_KEY: z.string().min(1),
});

export const env = envSchema.parse(process.env);
