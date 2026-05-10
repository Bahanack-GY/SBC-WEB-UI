/**
 * Defensive cleanup of stale browser-side caches.
 *
 * If a previous build of the app ever registered a service worker (or the
 * hosting provider did), it will keep serving cached responses indefinitely
 * even after we've redeployed — which makes deploys look like they didn't
 * land. We never use service workers, so unregister anything we find and
 * empty the Cache Storage on every load.
 *
 * Safe to call once at app boot. Failures are intentionally swallowed:
 * cache cleanup is best-effort and must not block startup.
 */
export async function purgeStaleCaches(): Promise<void> {
  try {
    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map(reg => reg.unregister()));
    }
  } catch {
    // ignore
  }

  try {
    if (typeof caches !== 'undefined') {
      const keys = await caches.keys();
      await Promise.all(keys.map(key => caches.delete(key)));
    }
  } catch {
    // ignore
  }
}
