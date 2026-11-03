/**
 * Session Storage Utilities
 * Client-side session validation and cleanup
 */

export const SESSION_STORAGE_KEY = 'session_verified_at';
export const SESSION_CHECK_INTERVAL = 5 * 60 * 1000; // Check every 5 minutes

/**
 * Check if session verification is needed
 */
export function needsSessionCheck(): boolean {
  if (typeof window === 'undefined') return false;

  try {
    const lastCheck = sessionStorage.getItem(SESSION_STORAGE_KEY);
    if (!lastCheck) return true;

    const lastCheckTime = parseInt(lastCheck, 10);
    const now = Date.now();

    return (now - lastCheckTime) > SESSION_CHECK_INTERVAL;
  } catch {
    return true;
  }
}

/**
 * Mark session as verified
 */
export function markSessionVerified(): void {
  if (typeof window === 'undefined') return;

  try {
    sessionStorage.setItem(SESSION_STORAGE_KEY, Date.now().toString());
  } catch (error) {
    console.warn('[Session] Failed to mark session as verified:', error);
  }
}

/**
 * Clear session verification marker
 */
export function clearSessionVerification(): void {
  if (typeof window === 'undefined') return;

  try {
    sessionStorage.removeItem(SESSION_STORAGE_KEY);
  } catch (error) {
    console.warn('[Session] Failed to clear session verification:', error);
  }
}

/**
 * Verify session with server
 * Returns true if session is valid, false otherwise
 */
export async function verifySession(): Promise<boolean> {
  try {
    const response = await fetch('/api/auth/session-check', {
      method: 'GET',
      credentials: 'include',
    });

    if (response.ok) {
      const data = await response.json();
      if (data.valid) {
        markSessionVerified();
        return true;
      }
    }

    // Session invalid - clear markers and redirect to login
    clearSessionVerification();
    return false;
  } catch (error) {
    console.error('[Session] Failed to verify session:', error);
    return false;
  }
}
