/* ═══════════════════════════════════════════════════════════════
   MOMENTUM — Service Worker
   Offline caching with cache-first strategy
═══════════════════════════════════════════════════════════════ */

const CACHE_VERSION = "momentum-v3";
const ASSETS = [
  "/",
  "/index.html",
  "/style.css",
  "/app.js",
  "/ai.js",
  "/tasks.js",
  "/mood.js",
  "/onboarding.js",
  "/manifest.json",
  "/icon-192.png",
  "/icon-512.png"
];

/* ── Install: pre-cache all assets ── */
self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_VERSION)
      .then(cache => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

/* ── Activate: clean up old caches ── */
self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k !== CACHE_VERSION).map(k => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

/* ── Fetch: cache-first, network fallback ── */
self.addEventListener("fetch", event => {
  // Don't cache API calls (proxy endpoint or direct Google API)
  if (
    event.request.url.includes("/api/") ||
    event.request.url.includes("generativelanguage.googleapis.com")
  ) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(response => {
        // Cache successful GET requests
        if (!response || response.status !== 200 || event.request.method !== "GET") {
          return response;
        }
        const cloned = response.clone();
        caches.open(CACHE_VERSION).then(cache => cache.put(event.request, cloned));
        return response;
      });
    }).catch(() => {
      // Offline fallback for navigation
      if (event.request.mode === "navigate") {
        return caches.match("/index.html");
      }
    })
  );
});
