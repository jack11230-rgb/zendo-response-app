// Zendo Response TEST service worker: offline shell + notifications.
const CACHE = 'zr-test-v2';
const SHELL = ['/', '/app.css', '/app.js', '/admin.js', '/icons.js', '/resources.js', '/manifest.webmanifest', '/icons/icon-192.png',
  '/vendor/leaflet/leaflet.js', '/vendor/leaflet/leaflet.css', '/socket.io/socket.io.min.js',
  '/fonts/inter/files/inter-latin-400-normal.woff2', '/fonts/inter/files/inter-latin-600-normal.woff2', '/fonts/inter/files/inter-latin-700-normal.woff2',
  '/fonts/poppins/files/poppins-latin-600-normal.woff2'];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).catch(() => {}).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.origin !== location.origin || u.pathname.startsWith('/api') || u.pathname.startsWith('/socket.io/') && u.search) return;
  // network first, fall back to cache (keeps test builds fresh after redeploys)
  e.respondWith(fetch(e.request).then(r => {
    if (r.ok) { const c = r.clone(); caches.open(CACHE).then(cc => cc.put(e.request, c)); }
    return r;
  }).catch(() => caches.match(e.request).then(r => r || (e.request.mode === 'navigate' ? caches.match('/') : Response.error()))));
});
self.addEventListener('notificationclick', e => {
  e.notification.close();
  const link = (e.notification.data && e.notification.data.link) || '#/home';
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(cs => {
    for (const c of cs) { c.postMessage({ nav: link }); return c.focus(); }
    return self.clients.openWindow('/' + link);
  }));
});
