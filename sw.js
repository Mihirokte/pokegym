// PokéGym service worker.
// Strategy:
//   - App shell (HTML/CSS/JS/fonts/icons) — cache-first, revalidated on
//     successful fetch so a `git push` updates without a hard refresh.
//   - Sprites — cache-first, lazy-populated on first request. All ~2600 files
//     aren't precached on install to keep install cheap; sprites are tiny so
//     runtime caching is snappy.
//   - Google APIs / accounts.google.com — never cache (always go to network).

const VERSION = 'pokegym-v6';
const SHELL = [
  './',
  'index.html',
  'manifest.webmanifest',
  'assets/css/app.css',
  'assets/js/app.js',
  'assets/js/auth.js',
  'assets/js/config.js',
  'assets/js/sheets.js',
  'assets/js/storage.js',
  'assets/js/sync.js',
  'assets/js/util.js',
  'assets/js/data/days.js',
  'assets/js/data/exercises.js',
  'assets/js/data/leaders.js',
  'assets/js/data/pokemon.js',
  'assets/js/ui/badges.js',
  'assets/js/ui/library.js',
  'assets/js/ui/pokeball.js',
  'assets/js/ui/session.js',
  'assets/js/ui/setup.js',
  'assets/js/ui/timer.js',
  'assets/js/ui/toast.js',
  'assets/js/ui/wake.js',
  'assets/fonts/inter.woff2',
  'assets/fonts/press-start-2p.woff2',
  'assets/fonts/jetbrains-mono.woff2',
  'assets/icons/icon-192.png',
  'assets/icons/icon-512.png',
  'assets/icons/apple-touch-icon.png',
  'assets/icons/favicon-32.png',
  'assets/sprites/items/poke.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(VERSION);
    await Promise.allSettled(SHELL.map(url => cache.add(url).catch(err => console.warn('[sw] precache miss', url, err))));
    self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    // Drop old caches
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

// ── Fetch strategy ─────────────────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // Never intercept Google auth / APIs.
  const passthrough = [
    'googleapis.com',
    'accounts.google.com',
    'google.com',
    'gstatic.com',
  ];
  if (passthrough.some(d => url.hostname.endsWith(d))) return;

  // Sprites & fonts — cache-first with lazy fill.
  const isAsset = url.pathname.includes('/assets/sprites/')
               || url.pathname.includes('/assets/icons/')
               || url.pathname.includes('/assets/fonts/');

  if (isAsset) {
    event.respondWith(cacheFirst(req));
    return;
  }

  // HTML/CSS/JS — stale-while-revalidate so updates land without manual refresh.
  if (req.destination === 'document' || req.destination === 'script' || req.destination === 'style' || url.pathname.endsWith('.js') || url.pathname.endsWith('.css') || url.pathname.endsWith('.html')) {
    event.respondWith(staleWhileRevalidate(req));
    return;
  }

  // Default: network-first with fall back to cache.
  event.respondWith(networkFirst(req));
});

async function cacheFirst(req) {
  const cache = await caches.open(VERSION);
  const hit = await cache.match(req);
  if (hit) return hit;
  try {
    const res = await fetch(req);
    if (res.ok) cache.put(req, res.clone());
    return res;
  } catch (e) {
    return new Response('offline', { status: 503, statusText: 'Offline' });
  }
}

async function staleWhileRevalidate(req) {
  const cache = await caches.open(VERSION);
  const cached = await cache.match(req);
  const network = fetch(req).then(res => {
    if (res && res.ok) cache.put(req, res.clone());
    return res;
  }).catch(() => null);
  return cached || (await network) || new Response('offline', { status: 503 });
}

async function networkFirst(req) {
  try {
    const res = await fetch(req);
    if (res && res.ok) {
      const cache = await caches.open(VERSION);
      cache.put(req, res.clone());
    }
    return res;
  } catch {
    const cache = await caches.open(VERSION);
    const hit = await cache.match(req);
    return hit || new Response('offline', { status: 503 });
  }
}

self.addEventListener('message', (e) => {
  if (e.data === 'SKIP_WAITING') self.skipWaiting();
});
