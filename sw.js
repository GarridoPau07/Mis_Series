// Service Worker: App Shell offline. Sube VERSION al publicar cambios.
const VERSION = 'v5';
const CACHE = 'mis-series-' + VERSION;
const SHELL = ['./', 'index.html', 'manifest.json', 'css/styles.css',
  'js/app.js', 'js/db.js', 'js/api.js', 'js/ui.js',
  'icons/icon-180.png', 'icons/icon-192.png', 'icons/icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(ks => Promise.all(ks.filter(k => k.startsWith('mis-series-') && k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  // APIs externas (AniList / TMDB) y carátulas: directo a red, sin intervenir.
  if (e.request.method !== 'GET' || url.origin !== location.origin) return;
  // App Shell: primero caché.
  e.respondWith(caches.match(e.request).then(r => r || fetch(e.request)).catch(() => caches.match('index.html')));
});