import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DEVICE_ID_KEY, clientKind, deviceId, installDeviceSignals, isOwnApi } from './deviceSignals';

describe('device signals (Security plan Phase 1)', () => {
  const realFetch = window.fetch;
  let calls: { url: string; headers: Headers }[] = [];

  beforeEach(() => {
    localStorage.clear();
    calls = [];
    window.fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      calls.push({ url: String(input), headers: new Headers(init?.headers) });
      return new Response('{}');
    }) as typeof window.fetch;
    installDeviceSignals();
  });
  afterEach(() => { window.fetch = realFetch; });

  it('creates one random device ID and keeps it', () => {
    const a = deviceId();
    expect(a).toMatch(/^[A-Za-z0-9-]{8,64}$/);
    expect(deviceId()).toBe(a);
    expect(localStorage.getItem(DEVICE_ID_KEY)).toBe(a);
  });

  it('adds the device ID and client to our own API calls, keeping the other headers', async () => {
    await window.fetch(`${window.location.origin}/api/users/me`, { headers: { Authorization: 'Bearer t' } });
    await window.fetch('/api/transactions/history');
    expect(calls[0].headers.get('X-SBC-Device')).toBe(localStorage.getItem(DEVICE_ID_KEY));
    expect(calls[0].headers.get('X-SBC-Client')).toBe('web');
    expect(calls[0].headers.get('Authorization')).toBe('Bearer t');
    expect(calls[1].headers.get('X-SBC-Client')).toBe('web');
  });

  it('says app when SBC runs from the home screen (Phase 11 web/app split)', async () => {
    const realMatch = window.matchMedia;
    window.matchMedia = ((q: string) => ({ matches: q === '(display-mode: standalone)', media: q, addEventListener() {}, removeEventListener() {} })) as unknown as typeof window.matchMedia;
    try {
      expect(clientKind()).toBe('app');
      await window.fetch('/api/users/register', { method: 'POST' });
      expect(calls.find(c => c.url.endsWith('/api/users/register'))?.headers.get('X-SBC-Client')).toBe('app');
    } finally {
      window.matchMedia = realMatch;
    }
    expect(clientKind()).toBe('web');
  });

  it('never adds them to other sites (no CORS preflight elsewhere)', async () => {
    await window.fetch('https://media.sniperbuisnesscenter.com/x.png');
    await window.fetch(`${window.location.origin}/assets/app.js`);
    expect(calls.every(c => !c.headers.has('X-SBC-Device'))).toBe(true);
    expect(isOwnApi('https://evil.example/api/users')).toBe(false);
  });

  it('Phase 9: signs our API calls when this browser holds the key; a closing-page (keepalive) call goes unsigned at once', async () => {
    const { webcrypto } = await import('node:crypto');
    const signing = await import('./requestSigning');
    const data = new Map<string, unknown>();
    const store = {
      get: (k: string) => { const r: any = {}; setTimeout(() => { r.result = data.get(k); r.onsuccess?.(); }); return r; },
      put: (v: unknown, k: string) => { data.set(k, v); },
    };
    const dbObj = { createObjectStore: () => store, transaction: () => { const tx: any = { objectStore: () => store }; setTimeout(() => tx.oncomplete?.()); return tx; } };
    vi.stubGlobal('indexedDB', { open: () => { const r: any = { result: dbObj }; setTimeout(() => { r.onupgradeneeded?.(); r.onsuccess?.(); }); return r; } });
    if (!globalThis.crypto?.subtle) vi.stubGlobal('crypto', webcrypto);
    try {
      signing._resetSigning();
      await signing.prepareSignInKey();
      await signing.adoptSignInKey('tok-9');
      await window.fetch('/api/users/me', { headers: { Authorization: 'Bearer tok-9' } });
      expect(calls[0].headers.get('X-SBC-Signature')).toMatch(/^v1;t=\d{13};n=.+;b=[a-f0-9]{64};s=.+$/);
      await window.fetch('/api/users/me', { headers: { Authorization: 'Bearer tok-9' }, keepalive: true });
      expect(calls[1].headers.has('X-SBC-Signature')).toBe(false);
      await window.fetch('https://media.sniperbuisnesscenter.com/x.png', { headers: { Authorization: 'Bearer tok-9' } });
      expect(calls[2].headers.has('X-SBC-Signature')).toBe(false);
    } finally {
      signing._resetSigning();
      vi.unstubAllGlobals();
    }
  });

  it('is installed once', () => {
    const f = window.fetch;
    installDeviceSignals();
    expect(window.fetch).toBe(f);
  });
});
