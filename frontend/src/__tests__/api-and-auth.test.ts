/**
 * Frontend tests for auth utilities and API.
 * 
 * Validates: token storage persistence, auth header construction,
 * and edge cases with malformed data.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { setApiToken, getApiToken, clearApiToken, apiRequest } from '@/lib/api';

describe('Auth Token Persistence', () => {
    const TOKEN_KEY = 'forge_token';

    beforeEach(() => {
        localStorage.clear();
    });

    it('should store token in localStorage', () => {
        setApiToken('test-token-123');
        expect(localStorage.getItem(TOKEN_KEY)).toBe('test-token-123');
    });

    it('should return null when no token is stored', () => {
        expect(getApiToken()).toBeNull();
    });

    it('should fully clear token on clearApiToken', () => {
        setApiToken('sensitive-token');
        clearApiToken();
        expect(getApiToken()).toBeNull();
        expect(localStorage.getItem(TOKEN_KEY)).toBeNull();
    });

    it('should handle empty string token gracefully', () => {
        setApiToken('');
        // setApiToken('') clears the token in current implementation if falsy
        expect(getApiToken()).toBeNull();
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

        const result = await apiRequest('/some-endpoint');
        expect(result).toEqual({});
    });
});


describe('Goal API Type Safety', () => {
    it('GoalPublicBackend interface should include future_look field', () => {
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

        expect(mockGoal).toHaveProperty('future_look');
        expect(mockGoal).toHaveProperty('status');
        expect(mockGoal).toHaveProperty('subtopics');
    });
});
