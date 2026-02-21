/**
 * AI API integration for FORGE — via OpenRouter.
 * Uses the OpenRouter REST API (OpenAI-compatible chat completions).
 * Falls back to prompt copy if no key or on error.
 */

const KEY_STORAGE = 'forge_ai_api_key';
const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const MODEL = 'google/gemini-2.0-flash-001';

// ── Key management (sessionStorage) ──────────────────────────

export function getApiKey(): string | null {
    return sessionStorage.getItem(KEY_STORAGE);
}

export function setApiKey(key: string): void {
    sessionStorage.setItem(KEY_STORAGE, key);
}

export function clearApiKey(): void {
    sessionStorage.removeItem(KEY_STORAGE);
}

export function hasApiKey(): boolean {
    return !!getApiKey();
}

// ── Backward compat aliases ──────────────────────────────────
export const getGeminiApiKey = getApiKey;
export const setGeminiApiKey = setApiKey;
export const clearGeminiApiKey = clearApiKey;
export const hasGeminiKey = hasApiKey;

// ── Core call ────────────────────────────────────────────────

interface OpenRouterResponse {
    choices?: Array<{
        message?: {
            content?: string;
        };
    }>;
    error?: { message?: string };
}

/**
 * Call OpenRouter expecting JSON back.
 * Returns null if no API key.
 */
export async function callGemini<T = unknown>(prompt: string): Promise<T | null> {
    const key = getApiKey();
    if (!key) return null;

    const res = await fetch(OPENROUTER_URL, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${key}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': window.location.origin,
            'X-Title': 'FORGE',
        },
        body: JSON.stringify({
            model: MODEL,
            messages: [
                { role: 'user', content: prompt },
            ],
            response_format: { type: 'json_object' },
        }),
    });

    if (!res.ok) {
        const errBody = await res.text().catch(() => '');
        throw new Error(`OpenRouter error ${res.status}: ${errBody.slice(0, 200)}`);
    }

    const data: OpenRouterResponse = await res.json();

    if (data.error?.message) {
        throw new Error(data.error.message);
    }

    const text = data.choices?.[0]?.message?.content ?? '';
    if (!text.trim()) throw new Error('Empty response from AI');

    const cleaned = text.replace(/^```(?:json)?\s*([\s\S]*?)```\s*$/m, '$1').trim();
    return JSON.parse(cleaned) as T;
}

/**
 * Call OpenRouter expecting a JSON array.
 */
export async function callGeminiForInsights<T = unknown>(prompt: string): Promise<T[] | null> {
    const key = getApiKey();
    if (!key) return null;

    const res = await fetch(OPENROUTER_URL, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${key}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': window.location.origin,
            'X-Title': 'FORGE',
        },
        body: JSON.stringify({
            model: MODEL,
            messages: [
                { role: 'user', content: prompt },
            ],
            response_format: { type: 'json_object' },
        }),
    });

    if (!res.ok) {
        const errBody = await res.text().catch(() => '');
        throw new Error(`OpenRouter error ${res.status}: ${errBody.slice(0, 200)}`);
    }

    const data: OpenRouterResponse = await res.json();
    if (data.error?.message) throw new Error(data.error.message);

    const text = data.choices?.[0]?.message?.content ?? '';
    if (!text.trim()) throw new Error('Empty response from AI');

    const cleaned = text.replace(/^```(?:json)?\s*([\s\S]*?)```\s*$/m, '$1').trim();
    const parsed = JSON.parse(cleaned);
    if (Array.isArray(parsed)) return parsed as T[];
    // Unwrap common wrapper keys
    const keys = Object.keys(parsed);
    for (const k of keys) {
        if (Array.isArray(parsed[k])) return parsed[k] as T[];
    }
    return [parsed as T];
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
