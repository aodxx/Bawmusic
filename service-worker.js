/* ==========================================================================
   Bawmusic — Service Worker
   Cache-first for static shell assets, network-first for API calls.
   ========================================================================== */

const CACHE_NAME = 'bawmusic-cache-v1';
const APP_SHELL = [
  './',
  './index.html',
  './manifest.json',
  './assets/css/style.css',
  './assets/js/app.js',
  './assets/js/api.js',
  './assets/icons/icon-192.png',
  './assets/icons/icon-512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Never cache calls to the Google Apps Script backend — always go to network.
  if (url.hostname.includes('script.google.com') || req.method !== 'GET') {
    event.respondWith(fetch(req).catch(() => new Response(
      JSON.stringify({ ok: false, error: 'ออฟไลน์ — ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้' }),
      { headers: { 'Content-Type': 'application/json' } }
    )));
    return;
  }

  // App shell & static assets: cache-first, falling back to network.
  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req).then((res) => {
        if (res.ok && url.origin === location.origin) {
          const clone = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, clone));
        }
        return res;
      }).catch(() => caches.match('./index.html'));
    })
  );
});
