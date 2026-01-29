// sw.js
const CACHE_NAME = 'festa-sport-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/css/style.css',
  '/js/config.js',
  '/js/script.js',
  '/favicon/favicon.ico',
  '../../public/assets/images/fcapralbese-Photoroom.png',
  'https://cdn.tailwindcss.com',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css'
];

// Installazione Service Worker
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(urlsToCache))
      .catch((err) => console.log('Errore cache install:', err))
  );
});

// Attivazione Service Worker
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// Intercetta le richieste
self.addEventListener('fetch', (event) => {
  // Strategia: Cache First per risorse statiche, Network First per API
  if (event.request.url.includes('/api/')) {
    // Per le API, usa Network First
    event.respondWith(
      fetch(event.request)
        .catch(() => {
          return new Response(
            JSON.stringify({ error: 'Offline - Funzionalità non disponibile' }),
            { headers: { 'Content-Type': 'application/json' } }
          );
        })
    );
  } else {
    // Per risorse statiche, usa Cache First
    event.respondWith(
      caches.match(event.request)
        .then((response) => {
          return response || fetch(event.request);
        })
    );
  }
});