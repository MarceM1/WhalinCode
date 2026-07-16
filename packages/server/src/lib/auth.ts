import { createClerkClient } from '@clerk/backend';
import { env } from '../config/env';

if (!env.CLERK_SECRET_KEY) {
    throw new Error('CLERK_SECRET_KEY environment variable is required.');
}

if (!env.CLERK_PUBLISHABLE_KEY) {
    throw new Error('CLERK_PUBLISHABLE_KEY environment variable is required.');
}

const clerkClient = createClerkClient({
    secretKey: env.CLERK_SECRET_KEY,
    publishableKey: env.CLERK_PUBLISHABLE_KEY,
});

export async function authenticateOAuthRequest(request: Request) {
    const requestState = await clerkClient.authenticateRequest(request, {
        acceptsToken: 'oauth_token',
    });

    if (!requestState.isAuthenticated) return null;

    const auth = requestState.toAuth();
    if (auth.tokenType !== 'oauth_token' || !auth.userId) return null;

    return { userId: auth.userId };
}
