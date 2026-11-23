import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
declare const __APP_BUILD__: string;
import { __resetForTests, checkForUpdate, fetchLatestBuild, onRouteChange, reloadForUpdate, updateReady } from './appUpdate';

const fakeFetch = (body: unknown, ok = true) => vi.fn(async () => ({ ok, json: async () => body })) as unknown as typeof fetch;

describe('app update', () => {
  const reload = vi.fn();
  beforeEach(() => {
    __resetForTests();
    sessionStorage.clear();
    reload.mockReset();
    Object.defineProperty(window, 'location', { configurable: true, value: { ...window.location, reload } });
  });
  afterEach(() => vi.restoreAllMocks());

  it('reads the build id, never cached', async () => {
    const f = fakeFetch({ build: 'abc' });
    expect(await fetchLatestBuild(f)).toBe('abc');
    const [url, opts] = (f as unknown as { mock: { calls: [string, RequestInit][] } }).mock.calls[0];
    expect(url).toMatch(/^\/version\.json\?t=\d+$/);
    expect(opts).toEqual({ cache: 'no-store' });
  });

  it('unknown when the file is missing or not JSON (dev server serves index.html)', async () => {
    expect(await fetchLatestBuild(fakeFetch(null, false))).toBeNull();
    const notJson = vi.fn(async () => ({ ok: true, json: async () => { throw new Error('html'); } })) as unknown as typeof fetch;
    expect(await fetchLatestBuild(notJson)).toBeNull();
    expect(updateReady()).toBe(false);
  });

  it('a newer build reloads on a page change without state, not with state', async () => {
    expect(await checkForUpdate(fakeFetch({ build: 'newer-build' }))).toBe(true);
    onRouteChange(true); // e.g. /otp with the withdrawal id in location.state
    expect(reload).not.toHaveBeenCalled();
    onRouteChange(false);
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it('the same build never reloads', async () => {
    expect(await checkForUpdate(fakeFetch({ build: __APP_BUILD__ }))).toBe(false);
    onRouteChange(false);
    expect(reload).not.toHaveBeenCalled();
  });

  it('no reload loop: once per build per minute', () => {
    expect(reloadForUpdate('server')).toBe(true);
    expect(reloadForUpdate('server')).toBe(false);
    expect(reload).toHaveBeenCalledTimes(1);
  });
});
