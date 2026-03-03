/**
 * AI API integration for FORGE.
 * All requests are now proxied securely through the backend.
 */
import { getAccessToken } from '@/lib/auth';

const API_BASE = import.meta.env.VITE_API_URL || '';
import { useAppStore } from '@/store/useAppStore';

// ── Obsolete Key management (kept as stubs for backwards compatibility in components) ──
export function getApiKey(): string | null { return "proxied-via-backend"; }
export function setApiKey(key: string): void { /* no-op */ }
export function clearApiKey(): void { /* no-op */ }
export function hasApiKey(): boolean { return useAppStore.getState().user?.hasOpenrouterKey ?? false; }

export const getGeminiApiKey = getApiKey;
export const setGeminiApiKey = setApiKey;
export const clearGeminiApiKey = clearApiKey;
export const hasGeminiKey = hasApiKey;

// ── Core call ────────────────────────────────────────────────

import { apiRequest } from './api';

async function fetchFromBackendProxy(prompt: string, model?: string, apiKey?: string) {
    const payload: { prompt: string, model?: string, api_key?: string } = { prompt };
    if (model) payload.model = model;
    if (apiKey) payload.api_key = apiKey;

    return await apiRequest<any>('/ai/generate', {
        method: 'POST',
        body: JSON.stringify(payload),
    });
}

/**
 * Call the backend AI proxy expecting JSON back.
 */
export async function callGemini<T = unknown>(prompt: string, model?: string, apiKey?: string): Promise<T | null> {
    try {
        const data = await fetchFromBackendProxy(prompt, model, apiKey);
        return data as T;
    } catch (e) {
        console.error("AI Generation Error:", e);
        throw e;
    }
}

/**
 * Call the backend AI proxy expecting a JSON array.
 */
export async function callGeminiForInsights<T = unknown>(prompt: string, model?: string, apiKey?: string): Promise<T[] | null> {
    try {
        const parsed = await fetchFromBackendProxy(prompt, model, apiKey);
        if (Array.isArray(parsed)) return parsed as T[];
        // Unwrap common wrapper keys
        const keys = Object.keys(parsed);
        for (const k of keys) {
            if (Array.isArray(parsed[k])) return parsed[k] as T[];
        }
        return [parsed as T];
    } catch (e) {
        console.error("AI Insights Error:", e);
        throw e;
    }
}

/**
 * Test the API connection. optionally using an unsaved key
 */
export async function testGeminiConnection(apiKey?: string): Promise<boolean> {
    try {
        const result = await apiRequest<{ ok: boolean }>('/ai/test', {
            method: 'POST',
            body: JSON.stringify({ api_key: apiKey || '' }),
        });
        return result?.ok === true;
    } catch {
        return false;
    }
}

// Keep the same export name for backward compat
export const testApiConnection = testGeminiConnection;
