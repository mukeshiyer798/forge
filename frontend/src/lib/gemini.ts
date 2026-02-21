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

async function fetchFromBackendProxy(prompt: string, model?: string) {
    const token = getAccessToken();
    if (!token) throw new Error("Authentication required for AI features");

    const payload: { prompt: string, model?: string } = { prompt };
    if (model) payload.model = model;

    const res = await fetch(`${API_BASE}/api/v1/ai/generate`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
    });

    if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.detail || `Backend error ${res.status}`);
    }

    return await res.json();
}

/**
 * Call the backend AI proxy expecting JSON back.
 */
export async function callGemini<T = unknown>(prompt: string, model?: string): Promise<T | null> {
    try {
        const data = await fetchFromBackendProxy(prompt, model);
        return data as T;
    } catch (e) {
        console.error("AI Generation Error:", e);
        throw e;
    }
}

/**
 * Call the backend AI proxy expecting a JSON array.
 */
export async function callGeminiForInsights<T = unknown>(prompt: string, model?: string): Promise<T[] | null> {
    try {
        const parsed = await fetchFromBackendProxy(prompt, model);
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
 * Test the API connection.
 */
export async function testGeminiConnection(): Promise<boolean> {
    try {
        const result = await callGemini<{ ok: boolean }>('Return exactly: {"ok": true}');
        return result?.ok === true;
    } catch {
        return false;
    }
}

// Keep the same export name for backward compat
export const testApiConnection = testGeminiConnection;
