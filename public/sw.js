// Service worker de Blend Studio.
// A propósito NO guarda en caché páginas ni datos: la agenda y las fichas de clientes
// son privadas y no deben quedar almacenadas en el dispositivo.
// Solo guarda una página estática "sin conexión" (sin datos) para mostrarla si no hay internet.
const CACHE = "blend-offline-v1";
const OFFLINE = "/offline.html";

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll([OFFLINE, "/icons/icon-192.png"])));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((claves) => Promise.all(claves.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

// Solo navegaciones: se intenta la red siempre; si falla, se muestra la página sin conexión.
self.addEventListener("fetch", (event) => {
  if (event.request.mode !== "navigate") return;
  event.respondWith(fetch(event.request).catch(() => caches.match(OFFLINE)));
});
