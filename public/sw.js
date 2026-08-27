/* Minimal service worker.
   Chrome will not fire beforeinstallprompt unless a service worker with a
   fetch handler is registered, so this exists to make the app installable.
   It deliberately does NOT cache: this app is API-driven and a stale
   app-shell cache caused real problems before (see utils/cacheBuster.ts).
   Add precaching only when someone actually wants offline support. */
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));
self.addEventListener('fetch', () => { /* pass through to the network */ });
