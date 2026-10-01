/* Minimal service worker.
   Chrome will not fire beforeinstallprompt unless a service worker with a
   fetch handler is registered, so this exists to make the app installable.
   It deliberately does NOT cache: this app is API-driven and a stale
   app-shell cache caused real problems before (see utils/cacheBuster.ts).
   Add precaching only when someone actually wants offline support.

   It also shows web push notifications (relance alerts) and opens the app
   on the right page when one is tapped. */
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));
self.addEventListener('fetch', () => { /* pass through to the network */ });

self.addEventListener('push', (event) => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch { data = { body: event.data && event.data.text() }; }
  event.waitUntil(self.registration.showNotification(data.title || 'SBC', {
    body: data.body || '',
    icon: '/pwa-192.png',
    badge: '/pwa-192.png',
    tag: data.tag,
    data: { url: data.url || '/' },
  }));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = new URL((event.notification.data && event.notification.data.url) || '/', self.location.origin).href;
  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    const open = windows.find((w) => w.url.startsWith(self.location.origin));
    if (open) {
      await open.focus();
      if ('navigate' in open) await open.navigate(url);
      return;
    }
    await self.clients.openWindow(url);
  })());
});
