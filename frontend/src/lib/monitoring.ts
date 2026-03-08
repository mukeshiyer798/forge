/**
 * Sentry + Session monitoring for the FORGE frontend.
 *
 * SESSION_ID: A UUID per browser tab, persisted in sessionStorage.
 * This is the cross-stack correlation key — sent to the backend
 * as x-session-id on every API request.
 */


const SESSION_KEY = 'app_session_id';

function generateSessionId(): string {
    return crypto.randomUUID();
}

/**
 * Get or create the session ID for this tab.
 */
export function getSessionId(): string {
    let id = sessionStorage.getItem(SESSION_KEY);
    if (!id) {
        id = generateSessionId();
        sessionStorage.setItem(SESSION_KEY, id);
    }
    return id;
}

/**
 * Initialize monitoring. Call once at app startup.
 */
export function initMonitoring(): void {
    const sessionId = getSessionId();
    // For now, we just ensure session id is in localStorage for logger use
    console.info(`[MONITORING] Correlation ID active: ${sessionId}`);
}
