import type { Command } from "./types";

export const COMMANDS: Command[] = [
    {
        name: 'new',
        description: 'Start a new project',
        value: '/new',
        action: (ctx) => {
            ctx.toast.show({ message: 'Starting a new conversation...'});
        },
    },
    {
        name: 'agents',
        description: 'Switch between AI agents',
        value: '/agents',
        action: (ctx) => {
            ctx.toast.show({ message: 'Switching AI agents...'});
        },
    },
    {
        name: 'models',
        description: 'View and select AI models for generation',
        value: '/models',
        action: (ctx) => {
            ctx.toast.show({ message: 'Switching AI models...'});
        },
    },
    {
        name: 'sessions',
        description: 'Browse past sessions',
        value: '/sessions',
        action: (ctx) => {
            ctx.toast.show({ message: 'Opening past sessions...'});
        }
    },
    {
        name: 'theme',
        description: 'Change the color theme',
        value: '/theme',
        action: (ctx) => {
            ctx.toast.show({ message: 'Changing theme...'});
        }
    },
    {
        name: 'login',
        description: 'Sign in with your browser',
        value: '/login',
        action: (ctx) => {
            ctx.toast.show({ message: 'Signing in...'});
        }
    },
    {
        name: 'logout',
        description: 'Sign out of your account',
        value: '/logout',
        action: (ctx) => {
            ctx.toast.show({ message: 'Signing out...'});
        }
    },
    {
        name: 'upgrade',
        description: 'Buy more credits or upgrade your plan',
        value: '/upgrade',        
        action: (ctx) => {
            ctx.toast.show({ message: 'Opening upgrade options...'});
        }
    },
    {
        name: 'usage',
        description: 'Open billing portal in your browser',
        value: '/usage',
        action: (ctx) => {
            ctx.toast.show({ message: 'Opening billing portal...'});
        }
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