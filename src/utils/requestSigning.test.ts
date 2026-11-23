import { createHash, createPublicKey, verify as nodeVerify, webcrypto } from 'node:crypto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  _resetSigning, adoptSignInKey, clearSessionKey, COOKIE_AUTH, ensureSessionKey, prepareSignInKey, retagKeyForCookieSession, signatureFor,
} from './requestSigning';

/** Minimal in-memory IndexedDB: open / get / put, enough for requestSigning. */
function fakeIndexedDB() {
  const data = new Map<string, unknown>();
  const store = {
    get: (k: string) => { const r: any = {}; setTimeout(() => { r.result = data.get(k); r.onsuccess?.(); }); return r; },
    put: (v: unknown, k: string) => { data.set(k, v); },
  };
  const dbObj = {
    createObjectStore: () => store,
    transaction: () => { const tx: any = { objectStore: () => store }; setTimeout(() => tx.oncomplete?.()); return tx; },
  };
  return { open: () => { const r: any = { result: dbObj }; setTimeout(() => { r.onupgradeneeded?.(); r.onsuccess?.(); }); return r; } };
}

/** What the gateway does (browser-checks.middleware.ts). */
function gatewayVerifies(spki: string, method: string, pathAndQuery: string, header: string): boolean {
  const f: Record<string, string> = {};
  for (const part of header.split(';')) { const i = part.indexOf('='); if (i > 0) f[part.slice(0, i)] = part.slice(i + 1); }
  const text = `v1\n${method}\n${pathAndQuery}\n${f.t}\n${f.n}\n${f.b}`;
  const key = createPublicKey({ key: Buffer.from(spki, 'base64'), format: 'der', type: 'spki' });
  return nodeVerify('sha256', Buffer.from(text), { key, dsaEncoding: 'ieee-p1363' }, Buffer.from(f.s, 'base64url'));
}
const fields = (h: string) => Object.fromEntries(h.split(';').slice(1).map(p => p.split('=') as [string, string]));

beforeEach(() => {
  _resetSigning();
  vi.stubGlobal('indexedDB', fakeIndexedDB());
  if (!globalThis.crypto?.subtle) vi.stubGlobal('crypto', webcrypto);
});
afterEach(() => { vi.unstubAllGlobals(); });

describe('request signing (Security plan Phase 9)', () => {
  it('signs with the sign-in key; the gateway-side check accepts it, path, query and body included', async () => {
    const spki = await prepareSignInKey();
    expect(spki).toMatch(/^[A-Za-z0-9+/=]{80,}$/);
    await adoptSignInKey('tok-1');
    const body = JSON.stringify({ amount: 5000 });
    const h = await signatureFor('post', '/api/withdrawals/initiate?x=1', 'Bearer tok-1', body);
    expect(h).toMatch(/^v1;t=\d{13};n=[A-Za-z0-9_-]{24};b=[a-f0-9]{64};s=[A-Za-z0-9_-]{86}$/);
    expect(fields(h!).b).toBe(createHash('sha256').update(body).digest('hex'));
    expect(gatewayVerifies(spki!, 'POST', '/api/withdrawals/initiate?x=1', h!)).toBe(true);
    expect(gatewayVerifies(spki!, 'POST', '/api/withdrawals/initiate?x=2', h!)).toBe(false);
    // each request has its own nonce
    const h2 = await signatureFor('GET', '/api/users/me', 'Bearer tok-1', undefined);
    expect(fields(h2!).n).not.toBe(fields(h!).n);
    expect(fields(h2!).b).toBe(createHash('sha256').update('').digest('hex'));
  });

  it('uploads are signed without their body; another token, or no token, is not signed', async () => {
    await prepareSignInKey();
    await adoptSignInKey('tok-1');
    const fd = new FormData();
    fd.append('file', new Blob(['x']), 'a.png');
    expect(fields((await signatureFor('POST', '/api/settings/files/upload', 'Bearer tok-1', fd))!).b).toBe('UNSIGNED');
    expect(await signatureFor('GET', '/api/users/me', 'Bearer other-token', undefined)).toBeNull();
    expect(await signatureFor('GET', '/api/users/me', null, undefined)).toBeNull();
  });

  it('Phase 9 cookie session: the key signs without any token; a Bearer request is not signed with it', async () => {
    await prepareSignInKey();
    await adoptSignInKey(null);
    expect(fields((await signatureFor('PUT', '/api/users/me', COOKIE_AUTH, '{}'))!).b).toMatch(/^[a-f0-9]{64}$/);
    expect(await signatureFor('GET', '/api/users/me', 'Bearer tok-1', undefined)).toBeNull();
  });

  it('Phase 9: a token moved to a cookie session keeps its key (retag)', async () => {
    await prepareSignInKey();
    await adoptSignInKey('tok-1');
    await retagKeyForCookieSession('tok-1');
    expect(await signatureFor('GET', '/api/users/me', COOKIE_AUTH, undefined)).toMatch(/^v1;/);
  });

  it('logout forgets the key', async () => {
    await prepareSignInKey();
    await adoptSignInKey('tok-1');
    await clearSessionKey();
    expect(await signatureFor('GET', '/api/users/me', 'Bearer tok-1', undefined)).toBeNull();
  });

  it('a browser without IndexedDB says so instead of signing', async () => {
    vi.stubGlobal('indexedDB', undefined);
    expect(await prepareSignInKey()).toBeNull();
    expect(await signatureFor('GET', '/api/users/me', 'Bearer tok-1', undefined)).toBe('none;r=noidb');
  });

  it('a token from before signing binds a key once (201), and does not sign when the server already has one (409)', async () => {
    let sent: any = null;
    const ok = vi.fn(async (_u: string, init: RequestInit) => { sent = JSON.parse(String(init.body)); return new Response('{}', { status: 201 }); });
    await ensureSessionKey('old-token', 'https://x.test/api', ok as unknown as typeof fetch);
    expect(ok).toHaveBeenCalledWith('https://x.test/api/users/me/session-key', expect.objectContaining({ method: 'POST' }));
    const h = await signatureFor('GET', '/api/users/me', 'Bearer old-token', undefined);
    expect(gatewayVerifies(sent.publicKey, 'GET', '/api/users/me', h!)).toBe(true);
    await ensureSessionKey('old-token', 'https://x.test/api', ok as unknown as typeof fetch);
    expect(ok).toHaveBeenCalledTimes(1); // already bound in this browser

    _resetSigning();
    vi.stubGlobal('indexedDB', fakeIndexedDB());
    const taken = vi.fn(async () => new Response('{}', { status: 409 }));
    await ensureSessionKey('stolen-token', 'https://x.test/api', taken as unknown as typeof fetch);
    expect(await signatureFor('GET', '/api/users/me', 'Bearer stolen-token', undefined)).toBeNull();
  });
});
