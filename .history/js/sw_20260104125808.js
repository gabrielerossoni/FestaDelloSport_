// sw.js - Service Worker per Festa dello Sport
// Versione cache: incrementa quando aggiorni risorse critiche
const CACHE_VERSION = "v2";
const CACHE_NAME = `festa-sport-${CACHE_VERSION}`;
const STATIC_CACHE = `festa-sport-static-${CACHE_VERSION}`;
const IMAGE_CACHE = `festa-sport-images-${CACHE_VERSION}`;

// Risorse critiche da cachare immediatamente
const CRITICAL_ASSETS = [
  "/",
  "/index.html",
  "/css/style.css",
  "/js/config.js",
  "/js/script.js",
  "/favicon/favicon.ico",
];

// Immagini da cachare
const IMAGE_ASSETS = [
  "/assets/images/fcapralbese-Photoroom.png",
  "/assets/images/foratorio-Photoroom.png",
];

// Risorse esterne (CDN)
const EXTERNAL_ASSETS = [
  "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css",
  "https://fonts.googleapis.com/css2?family=Montserrat:wght@300;400;500;600;700&family=Playfair+Display:wght@400;700&display=swap",
];

// Installazione Service Worker
self.addEventListener("install", (event) => {
  console.log("[SW] Installazione Service Worker...");
  event.waitUntil(
    Promise.all([
      // Cache risorse critiche
      caches.open(STATIC_CACHE).then((cache) => {
        return cache.addAll(
          CRITICAL_ASSETS.map((url) => new Request(url, { cache: "reload" }))
        );
      }),
      // Cache immagini (non bloccante)
      caches
        .open(IMAGE_CACHE)
        .then((cache) => {
          return cache.addAll(IMAGE_ASSETS);
        })
        .catch((err) => {
          console.warn("[SW] Errore cache immagini:", err);
        }),
    ])
      .then(() => {
        console.log("[SW] Cache installata con successo");
        // Forza l'attivazione immediata
        return self.skipWaiting();
      })
      .catch((err) => {
        console.error("[SW] Errore installazione cache:", err);
      })
  );
});

// Attivazione Service Worker
self.addEventListener("activate", (event) => {
  console.log("[SW] Attivazione Service Worker...");
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            // Rimuovi vecchie cache che non corrispondono alla versione corrente
            if (
              cacheName.startsWith("festa-sport-") &&
              cacheName !== STATIC_CACHE &&
              cacheName !== IMAGE_CACHE
            ) {
              console.log("[SW] Rimozione vecchia cache:", cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log("[SW] Service Worker attivato");
        // Prendi il controllo di tutte le pagine
        return self.clients.claim();
      })
  );
});

// Intercetta le richieste
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // Ignora richieste non GET
  if (event.request.method !== "GET") {
    return;
  }

  // API: Network First con fallback offline
  if (url.pathname.startsWith("/api/")) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          // Se la risposta è ok, la ritorniamo
          if (response.ok) {
            return response;
          }
          throw new Error("Network response not ok");
        })
        .catch(() => {
          // Fallback offline per API
          return new Response(
            JSON.stringify({
              error: "Offline - Funzionalità non disponibile",
              offline: true,
            }),
            {
              headers: { "Content-Type": "application/json" },
              status: 503,
              statusText: "Service Unavailable",
            }
          );
        })
    );
    return;
  }

  // Immagini: Cache First con Stale-While-Revalidate
  if (url.pathname.match(/\.(jpg|jpeg|png|gif|webp|svg)$/i)) {
    event.respondWith(
      caches.open(IMAGE_CACHE).then((cache) => {
        return cache.match(event.request).then((cachedResponse) => {
          // Ritorna dalla cache se disponibile
          if (cachedResponse) {
            // Aggiorna la cache in background (stale-while-revalidate)
            fetch(event.request)
              .then((networkResponse) => {
                if (networkResponse.ok) {
                  cache.put(event.request, networkResponse.clone());
                }
              })
              .catch(() => {
                // Ignora errori di rete in background
              });
            return cachedResponse;
          }
          // Se non in cache, fetcha e cachia
          return fetch(event.request).then((networkResponse) => {
            if (networkResponse.ok) {
              cache.put(event.request, networkResponse.clone());
            }
            return networkResponse;
          });
        });
      })
    );
    return;
  }

  // Risorse statiche (HTML, CSS, JS): Cache First
  if (
    url.pathname.match(/\.(html|css|js)$/i) ||
    url.pathname === "/" ||
    url.origin === self.location.origin
  ) {
    event.respondWith(
      caches.open(STATIC_CACHE).then((cache) => {
        return cache.match(event.request).then((cachedResponse) => {
          if (cachedResponse) {
            // Aggiorna in background
            fetch(event.request)
              .then((networkResponse) => {
                if (networkResponse.ok) {
                  cache.put(event.request, networkResponse.clone());
                }
              })
              .catch(() => {});
            return cachedResponse;
          }
          return fetch(event.request).then((networkResponse) => {
            if (networkResponse.ok) {
              cache.put(event.request, networkResponse.clone());
            }
            return networkResponse;
          });
        });
      })
    );
    return;
  }

  // Risorse esterne (CDN): Network First con cache
  if (url.origin !== self.location.origin) {
    event.respondWith(
      fetch(event.request)
        .then((networkResponse) => {
          // Cachia risorse esterne valide
          if (
            networkResponse.ok &&
            url.pathname.match(/\.(css|js|woff|woff2|ttf|eot)$/i)
          ) {
            const responseClone = networkResponse.clone();
            caches.open(STATIC_CACHE).then((cache) => {
              cache.put(event.request, responseClone);
            });
          }
          return networkResponse;
        })
        .catch(() => {
          // Fallback a cache se disponibile
          return caches.match(event.request);
        })
    );
    return;
  }

  // Default: Network First
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});
