import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { flushClientErrors, installClientErrorReporting, reportClientError, resetClientErrorsForTests, setReplayProvider } from './clientErrors';

let sent: { url: string; body: any; auth: string | null }[] = [];
beforeEach(() => {
    resetClientErrorsForTests();
    sent = [];
    localStorage.setItem('token', 'tok');
    vi.stubGlobal('fetch', vi.fn(async (url: string, init: RequestInit) => {
        sent.push({ url, body: JSON.parse(String(init.body)), auth: new Headers(init.headers).get('authorization') });
        return new Response(null, { status: 202 });
    }));
});
afterEach(() => { vi.unstubAllGlobals(); localStorage.removeItem('token'); });

describe('reporting the failed API calls', () => {
    it('sends failures in one batch with the session link, once a minute per failure', async () => {
        setReplayProvider(() => ({ sessionId: '99', url: 'https://replay.test/1/session/99' }));
        const t0 = 1_000_000;
        expect(reportClientError({ method: 'GET', path: '/api/users/me', status: 500, message: 'Erreur interne' }, t0)).toBe(true);
        expect(reportClientError({ method: 'GET', path: '/api/users/me', status: 500 }, t0 + 5_000)).toBe(false); // retry 5 s later
        expect(reportClientError({ method: 'POST', path: '/api/payments/intents', status: 0 }, t0 + 6_000)).toBe(true);
        expect(reportClientError({ method: 'GET', path: '/api/users/me', status: 500 }, t0 + 61_000)).toBe(true);
        await flushClientErrors();
        expect(sent).toHaveLength(1);
        expect(sent[0].url).toMatch(/\/support\/me\/client-errors$/);
        expect(sent[0].auth).toBe('Bearer tok');
        expect(sent[0].body.errors.map((e: any) => `${e.method} ${e.path} ${e.status}`)).toEqual(['GET /api/users/me 500', 'POST /api/payments/intents 0', 'GET /api/users/me 500']);
        expect(sent[0].body.errors[0].replay).toEqual({ sessionId: '99', url: 'https://replay.test/1/session/99' });
    });

    it('ignores an expired session (401), its own report call, non-API calls, and signed-out visitors', async () => {
        expect(reportClientError({ method: 'GET', path: '/api/users/me', status: 401 })).toBe(false);
        expect(reportClientError({ method: 'POST', path: '/api/support/me/client-errors', status: 500 })).toBe(false);
        expect(reportClientError({ method: 'GET', path: '/assets/logo.png', status: 404 })).toBe(false);
        localStorage.removeItem('token');
        expect(reportClientError({ method: 'GET', path: '/api/users/me', status: 500 })).toBe(false);
        await flushClientErrors();
        expect(sent).toEqual([]);
    });

    it('watches the app’s own fetch calls: a 500 is reported with the server’s code and message', async () => {
        vi.stubGlobal('fetch', vi.fn(async (url: string, init?: RequestInit) => {
            if (String(url).includes('client-errors')) { sent.push({ url, body: JSON.parse(String(init!.body)), auth: new Headers(init!.headers).get('authorization') }); return new Response(null, { status: 202 }); }
            return new Response(JSON.stringify({ success: false, message: 'Le prestataire ne répond pas', code: 'PROVIDER_DOWN' }), { status: 503, headers: { 'Content-Type': 'application/json' } });
        }));
        installClientErrorReporting();
        const r = await window.fetch('http://localhost:3000/api/payments/intents?amount=5000', { method: 'POST', body: '{"password":"x"}' });
        expect(r.status).toBe(503); // the app still gets its answer
        await new Promise((res) => setTimeout(res, 0));
        await flushClientErrors();
        expect(sent[0].body.errors).toEqual([{ method: 'POST', path: '/api/payments/intents', status: 503, code: 'PROVIDER_DOWN', message: 'Le prestataire ne répond pas' }]);
    });
});

