import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { installDeviceSignals } from './deviceSignals';
import { _resetSession, csrfToken, isCookieSession, markCookieSession, refreshSession, SESSION_ENDED_EVENT } from './session';
import { hasSession } from './apiHelpers';

/** Security plan Phase 9: the member session in HttpOnly cookies, as the app sees it. */
describe('cookie session (Security plan Phase 9)', () => {
  const realFetch = window.fetch;
  let calls: { url: string; method: string; headers: Headers }[] = [];
  let answers: ((url: string, n: number) => Response)[] = [];

  const clearCookies = () => document.cookie.split(';').forEach(c => {
    const k = c.split('=')[0].trim();
    if (k) document.cookie = `${k}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
  });

  beforeEach(() => {
    localStorage.clear();
    clearCookies();
    _resetSession();
    calls = [];
    answers = [];
    window.fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      calls.push({ url, method: String(init?.method ?? 'GET').toUpperCase(), headers: new Headers(init?.headers) });
      const next = answers.shift();
      return next ? next(url, calls.length) : new Response('{}', { status: 200 });
    }) as typeof window.fetch;
    installDeviceSignals();
  });
  afterEach(() => { window.fetch = realFetch; clearCookies(); });

  it('every own-API call asks for a cookie session; a change carries the CSRF cookie value', async () => {
    document.cookie = 'sbc_csrf=abc123; path=/';
    markCookieSession();
    await window.fetch('/api/users/me');
    await window.fetch('/api/users/me', { method: 'PUT', body: '{}' });
    expect(calls[0].headers.get('X-SBC-Session')).toBe('cookie');
    expect(calls[0].headers.has('X-CSRF-Token')).toBe(false); // GET: nothing to protect
    expect(calls[1].headers.get('X-CSRF-Token')).toBe('abc123');
    expect(calls.every(c => !c.headers.has('Authorization'))).toBe(true);
  });

  it('an app holding a Bearer token sends no CSRF (not cookie-authenticated)', async () => {
    document.cookie = 'sbc_csrf=abc123; path=/';
    await window.fetch('/api/users/me', { method: 'PUT', body: '{}', headers: { Authorization: 'Bearer t' } });
    expect(calls[0].headers.has('X-CSRF-Token')).toBe(false);
    expect(calls[0].headers.get('Authorization')).toBe('Bearer t');
  });

  it('a 401 on a cookie session refreshes once and sends the request again', async () => {
    markCookieSession();
    document.cookie = 'sbc_csrf=abc123; path=/';
    answers = [
      () => new Response('{"message":"Token expired"}', { status: 401 }),
      () => new Response('{"success":true}', { status: 200 }), // refresh
      () => new Response('{"ok":1}', { status: 200 }),          // the request again
    ];
    const r = await window.fetch('/api/users/me', { method: 'PUT', body: '{"a":1}' });
    expect(r.status).toBe(200);
    expect(calls.map(c => `${c.method} ${new URL(c.url, window.location.origin).pathname}`)).toEqual([
      'PUT /api/users/me', 'POST /api/users/session/refresh', 'PUT /api/users/me',
    ]);
    expect(calls[1].headers.get('X-CSRF-Token')).toBe('abc123');
    expect(calls[2].headers.get('X-CSRF-Token')).toBe('abc123');
  });

  it('many 401s at once share ONE refresh', async () => {
    markCookieSession();
    let refreshes = 0;
    window.fetch = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('/session/refresh')) { refreshes++; await new Promise(r => setTimeout(r, 20)); return new Response('{}', { status: 200 }); }
      calls.push({ url, method: 'GET', headers: new Headers() });
      return new Response('{}', { status: calls.filter(c => c.url === url).length === 1 ? 401 : 200 });
    }) as typeof window.fetch;
    installDeviceSignals();
    const rs = await Promise.all(['/api/a', '/api/b', '/api/c'].map(u => window.fetch(u)));
    expect(rs.map(r => r.status)).toEqual([200, 200, 200]);
    expect(refreshes).toBe(1);
  });

  it('a refused refresh ends the session: flag cleared, event sent, the 401 returned', async () => {
    markCookieSession();
    const ended = vi.fn();
    window.addEventListener(SESSION_ENDED_EVENT, ended);
    answers = [
      () => new Response('{}', { status: 401 }),
      () => new Response('{"code":"SESSION_ENDED"}', { status: 401 }),
    ];
    const r = await window.fetch('/api/users/me');
    window.removeEventListener(SESSION_ENDED_EVENT, ended);
    expect(r.status).toBe(401);
    expect(ended).toHaveBeenCalledTimes(1);
    expect(isCookieSession()).toBe(false);
    expect(hasSession()).toBe(false);
  });

  it('never refreshes on sign-in steps, nor without a cookie session', async () => {
    markCookieSession();
    answers = [() => new Response('{}', { status: 401 })];
    await window.fetch('/api/users/verify-otp', { method: 'POST', body: '{}' });
    localStorage.clear();
    answers = [() => new Response('{}', { status: 401 })];
    await window.fetch('/api/users/me');
    expect(calls.some(c => c.url.includes('/session/refresh'))).toBe(false);
  });

  it('a network failure during refresh does not end the session', async () => {
    markCookieSession();
    const ok = await refreshSession('/api', (async () => { throw new TypeError('Failed to fetch'); }) as unknown as typeof fetch);
    expect(ok).toBe(false);
    expect(isCookieSession()).toBe(true);
  });

  it('reads the CSRF cookie among others', () => {
    document.cookie = 'a=1; path=/';
    document.cookie = 'sbc_csrf=x%2By; path=/';
    expect(csrfToken()).toBe('x+y');
  });
});
