// StepToDeen Service Worker — Optimized v3
const CACHE_NAME = "steptodeen-v3";
const STATIC_CACHE = "steptodeen-static-v3";
const IMG_CACHE = "steptodeen-images-v3";

// FIX: Pre-cache these on install so first load is fast
const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon-192.png',
  '/offline.html',
  '/mosque-bg.jpg',   // Hero image — cache immediately
];

// Card images — cache on first use, not install (saves install time)
const IMAGE_EXTENSIONS = /\.(jpg|jpeg|png|webp|gif|svg)(\?.*)?$/i;

importScripts('https://storage.googleapis.com/workbox-cdn/releases/5.1.2/workbox-sw.js');

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") self.skipWaiting();
});

// ── Install: cache only essential files ──────────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then(cache => cache.addAll(PRECACHE_URLS))
  );
  self.skipWaiting(); // Activate immediately
});

// ── Activate: remove old cache ──────────────────────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(k => ![CACHE_NAME, STATIC_CACHE, IMG_CACHE].includes(k))
          .map(k => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

if (workbox.navigationPreload.isSupported()) {
  workbox.navigationPreload.enable();
}

// ── Fetch strategy ─────────────────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Navigation requests — network first, fallback to cache/offline
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(async () => {
        const cache = await caches.open(STATIC_CACHE);
        return (await cache.match('/index.html')) ||
               (await cache.match('/offline.html'));
      })
    );
    return;
  }

  // Images — cache-first (speeds up repeat visits dramatically)
  if (IMAGE_EXTENSIONS.test(url.pathname)) {
    event.respondWith(
      caches.open(IMG_CACHE).then(async cache => {
        const cached = await cache.match(request);
        if (cached) return cached;
        const fresh = await fetch(request);
        if (fresh.ok) cache.put(request, fresh.clone());
        return fresh;
      })
    );
    return;
  }

  // Static assets (JS/CSS) — stale-while-revalidate
  if (url.pathname.match(/\.(js|css|woff2?)(\?.*)?$/i)) {
    event.respondWith(
      caches.open(STATIC_CACHE).then(async cache => {
        const cached = await cache.match(request);
        const fetchPromise = fetch(request).then(res => {
          if (res.ok) cache.put(request, res.clone());
          return res;
        });
        return cached || fetchPromise;
      })
    );
    return;
  }

  // Everything else — network only (API calls etc.)
});

// ── Push Notifications ────────────────────────────────────────────────────────
self.addEventListener('push', (event) => {
  const data = event.data?.json() || {};
  event.waitUntil(self.registration.showNotification(data.title || 'StepToDeen 🕌', {
    body: data.body || 'نماز کا وقت ہو گیا',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    dir: 'rtl', lang: 'ur',
    vibrate: [200, 100, 200],
    data: data.url || '/'
  }));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(clients.openWindow(event.notification.data || '/'));
});

self.addEventListener('sync', (event) => {
  if (event.tag === 'prayer-times-sync') {
    event.waitUntil(fetch('/manifest.json').catch(() => {}));
  }
});

self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'daily-prayer-update') {
    event.waitUntil(fetch('/manifest.json').catch(() => {}));
  }
});
