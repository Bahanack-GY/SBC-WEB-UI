import { describe, expect, it, vi } from 'vitest';
import { APP_SW_URL, purgeStaleCaches, registerAppServiceWorker } from './cacheBuster';

const worker = (scriptURL: string) => ({ active: { scriptURL }, unregister: vi.fn() });

const stubServiceWorker = (registrations: ReturnType<typeof worker>[]) => {
  const register = vi.fn().mockResolvedValue({});
  Object.defineProperty(navigator, 'serviceWorker', {
    configurable: true,
    value: { getRegistrations: vi.fn().mockResolvedValue(registrations), register },
  });
  return register;
};

describe('the app service worker', () => {
  // A fixed /sw.js sat in Cloudflare's cache for weeks, so phones ran a worker
  // without the push handler. The URL now changes with every build.
  it('is registered under a URL that changes with the build', async () => {
    const register = stubServiceWorker([]);
    await registerAppServiceWorker();
    expect(APP_SW_URL).toMatch(/^\/sw\.js\?v=.+/);
    expect(register).toHaveBeenCalledWith(APP_SW_URL, { scope: '/' });
  });

  it('survives the cleanup whatever build it came from — unregistering it would drop every push subscription', async () => {
    const ours = [worker('https://sniperbuisnesscenter.com/sw.js'), worker('https://sniperbuisnesscenter.com/sw.js?v=old')];
    const stranger = worker('https://sniperbuisnesscenter.com/firebase-messaging-sw.js');
    stubServiceWorker([...ours, stranger]);

    await purgeStaleCaches();

    ours.forEach(w => expect(w.unregister).not.toHaveBeenCalled());
    expect(stranger.unregister).toHaveBeenCalled();
  });
});
