// Service worker: fa funzionare la dashboard anche senza rete e la rende installabile.
// Pagina e icone: prima la rete (così gli aggiornamenti arrivano subito), poi la copia salvata.
// Font Google: prima la copia salvata. Meteo: sempre dalla rete.
var CACHE = "homedashboard-v14";
var BASE = ["./", "./index.html", "./manifest.webmanifest", "./comune.js", "./rete.js", "./giorno.js", "./radio.js", "./gatto.js", "./forza4.js", "./ricette.js", "./telefono.html", "./telefono.webmanifest", "./icone/icona-192.png", "./icone/icona-512.png", "./icone/icona-180.png"];

self.addEventListener("install", function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(BASE); }).then(function () { return self.skipWaiting(); }));
});
self.addEventListener("activate", function (e) {
  e.waitUntil(caches.keys().then(function (k) {
    return Promise.all(k.filter(function (n) { return n !== CACHE; }).map(function (n) { return caches.delete(n); }));
  }).then(function () { return self.clients.claim(); }));
});
self.addEventListener("fetch", function (e) {
  var req = e.request, url = new URL(req.url);
  if (req.method !== "GET") return;
  if (url.origin === location.origin) {
    e.respondWith(fetch(req).then(function (r) {
      if (r.ok) { var copia = r.clone(); caches.open(CACHE).then(function (c) { c.put(req, copia); }); }
      return r;
    }).catch(function () {
      return caches.match(req, { ignoreSearch: true }).then(function (r) { return r || caches.match("./index.html"); });
    }));
  } else if (/fonts\.(googleapis|gstatic)\.com$/.test(url.hostname)) {
    e.respondWith(caches.match(req).then(function (r) {
      return r || fetch(req).then(function (n) { var copia = n.clone(); caches.open(CACHE).then(function (c) { c.put(req, copia); }); return n; });
    }));
  }
});
