// Service worker minimale (M0): abilita l'installabilità PWA e una cache
// "network-first" per le navigazioni, con fallback alla cache se offline.
// Una strategia di caching più ricca (precache asset, ecc.) verrà valutata
// con serwist dopo conferma. Vedi DECISIONS / ROADMAP.

const CACHE = "trackit-v1";

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  // Solo GET same-origin per le navigazioni di pagina.
  if (request.method !== "GET" || request.mode !== "navigate") return;

  event.respondWith(
    fetch(request)
      .then((response) => {
        const copy = response.clone();
        caches.open(CACHE).then((cache) => cache.put(request, copy));
        return response;
      })
      .catch(() => caches.match(request).then((cached) => cached ?? Response.error())),
  );
});
