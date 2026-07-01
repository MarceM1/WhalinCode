import { hc } from 'hono/client';
import type { AppType } from '@whalincode/server';

const apiBaseUrl = process.env.API_URL?.trim() || 'http://localhost:3000';

export const apiClient = hc<AppType>(apiBaseUrl);
