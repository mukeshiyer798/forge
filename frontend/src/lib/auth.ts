const TOKEN_KEY = 'forge_access_token';

// SECURITY: Using sessionStorage instead of localStorage to mitigate XSS risks.
// sessionStorage is scoped to the browser tab and is cleared when the tab closes,
// preventing persistent token theft. Combined with short-lived tokens (60 min)
// and auto-refresh rotation, this provides reasonable security.

export function getAccessToken(): string | null {
  return sessionStorage.getItem(TOKEN_KEY);
}

export function setAccessToken(token: string): void {
  sessionStorage.setItem(TOKEN_KEY, token);
}

export function clearAccessToken(): void {
  sessionStorage.removeItem(TOKEN_KEY);
}

export function getAuthHeaders(): Record<string, string> {
  const token = getAccessToken();
  if (!token) return {};
  return {
    Authorization: `Bearer ${token}`,
  };
}
