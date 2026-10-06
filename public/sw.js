// Service worker de Blend Studio.
// A propósito NO guarda en caché páginas ni datos: la agenda y las fichas de clientes
// son privadas y no deben quedar almacenadas en el dispositivo.
self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});
