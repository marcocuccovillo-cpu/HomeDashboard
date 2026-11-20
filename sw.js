// Service worker: fa funzionare la dashboard anche senza rete e la rende installabile.
// Pagina e icone: prima la rete (così gli aggiornamenti arrivano subito), poi la copia salvata.
// Font Google: prima la copia salvata. Meteo: sempre dalla rete.
// Ad ogni rilascio: alzare la versione qui e il ?v= degli script in index.html e telefono.html.
var CACHE = "homedashboard-v96";
var BASE = ["./", "./index.html", "./manifest.webmanifest", "./comune.js", "./rete.js", "./radio.js", "./gatto.js", "./forza4.js", "./giochi.js", "./tragitti.js", "./bus.js", "./spesa.js", "./coppia.js", "./occhiata.js", "./chatplus.js", "./giochi2.js", "./scacchi.js", "./carte.js", "./eroefoto.js", "./compleanni.js", "./gattino.js", "./gattodisegno.js", "./vecchi.js", "./divano.html", "./giochi.js", "./calendario.js", "./suoni.js", "./telecomando.js", "./telefono.html", "./telefono.webmanifest", "./comodino.html", "./comodino.webmanifest", "./dove.html", "./dove.webmanifest", "./tv.html", "./tv.webmanifest", "./gatto.html", "./gatto.webmanifest", "./icone/icona-192.png", "./icone/icona-512.png", "./icone/icona-180.png"];

// install: cache "reload" = mai copie vecchie dalla cache del browser
self.addEventListener("install", function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(BASE.map(function (u) { return new Request(u, { cache: "reload" }); })); }).then(function () { return self.skipWaiting(); }));
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
    e.respondWith(fetch(req, { cache: "no-cache" }).then(function (r) {   // no-cache: chiede sempre al server se il file è cambiato
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
