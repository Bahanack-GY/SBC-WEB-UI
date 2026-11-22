import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { webcrypto } from 'node:crypto';
import { createChallenge, verifySolution } from 'altcha-lib';
import { deriveKey } from 'altcha-lib/algorithms/web/sha';
import { _resetRobotCheck, isProtectedAction, prepareRobotAnswer, shouldPrepareOn, takeRobotAnswer } from './robotCheck';
import { installDeviceSignals } from './deviceSignals';

const KEY = 'k'.repeat(48);
const decode = (h: string) => JSON.parse(atob(h));

describe('anti-robot check (Security plan Phase 9 rule 3, ALTCHA)', () => {
  const realFetch = window.fetch;
  let calls: { url: string; method: string; headers: Headers }[] = [];
  let challengeStatus = 200;
  let refuseOnce = false;

  beforeEach(() => {
    vi.stubGlobal('crypto', webcrypto);
    _resetRobotCheck();
    calls = [];
    challengeStatus = 200;
    refuseOnce = false;
    window.fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      calls.push({ url, method: init?.method ?? 'GET', headers: new Headers(init?.headers) });
      if (url.endsWith('/api/altcha/challenge')) {
        if (challengeStatus === 204) return new Response(null, { status: 204 });
        // as the gateway makes it: small range so the test is quick
        const c = await createChallenge({ algorithm: 'SHA-256', cost: 1, counter: 300, deriveKey, hmacSignatureSecret: KEY, hmacKeySignatureSecret: `${KEY}:key`, expiresAt: Math.floor(Date.now() / 1000) + 600 });
        return new Response(JSON.stringify(c), { headers: { 'content-type': 'application/json' } });
      }
      if (refuseOnce) { refuseOnce = false; return new Response(JSON.stringify({ code: 'ROBOT_CHECK_FAILED' }), { status: 403 }); }
      return new Response('{}');
    }) as typeof window.fetch;
    installDeviceSignals();
  });
  afterEach(() => { window.fetch = realFetch; vi.unstubAllGlobals(); });

  it('knows the protected actions and the pages that lead to them', () => {
    expect(isProtectedAction('POST', '/api/users/login')).toBe(true);
    expect(isProtectedAction('post', `${window.location.origin}/api/transactions/withdrawal/initiate/`)).toBe(true);
    expect(isProtectedAction('POST', '/api/support/public/tickets')).toBe(true);
    expect(isProtectedAction('GET', '/api/users/login')).toBe(false);
    expect(isProtectedAction('POST', '/api/users/verify-otp')).toBe(false);
    expect(shouldPrepareOn('/connexion')).toBe(true);
    expect(shouldPrepareOn('/signaler-un-probleme')).toBe(true);
    expect(shouldPrepareOn('/wallet')).toBe(true);
    expect(shouldPrepareOn('/aide/retraits')).toBe(false);
  });

  it('solves an answer the gateway accepts, and uses each answer once', async () => {
    const h = await takeRobotAnswer();
    expect(h).toBeTruthy();
    const { challenge, solution } = decode(h!);
    const r = await verifySolution({ challenge, solution, deriveKey, hmacSignatureSecret: KEY, hmacKeySignatureSecret: `${KEY}:key` });
    expect(r.verified).toBe(true);
    const h2 = await takeRobotAnswer();
    expect(h2).not.toBe(h);
  });

  it('a prepared answer is used at once, without asking for a new challenge', async () => {
    prepareRobotAnswer();
    await vi.waitFor(() => expect(calls.filter(c => c.url.endsWith('/altcha/challenge')).length).toBe(1));
    await new Promise(r => setTimeout(r, 200));
    const before = calls.length;
    expect(await takeRobotAnswer()).toBeTruthy();
    // the next one starts solving only when needed
    expect(calls.length).toBe(before);
  });

  it('check off on the server (204): nothing sent, not asked again for a while', async () => {
    challengeStatus = 204;
    expect(await takeRobotAnswer()).toBeNull();
    expect(await takeRobotAnswer()).toBeNull();
    expect(calls.filter(c => c.url.endsWith('/altcha/challenge')).length).toBe(1);
    await window.fetch('/api/users/login', { method: 'POST', body: '{}' });
    expect(calls.at(-1)?.headers.has('X-SBC-Altcha')).toBe(false);
  });

  it('the fetch wrapper adds the answer to protected actions only', async () => {
    await window.fetch('/api/users/login', { method: 'POST', body: '{"email":"a"}' });
    const login = calls.find(c => c.url === '/api/users/login')!;
    expect(login.headers.get('X-SBC-Altcha')).toBeTruthy();
    expect(calls.find(c => c.url.endsWith('/altcha/challenge'))?.headers.has('X-SBC-Device')).toBe(false); // raw fetch
    await window.fetch('/api/users/verify-otp', { method: 'POST', body: '{}' });
    expect(calls.find(c => c.url === '/api/users/verify-otp')?.headers.has('X-SBC-Altcha')).toBe(false);
  });

  it('enforce mode refused it (expired, used): one retry with a fresh answer', async () => {
    refuseOnce = true;
    const res = await window.fetch('/api/users/register', { method: 'POST', body: '{}' });
    expect(res.status).toBe(200);
    const sends = calls.filter(c => c.url === '/api/users/register');
    expect(sends.length).toBe(2);
    expect(sends[0].headers.get('X-SBC-Altcha')).not.toBe(sends[1].headers.get('X-SBC-Altcha'));
  });
});
