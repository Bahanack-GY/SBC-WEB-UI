/**
 * Security plan Phase 9: the member session in HttpOnly cookies (server: SESSION_COOKIES=on).
 *
 * The app holds no token: the browser sends the `sbc_at` cookie to our own API, which the
 * gateway reads. What the app keeps is only:
 *   - `sbc_session` = 'cookie' in localStorage, meaning "signed in with cookies" (not a secret);
 *   - the `sbc_csrf` cookie (readable on purpose), echoed in X-CSRF-Token on every change.
 * Every own-API call says `X-SBC-Session: cookie`, so the sign-in answers set cookies instead of
 * returning a token. While the server has the switch off, it answers with a token as before
 * and the app keeps it in localStorage (apiHelpers.setToken): both work.
 *
 * The access cookie lasts 15 minutes; on a 401 the fetch wrapper (deviceSignals.ts) refreshes
 * once (`POST /users/session/refresh`, one at a time for the whole app) and sends the request
 * again. If the refresh is refused the session is over: `sbc:session-ended` is dispatched and
 * AuthContext signs out.
 */
import { isAccountBannedBody, reportAccountBanned } from '../components/security/accountBanned';

export const SESSION_FLAG_KEY = 'sbc_session';
export const CSRF_COOKIE = 'sbc_csrf';
export const SESSION_ENDED_EVENT = 'sbc:session-ended';

export function isCookieSession(): boolean {
  try { return localStorage.getItem(SESSION_FLAG_KEY) === 'cookie'; } catch { return false; }
}
export function markCookieSession(): void {
  try { localStorage.setItem(SESSION_FLAG_KEY, 'cookie'); } catch { /* the cookies still work for this page */ }
}
export function clearCookieSessionFlag(): void {
  try { localStorage.removeItem(SESSION_FLAG_KEY); } catch { /* ignore */ }
}

/** The double-submit value (readable cookie), or null. */
export function csrfToken(): string | null {
  try {
    for (const part of document.cookie.split(';')) {
      const i = part.indexOf('=');
      if (i > 0 && part.slice(0, i).trim() === CSRF_COOKIE) return decodeURIComponent(part.slice(i + 1).trim()) || null;
    }
  } catch { /* no document */ }
  return null;
}

export const isUnsafeMethod = (m: string) => !/^(GET|HEAD|OPTIONS)$/i.test(m);

/** Calls that must never trigger a refresh (sign-in steps, and the session routes themselves). */
export function isSessionEndpoint(url: string): boolean {
  try {
    const p = new URL(url, window.location.origin).pathname.toLowerCase();
    return /\/api\/users\/(login|register|verify-otp|resend-otp|session\/|request-password-reset|verify-password-reset-otp|reset-password)/.test(p);
  } catch {
    return false;
  }
}

let refreshing: Promise<boolean> | null = null;

/**
 * One refresh at a time for the whole app. True when new cookies were set. A refusal (401)
 * ends the session; a network failure does not (the next call tries again).
 */
export function refreshSession(baseUrl: string, fetchImpl: typeof fetch): Promise<boolean> {
  if (refreshing) return refreshing;
  refreshing = (async () => {
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json', 'X-SBC-Session': 'cookie' };
      const csrf = csrfToken();
      if (csrf) headers['X-CSRF-Token'] = csrf;
      const r = await fetchImpl(`${baseUrl.replace(/\/+$/, '')}/users/session/refresh`, {
        method: 'POST', credentials: 'same-origin', headers, body: '{}',
      });
      if (r.ok) return true;
      // The account was suspended (and its sessions ended): /compte-suspendu, not « session expirée ».
      if (r.status === 403) {
        const body = await r.clone().json().catch(() => null);
        if (isAccountBannedBody(r.status, body)) {
          clearCookieSessionFlag();
          reportAccountBanned((body as { message?: unknown }).message);
          return false;
        }
      }
      if (r.status === 401 || r.status === 404) {
        clearCookieSessionFlag();
        try { window.dispatchEvent(new Event(SESSION_ENDED_EVENT)); } catch { /* no window */ }
      }
      return false;
    } catch {
      return false;
    } finally {
      setTimeout(() => { refreshing = null; }, 0);
    }
  })();
  return refreshing;
}

/** For tests. */
export const _resetSession = () => { refreshing = null; };
