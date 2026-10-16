// Service worker: permite instalar la app y abrirla sin conexión.
// Estrategia "red primero": siempre intenta traer la versión nueva y usa la copia guardada solo si no hay internet.
const CACHE = "upp-mi-v1";
const SHELL = ["./", "./index.html", "./firebase-config.js", "./js/app.js", "./js/store.js", "./js/stats.js", "./js/charts.js", "./manifest.webmanifest", "./icons/icon-192.png"];
self.addEventListener("install", e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener("activate", e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener("fetch", e => {
  const url = new URL(e.request.url);
  // Firebase y Google manejan su propia caché y conexión: no se interceptan.
  if (e.request.method !== "GET" || url.origin !== location.origin) return;
  e.respondWith(fetch(e.request).then(r => { const copy = r.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); return r; })
    .catch(() => caches.match(e.request).then(r => r || caches.match("./index.html"))));
});
