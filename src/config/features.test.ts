import { afterEach, describe, expect, it, vi } from 'vitest';

async function visibleOn(hostname: string) {
  vi.resetModules();
  vi.stubGlobal('location', { ...window.location, hostname });
  return (await import('./features')).RELANCE_VISIBLE;
}

afterEach(() => vi.unstubAllGlobals());

describe('relance visibility', () => {
  it('is hidden on production', async () => {
    expect(await visibleOn('sniperbuisnesscenter.com')).toBe(false);
    expect(await visibleOn('www.sniperbuisnesscenter.com')).toBe(false);
  });

  it('stays on preprod and in local dev, where it is reviewed', async () => {
    expect(await visibleOn('preprod.sniperbuisnesscenter.com')).toBe(true);
    expect(await visibleOn('localhost')).toBe(true);
  });
});
