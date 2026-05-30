const CACHE = 'anagram-v5';
const FILES = ['./', './index.html', './manifest.json', './icon.svg'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)));
  // skipWaiting here is temporary — it forces activation past the stuck
  // v3/v4 state so users get the network-first HTML change below.
  // Once this version is live it will be removed; the notification banner
  // handles future SW updates from that point on.
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('message', e => {
  if (e.data === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', e => {
  const path = new URL(e.request.url).pathname;
  const isHtml = path === '/' || path.endsWith('/')
              || path.endsWith('.html') || path.endsWith('/index.html');

  if (isHtml) {
    // Network-first for HTML: always serve fresh markup when online so
    // that changes to index.html are visible immediately without a cache
    // clear. Falls back to the cached copy when offline.
    e.respondWith(
      fetch(e.request)
        .then(res => {
          caches.open(CACHE).then(c => c.put(e.request, res.clone()));
          return res;
        })
        .catch(() => caches.match(e.request))
    );
  } else {
    // Cache-first for all other assets (icon, manifest, sw.js itself)
    e.respondWith(
      caches.match(e.request).then(cached => cached || fetch(e.request))
    );
  }
});
