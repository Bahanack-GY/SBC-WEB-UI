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

// The SBC icon, inline. Chrome fetches a notification icon on its own, without
// the page's cookies, and through Cloudflare that fetch failed: Android showed
// a grey "P" (for preprod) instead. Inline, nothing has to load.
const SBC_ICON = 'data:image/png;base64,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';

// A sender's or group's photo, fetched here and inlined, for the same reason
// SBC_ICON is inline. Same-origin paths (/api/settings/files/<id>?w=128) work
// best: a small resized copy, and no CORS. Anything that fails falls back to SBC.
async function inlineIcon(url) {
  if (!url) return SBC_ICON;
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 3000);
    const res = await fetch(new URL(url, self.location.origin).href, { signal: ctrl.signal });
    clearTimeout(timer);
    const type = (res.headers.get('content-type') || '').split(';')[0];
    if (!res.ok || !type.startsWith('image/')) return SBC_ICON;
    const bytes = new Uint8Array(await res.arrayBuffer());
    if (bytes.length > 300000) return SBC_ICON;
    let bin = '';
    for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
    return `data:${type};base64,${btoa(bin)}`;
  } catch {
    return SBC_ICON;
  }
}

self.addEventListener('push', (event) => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch { data = { body: event.data && event.data.text() }; }
  event.waitUntil((async () => {
    // Already reading this conversation: the message is on screen, no buzz.
    if (data.tag && String(data.tag).startsWith('chat-')) {
      const target = new URL(data.url || '/', self.location.origin).href;
      const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      if (windows.some((w) => w.focused && w.url === target)) return;
    }
    // Open windows refresh the bell's count right away.
    const open = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    open.forEach((w) => w.postMessage({ type: 'sbc-push' }));
    await self.registration.showNotification(data.title || 'SBC', {
      body: data.body || '',
      icon: await inlineIcon(data.icon),
      tag: data.tag,
      // A new chat message replaces the conversation's previous one — and still buzzes.
      renotify: !!(data.renotify && data.tag),
      data: { url: data.url || '/' },
    });
  })());
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
