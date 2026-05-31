const CACHE_NAME = 'steptodeen-v2';
const STATIC_ASSETS = ['/', '/index.html', '/manifest.json', '/icon-192.png', '/icon-512.png'];

// ── Install ──────────────────────────────────────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

// ── Activate ─────────────────────────────────────────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// ── Fetch (Offline Support) ───────────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  if (
    event.request.url.includes('firestore') ||
    event.request.url.includes('firebase') ||
    event.request.url.includes('googleapis') ||
    event.request.method !== 'GET'
  ) return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const clone = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});

// ── Push Notifications ────────────────────────────────────────────────────────
self.addEventListener('push', (event) => {
  const data = event.data?.json() || {};
  const title = data.title || 'StepToDeen 🕌';
  const options = {
    body: data.body || 'نماز کا وقت ہو گیا',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    dir: 'rtl',
    lang: 'ur',
    vibrate: [200, 100, 200],
    data: data.url || '/',
    actions: [
      { action: 'open', title: 'کھولیں' },
      { action: 'close', title: 'بند کریں' }
    ]
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

// ── Notification Click ────────────────────────────────────────────────────────
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  if (event.action === 'open' || !event.action) {
    event.waitUntil(clients.openWindow(event.notification.data || '/'));
  }
});

// ── Background Sync ───────────────────────────────────────────────────────────
self.addEventListener('sync', (event) => {
  if (event.tag === 'prayer-times-sync') {
    event.waitUntil(
      fetch('/manifest.json')
        .then(() => console.log('StepToDeen: background sync done'))
        .catch(() => console.log('StepToDeen: background sync failed'))
    );
  }
});

// ── Periodic Background Sync ──────────────────────────────────────────────────
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'daily-prayer-update') {
    event.waitUntil(
      fetch('/manifest.json')
        .then(() => {
          self.registration.showNotification('StepToDeen 🕌', {
            body: 'آج کے نماز اوقات تازہ ہو گئے',
            icon: '/icon-192.png',
            badge: '/icon-192.png',
            dir: 'rtl',
            lang: 'ur'
          });
        })
        .catch(() => {})
    );
  }
});
