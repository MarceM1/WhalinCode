import { SUPPORTED_CHAT_MODELS } from '@whalincode/shared';
import {
    SessionsDialogContent,
    ThemeDialogContent,
    AgentsDialogContent,
    ModelsDialogContent,
} from '../dialogs';
import type { Command } from './types';
import { performLogin } from '../../lib/oauth';
import { clearAuth } from '../../lib/auth';
import { openBillingPortal, openUpgradeCheckout } from '../../lib/upgrade';

export const COMMANDS: Command[] = [
    {
        name: 'new',
        description: 'Start a new project',
        value: '/new',
        action: (ctx) => {
            ctx.navigate('/');
        },
    },
    {
        name: 'agents',
        description: 'Switch agents',
        value: '/agents',
        action: (ctx) => {
            ctx.dialog.open({
                title: 'Select agent',
                children: <AgentsDialogContent currentMode={ctx.mode} onSelectMode={ctx.setMode} />,
            });
        },
    },
    {
        name: 'models',
        description: 'View and select AI models for generation',
        value: '/models',
        action: (ctx) => {
            ctx.dialog.open({
                title: 'Select Model',
                children: (
                    <ModelsDialogContent
                        models={SUPPORTED_CHAT_MODELS.map((model) => model.id)}
                        onSelectModel={ctx.setModel}
                    />
                ),
            });
        },
    },
    {
        name: 'sessions',
        description: 'Browse past sessions',
        value: '/sessions',
        action: (ctx) => {
            ctx.dialog.open({
                title: 'Sessions',
                children: <SessionsDialogContent />,
            });
        },
    },
    {
        name: 'theme',
        description: 'Change the color theme',
        value: '/theme',
        action: (ctx) => {
            ctx.dialog.open({
                title: 'Select a theme',
                children: <ThemeDialogContent />,
            });
        },
    },
    {
        name: 'login',
        description: 'Sign in with your browser',
        value: '/login',
        action: async (ctx) => {
            ctx.toast.show({ message: 'Signing in...' });

            try {
                await performLogin();
                ctx.toast.show({ variant: 'success', message: 'Signed in successfully' });
            } catch (error) {
                const message =
                    error instanceof Error ? error.message : 'Sign in failed or timed out';
                ctx.toast.show({ variant: 'error', message });
            }
        },
    },
    {
        name: 'logout',
        description: 'Sign out of your account',
        value: '/logout',
        action: (ctx) => {
            clearAuth();
            ctx.toast.show({ variant: 'success', message: 'Signed out' });
        },
    },
    {
        name: 'upgrade',
        description: 'Buy more credits or upgrade your plan',
        value: '/upgrade',
        action: async (ctx) => {
            ctx.toast.show({ message: 'Opening upgrade options...' });

            try {
                await openUpgradeCheckout();
                ctx.toast.show({
                    variant: 'success',
                    message: 'Checkout opened in browser',
                });
            } catch (error) {
                const message = error instanceof Error ? error.message : 'Failed to open checkout';
                ctx.toast.show({
                    variant: 'error',
                    message,
                });
            }
        },
    },
    {
        name: 'usage',
        description: 'Open billing portal in your browser',
        value: '/usage',
        action: async (ctx) => {
            ctx.toast.show({ message: 'Opening billing portal...' });

            try {
                await openBillingPortal();

                ctx.toast.show({
                    variant: 'success',
                    message: 'Billing portal opened in browser',
                });
            } catch (error) {
                const message =
                    error instanceof Error ? error.message : 'Failed to open billing portal';
                ctx.toast.show({
                    variant: 'error',
                    message,
                });
            }
        },
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
