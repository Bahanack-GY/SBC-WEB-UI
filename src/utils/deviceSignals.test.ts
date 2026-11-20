import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DEVICE_ID_KEY, deviceId, installDeviceSignals, isOwnApi } from './deviceSignals';

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

  it('never adds them to other sites (no CORS preflight elsewhere)', async () => {
    await window.fetch('https://media.sniperbuisnesscenter.com/x.png');
    await window.fetch(`${window.location.origin}/assets/app.js`);
    expect(calls.every(c => !c.headers.has('X-SBC-Device'))).toBe(true);
    expect(isOwnApi('https://evil.example/api/users')).toBe(false);
  });

  it('is installed once', () => {
    const f = window.fetch;
    installDeviceSignals();
    expect(window.fetch).toBe(f);
  });
});
