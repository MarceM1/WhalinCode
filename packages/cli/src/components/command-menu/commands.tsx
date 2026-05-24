import type { Command } from "./types";

export const COMMANDS: Command[] = [
    {
        name: 'new',
        description: 'Start a new project',
        value: '/new',
    },
    {
        name: 'agents',
        description: 'Switch between AI agents',
        value: '/agents',
    },
    {
        name: 'models',
        description: 'View and select AI models for generation',
        value: '/models',
    },
    {
        name: 'sessions',
        description: 'Browse past sessions',
        value: '/sessions',
    },
    {
        name: 'theme',
        description: 'Change the color theme',
        value: '/theme',
    },
    {
        name: 'login',
        description: 'Sign in with your browser',
        value: '/login',
    },
    {
        name: 'logout',
        description: 'Sign out of your account',
        value: '/logout',
    },
    {
        name: 'upgrade',
        description: 'Buy more credits or upgrade your plan',
        value: '/upgrade',
    },
    {
        name: 'usage',
        description: 'Open billing portal in your browser',
        value: '/usage',
    },
    {
        name: 'exit',
        description: 'Exit the application',
        value: '/exit',
        action: (ctx) => {
            ctx.exit();
        },
    },
];