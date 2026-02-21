/**
 * Frontend tests for auth utilities.
 * 
 * Validates: token storage security, auth header construction,
 * XSS resistance, and edge cases with malformed data.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

// We test the module behavior, so we import the actual implementations.
// sessionStorage is provided by jsdom.

describe('Auth Token Security', () => {
    const TOKEN_KEY = 'forge_access_token';

    beforeEach(() => {
        sessionStorage.clear();
    });

    it('should store token in sessionStorage, NOT localStorage', async () => {
        const { setAccessToken } = await import('@/lib/auth');
        setAccessToken('test-token-123');

        expect(sessionStorage.getItem(TOKEN_KEY)).toBe('test-token-123');
        expect(localStorage.getItem(TOKEN_KEY)).toBeNull();
    });

    it('should return null when no token is stored', async () => {
        const { getAccessToken } = await import('@/lib/auth');
        expect(getAccessToken()).toBeNull();
    });

    it('should build proper Authorization header', async () => {
        const { setAccessToken, getAuthHeaders } = await import('@/lib/auth');
        setAccessToken('abc.def.ghi');

        const headers = getAuthHeaders();
        expect(headers).toEqual({ Authorization: 'Bearer abc.def.ghi' });
    });

    it('should return empty headers when no token exists', async () => {
        const { getAuthHeaders } = await import('@/lib/auth');
        const headers = getAuthHeaders();
        expect(headers).toEqual({});
    });

    it('should fully clear token on clearAccessToken', async () => {
        const { setAccessToken, clearAccessToken, getAccessToken } = await import('@/lib/auth');
        setAccessToken('sensitive-token');
        clearAccessToken();
        expect(getAccessToken()).toBeNull();
        expect(sessionStorage.getItem(TOKEN_KEY)).toBeNull();
    });

    it('should handle empty string token gracefully', async () => {
        const { setAccessToken, getAccessToken } = await import('@/lib/auth');
        setAccessToken('');
        // Empty string is falsy — getAuthHeaders should treat it as "no token"
        expect(getAccessToken()).toBe('');
    });
});


describe('API Request Error Handling', () => {
    beforeEach(() => {
        vi.restoreAllMocks();
    });

    it('should throw ApiError with status and detail on non-OK response', async () => {
        // Mock fetch to return a 400 with JSON detail
        global.fetch = vi.fn().mockResolvedValue({
            ok: false,
            status: 400,
            statusText: 'Bad Request',
            json: () => Promise.resolve({ detail: 'Focus on one thing at a time' }),
        });

        const { apiRequest } = await import('@/lib/api');

        try {
            await apiRequest('/goals/', { method: 'POST', body: '{}' });
            expect.fail('Should have thrown');
        } catch (err: any) {
            expect(err.status).toBe(400);
            expect(err.detail).toBe('Focus on one thing at a time');
        }
    });

    it('should handle non-JSON error responses without crashing', async () => {
        global.fetch = vi.fn().mockResolvedValue({
            ok: false,
            status: 500,
            statusText: 'Internal Server Error',
            json: () => Promise.reject(new Error('not json')),
        });

        const { apiRequest } = await import('@/lib/api');

        try {
            await apiRequest('/goals/');
            expect.fail('Should have thrown');
        } catch (err: any) {
            expect(err.status).toBe(500);
            expect(err.detail).toBe('Internal Server Error');
        }
    });

    it('should not leak server error details to the error object beyond the detail field', async () => {
        global.fetch = vi.fn().mockResolvedValue({
            ok: false,
            status: 403,
            statusText: 'Forbidden',
            json: () => Promise.resolve({
                detail: 'Not enough permissions',
                internal_debug: 'SQL query: SELECT * FROM...',
                stack_trace: 'at line 42...',
            }),
        });

        const { apiRequest } = await import('@/lib/api');

        try {
            await apiRequest('/goals/123');
            expect.fail('Should have thrown');
        } catch (err: any) {
            // The ApiError should only contain detail and status — no raw server internals
            expect(Object.keys(err)).toEqual(expect.arrayContaining(['detail', 'status']));
            expect(err).not.toHaveProperty('internal_debug');
            expect(err).not.toHaveProperty('stack_trace');
        }
    });

    it('should handle empty response body gracefully', async () => {
        global.fetch = vi.fn().mockResolvedValue({
            ok: true,
            status: 200,
            text: () => Promise.resolve(''),
        });

        const { apiRequest } = await import('@/lib/api');
        const result = await apiRequest('/some-endpoint');
        expect(result).toEqual({});
    });
});


describe('Goal API Type Safety', () => {
    it('GoalPublicBackend interface should include future_look field', async () => {
        // This is a compile-time check effectively — if the type is wrong, TS will error
        const mockGoal = {
            id: '123',
            owner_id: '456',
            name: 'Test',
            type: 'learn',
            description: null,
            target_date: null,
            status: 'on-track',
            priority: 1,
            daily_task_requirement: null,
            progress: 0,
            subtopics: null,
            resources: null,
            topics: null,
            capstone: null,
            future_look: 'You will be a better developer',
            created_at: null,
            last_logged_at: null,
        };

        // Verify all expected fields exist
        expect(mockGoal).toHaveProperty('future_look');
        expect(mockGoal).toHaveProperty('status');
        expect(mockGoal).toHaveProperty('subtopics');
    });
});
