/**
 * Defensive cleanup of stale browser-side caches.
 *
 * If a previous build of the app (or the hosting provider) registered a service
 * worker, it will keep serving cached responses indefinitely even after a
 * redeploy — which makes deploys look like they didn't land.
 *
 * The app now ships ONE service worker of its own, at /sw.js, purely to make
 * the PWA installable: Chrome will not fire beforeinstallprompt without a
 * registered worker that has a fetch handler. That worker deliberately caches
 * nothing, so the original problem cannot come back through it — but it must
 * not be unregistered here either, or the install prompt disappears.
 *
 * So: unregister every worker EXCEPT ours, and keep emptying Cache Storage.
 *
 * Safe to call once at app boot. Failures are intentionally swallowed:
 * cache cleanup is best-effort and must not block startup.
 */
export const APP_SW_PATH = '/sw.js';

export async function purgeStaleCaches(): Promise<void> {
  try {
    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(
        registrations
          .filter((reg) => {
            const url = reg.active?.scriptURL ?? reg.installing?.scriptURL ?? reg.waiting?.scriptURL ?? '';
            return !url.endsWith(APP_SW_PATH);
          })
          .map((reg) => reg.unregister()),
      );
    }
  } catch {
    // ignore
  }

  try {
    if (typeof caches !== 'undefined') {
      const keys = await caches.keys();
      await Promise.all(keys.map((key) => caches.delete(key)));
    }
  } catch {
    // ignore
  }
}

/**
 * Register the install-enabling worker. Runs after purgeStaleCaches so the two
 * never race over the same registration.
 */
export async function registerAppServiceWorker(): Promise<void> {
  if (!('serviceWorker' in navigator)) return;
  // A worker served over http:// on a non-localhost origin is rejected anyway;
  // skipping keeps dev consoles clean.
  if (location.protocol !== 'https:' && location.hostname !== 'localhost') return;
  try {
    await navigator.serviceWorker.register(APP_SW_PATH, { scope: '/' });
  } catch {
    // ignore — the app works fine, it just is not installable
  }
}
