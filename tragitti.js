// Home2Love — mappa di Bologna con il traffico e i tragitti casa → lavoro di tutti e due (pagina 2, sotto la ricetta).
// Ognuno sceglie il suo mezzo (auto o bici). Con una chiave TomTom (gratuita) ci sono il traffico in tempo reale
// sulla mappa e i tempi in auto calcolati col traffico di adesso; senza chiave i tempi vengono da OpenStreetMap.
// Indirizzi e chiave stanno in cfg.tragitti, cifrati e condivisi come i turni.

var TR = { mappa: null, strati: [], traffico: null, sfondo: null, ultimo: 0, risultati: [null, null], inCorso: false };
var TR_OGNI = 5 * 60000;   // ricalcolo ogni 5 minuti
var MEZZI = { auto: { ico: "🚗", nome: "auto", tt: "car", osm: "routed-car" }, bici: { ico: "🚲", nome: "bici", tt: "bicycle", osm: "routed-bike" } };

function trCfg() {
  var t = cfg.tragitti || {};
  t.casa = t.casa || null;
  t.lavoro = t.lavoro || [null, null];
  t.mezzo = t.mezzo || ["auto", "auto"];
  t.chiave = t.chiave || "";
  cfg.tragitti = t;
  return t;
}

// ---------------------------------------------------------------- indirizzi → coordinate
function trovaOsm(indirizzo) {
  return fetch("https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&countrycodes=it&viewbox=10.9,44.7,11.8,44.3&q=" + encodeURIComponent(indirizzo))
    .then(function (r) { if (!r.ok) throw new Error("HTTP " + r.status); return r.json(); })
    .then(function (j) {
      var x = j[0]; if (!x) throw new Error("non trovato");
      return { ind: indirizzo, lat: +x.lat, lon: +x.lon, nome: x.display_name.split(",").slice(0, 3).join(",") };
    });
}
function trova(indirizzo) {
  var t = trCfg();
  // "8/3" o altre barre nel testo rompono l'indirizzo della richiesta: le tolgo (il civico 8 basta per la mappa)
  var pulito = indirizzo.replace(/(\d+)\s*\/\s*[\w]+/g, "$1").replace(/[\/\\#?]/g, " ").replace(/\s+/g, " ").trim();
  if (!t.chiave) return trovaOsm(pulito).then(function (x) { x.ind = indirizzo; return x; });
  return fetch("https://api.tomtom.com/search/2/geocode/" + encodeURIComponent(pulito) + ".json?limit=1&countrySet=IT&language=it-IT&lat=" + LAT + "&lon=" + LON + "&key=" + t.chiave)
    .then(function (r) { if (!r.ok) throw new Error("HTTP " + r.status); return r.json(); })
    .then(function (j) {
      var x = j.results && j.results[0]; if (!x) throw new Error("non trovato");
      return { ind: indirizzo, lat: x.position.lat, lon: x.position.lon, nome: x.address.freeformAddress };
    })
    .catch(function () { return trovaOsm(pulito).then(function (x) { x.ind = indirizzo; return x; }); });   // riserva: OpenStreetMap
}

// ---------------------------------------------------------------- percorso e tempo
function percorso(da, a, mezzo) {
  var t = trCfg(), m = MEZZI[mezzo] || MEZZI.auto;
  if (t.chiave) {
    return fetch("https://api.tomtom.com/routing/1/calculateRoute/" + da.lat + "," + da.lon + ":" + a.lat + "," + a.lon +
      "/json?traffic=true&travelMode=" + m.tt + "&routeType=fastest&key=" + t.chiave)
      .then(function (r) { if (!r.ok) throw new Error("HTTP " + r.status); return r.json(); })
      .then(function (j) {
        var r = j.routes[0], s = r.summary;
        return { sec: s.travelTimeInSeconds, ritardo: s.trafficDelayInSeconds || 0, metri: s.lengthInMeters, traffico: mezzo === "auto",
                 punti: r.legs[0].points.map(function (p) { return [p.latitude, p.longitude]; }) };
      });
  }
  return fetch("https://routing.openstreetmap.de/" + m.osm + "/route/v1/driving/" + da.lon + "," + da.lat + ";" + a.lon + "," + a.lat + "?overview=full&geometries=geojson")
    .then(function (r) { if (!r.ok) throw new Error("HTTP " + r.status); return r.json(); })
    .then(function (j) {
      var r = j.routes[0];
      return { sec: r.duration, ritardo: 0, metri: r.distance, traffico: false, punti: r.geometry.coordinates.map(function (c) { return [c[1], c[0]]; }) };
    });
}

// prossimo inizio di turno (in minuti da oggi a mezzanotte), entro domani
function prossimoTurno(p) {
  var ora = new Date(), oggi = new Date(ora.getFullYear(), ora.getMonth(), ora.getDate()), m = ora.getHours() * 60 + ora.getMinutes();
  for (var g = 0; g <= 1; g++) {
    var f = fasceGiorno(piuGiorni(oggi, g), p);
    for (var i = 0; i < f.length; i++) if (f[i][0] + g * 1440 > m) return { inizio: f[i][0], domani: g === 1 };
  }
  return null;
}
function hm(min) { min = ((Math.round(min) % 1440) + 1440) % 1440; return Math.floor(min / 60) + ":" + due(min % 60); }
function durata(sec) { var m = Math.max(1, Math.round(sec / 60)); return m < 60 ? m + " min" : Math.floor(m / 60) + " h " + due(m % 60); }

// ---------------------------------------------------------------- mappa
function trMappa() {
  if (TR.mappa || !window.L || !$("tr-mappa")) return TR.mappa;
  TR.mappa = L.map("tr-mappa", { zoomControl: false, attributionControl: true, zoomSnap: 0.25 }).setView([LAT, LON], 12);
  // niente pulsanti dello zoom: sul tablet si zooma con due dita (e coprivano i segnaposti)
  TR.mappa.attributionControl.setPrefix("");
  trSfondo();
  return TR.mappa;
}
function trSfondo() {   // sfondo chiaro di giorno, scuro di notte; sopra, il traffico se c'è la chiave
  var m = TR.mappa; if (!m) return;
  var notte = document.body.classList.contains("notte"), chiave = trCfg().chiave;
  var stile = chiave ? (notte ? "tt-notte" : "tt-giorno") + chiave : "osm";
  if (!TR.sfondo || TR.sfondo.stile !== stile) {
    if (TR.sfondo) m.removeLayer(TR.sfondo);
    TR.sfondo = chiave
      ? L.tileLayer("https://api.tomtom.com/map/1/tile/basic/" + (notte ? "night" : "main") + "/{z}/{x}/{y}.png?key=" + chiave,
          { maxZoom: 19, attribution: "© TomTom · © OpenStreetMap" })
      : L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19, attribution: "© OpenStreetMap" });
    TR.sfondo.addTo(m); TR.sfondo.stile = stile; TR.sfondo.bringToBack();
  }
  var voluto = chiave ? chiave + (notte ? "n" : "g") : "";
  if ((TR.traffico && TR.traffico.voluto) !== voluto) {
    if (TR.traffico) { m.removeLayer(TR.traffico); TR.traffico = null; }
    if (chiave) {
      TR.traffico = L.tileLayer("https://api.tomtom.com/traffic/map/4/tile/flow/" + (notte ? "relative0-dark" : "relative0") + "/{z}/{x}/{y}.png?key=" + chiave,
        { maxZoom: 19, opacity: .85, attribution: "Traffico © TomTom" }).addTo(m);
      TR.traffico.voluto = voluto;
    }
  }
}
function segnaposto(colore, testo) {
  return L.divIcon({ className: "tr-pin", iconSize: [26, 26], iconAnchor: [13, 13],
    html: '<span style="background:' + colore + '">' + testo + "</span>" });
}
function trDisegnaMappa() {
  var m = trMappa(), t = trCfg(); if (!m) return;
  trSfondo();
  TR.strati.forEach(function (s) { m.removeLayer(s); }); TR.strati = [];
  var limiti = [], colori = [getComputedStyle(document.documentElement).getPropertyValue("--p0").trim() || "#c4622d",
                             getComputedStyle(document.documentElement).getPropertyValue("--p1").trim() || "#3f8a86"];
  [0, 1].forEach(function (p) {
    var r = TR.risultati[p];
    if (r && r.punti) {
      TR.strati.push(L.polyline(r.punti, { color: "#fff", weight: 7, opacity: .8 }).addTo(m));
      TR.strati.push(L.polyline(r.punti, { color: colori[p], weight: 4, opacity: .95, dashArray: t.mezzo[p] === "bici" ? "1 7" : null, lineCap: "round" }).addTo(m));
      limiti = limiti.concat(r.punti);
    }
    var w = t.lavoro[p];
    if (w) { TR.strati.push(L.marker([w.lat, w.lon], { icon: segnaposto(colori[p], (cfg.nomi[p] || "?").charAt(0).toUpperCase()), title: "Lavoro di " + cfg.nomi[p] }).addTo(m)); limiti.push([w.lat, w.lon]); }
  });
  if (t.casa) { TR.strati.push(L.marker([t.casa.lat, t.casa.lon], { icon: segnaposto("#d7263d", "♥"), title: "Casa" }).addTo(m)); limiti.push([t.casa.lat, t.casa.lon]); }
  TR.limiti = limiti; trInquadra();
}
function trInquadra() {   // casa, lavori e percorsi tutti dentro la mappa
  var m = TR.mappa, l = TR.limiti; if (!m || !l || !l.length) return;
  m.invalidateSize();
  var c = m.getContainer(); TR.misura = c.clientWidth + "x" + c.clientHeight;
  if (l.length > 1) m.fitBounds(l, { padding: [22, 22], maxZoom: 15 }); else m.setView(l[0], 14);
}

// ---------------------------------------------------------------- righe sotto la mappa
function trDisegnaRighe() {
  var t = trCfg(), box = $("tr-righe"); if (!box) return;
  box.innerHTML = "";
  $("tr-vuoto").hidden = !!(t.casa && (t.lavoro[0] || t.lavoro[1]));
  [0, 1].forEach(function (p) {
    if (!t.lavoro[p]) return;
    var r = TR.risultati[p], riga = el("div", "tr-riga p" + p);
    var mz = el("button", "tr-mezzo"); mz.type = "button"; mz.textContent = MEZZI[t.mezzo[p]].ico;
    mz.title = "Cambia mezzo (adesso: " + MEZZI[t.mezzo[p]].nome + ")";
    mz.onclick = function () { t.mezzo[p] = t.mezzo[p] === "auto" ? "bici" : "auto"; salvaCfg(); TR.risultati[p] = null; trDisegnaRighe(); trAggiorna(true); };
    var chi = el("span", "tr-chi"); chi.textContent = cfg.nomi[p];
    var tempo = el("span", "tr-tempo"), info = el("span", "tr-info");
    if (r && r.errore) { tempo.textContent = "–"; info.textContent = r.errore; }
    else if (!r) { tempo.textContent = "…"; info.textContent = "calcolo il percorso"; }
    else {
      tempo.textContent = durata(r.sec);
      if (r.ritardo >= 60) { var x = el("em"); x.textContent = " +" + Math.round(r.ritardo / 60) + " traffico"; tempo.appendChild(x); }
      var km = (r.metri / 1000).toFixed(r.metri < 10000 ? 1 : 0).replace(".", ",") + " km", pt = prossimoTurno(p), parti = "";
      if (pt) parti = " · " + (pt.domani ? "domani " : "") + "turno " + hm(pt.inizio) + " → esci " + hm(pt.inizio - Math.ceil(r.sec / 60) - 5);
      info.textContent = km + parti;
    }
    var testi = el("span", "tr-testi"); testi.appendChild(tempo); testi.appendChild(info);
    riga.appendChild(mz); riga.appendChild(chi); riga.appendChild(testi);
    box.appendChild(riga);
  });
  $("tr-fonte").textContent = t.chiave ? "traffico in tempo reale" : "senza traffico";
}

// ---------------------------------------------------------------- aggiornamento
function trAggiorna(subito) {
  var t = trCfg();
  if (!$("card-tragitti")) return;
  trDisegnaRighe();
  if (!window.L) return;   // Leaflet non ancora caricato (o senza rete)
  if (!t.casa) { trDisegnaMappa(); return; }
  if (TR.inCorso || (!subito && Date.now() - TR.ultimo < TR_OGNI)) return;
  TR.inCorso = true; TR.ultimo = Date.now();
  Promise.all([0, 1].map(function (p) {
    if (!t.lavoro[p]) { TR.risultati[p] = null; return null; }
    return percorso(t.casa, t.lavoro[p], t.mezzo[p]).then(function (r) { TR.risultati[p] = r; },
      function (e) { TR.risultati[p] = { errore: /403|401/.test(e.message) ? "chiave TomTom non valida" : "percorso non disponibile ora" }; });
  })).then(function () { TR.inCorso = false; trDisegnaRighe(); trDisegnaMappa(); });
}

// ---------------------------------------------------------------- impostazioni
function trApriImpostazioni() {
  var t = trCfg();
  $("tr-casa").value = t.casa ? t.casa.ind : "";
  [0, 1].forEach(function (p) {
    $("tr-lav" + p).value = t.lavoro[p] ? t.lavoro[p].ind : "";
    $("tr-lab" + p).textContent = "Lavoro di " + cfg.nomi[p];
    seg("tr-mz" + p, t.mezzo[p]);
  });
  $("tr-chiave").value = t.chiave;
  $("tr-stato").textContent = "";
}
function trSalvaImpostazioni() {
  var t = trCfg(), msg = $("tr-stato");
  t.chiave = $("tr-chiave").value.trim();
  var campi = [["casa", $("tr-casa").value.trim()], [0, $("tr-lav0").value.trim()], [1, $("tr-lav1").value.trim()]];
  msg.textContent = "Cerco gli indirizzi…";
  Promise.all(campi.map(function (c) {
    var vecchio = c[0] === "casa" ? t.casa : t.lavoro[c[0]];
    if (!c[1]) return Promise.resolve(null);
    if (vecchio && vecchio.ind === c[1]) return Promise.resolve(vecchio);   // già trovato: non lo cerco di nuovo
    return trova(c[1]).catch(function () { return { errore: c[1] }; });
  })).then(function (r) {
    var sbagliati = r.filter(function (x) { return x && x.errore; }).map(function (x) { return x.errore; });
    if (sbagliati.length) { msg.textContent = "Non trovo: " + sbagliati.join(", ") + ". Prova ad aggiungere il numero civico e «Bologna»."; return; }
    t.casa = r[0]; t.lavoro = [r[1], r[2]];
    salvaCfg(); TR.risultati = [null, null];
    msg.textContent = "Salvato ✓ " + r.filter(Boolean).map(function (x) { return x.nome; }).join(" · ");
    trAggiorna(true);
  });
}
function avviaTragitti() {
  if (!$("card-tragitti")) return;
  [0, 1].forEach(function (p) {
    $("tr-mz" + p).onclick = function (e) { var v = e.target.getAttribute("data-v"); if (v) { trCfg().mezzo[p] = v; seg("tr-mz" + p, v); salvaCfg(); TR.risultati[p] = null; trAggiorna(true); } };
  });
  $("tr-salva").onclick = trSalvaImpostazioni;
  $("tr-imposta").onclick = function () { apriImpostazioni && apriImpostazioni(); };
  // la mappa nasce quando la pagina 2 ha le sue misure; poi si ricalcola ogni 5 minuti
  setTimeout(function () { trAggiorna(true); }, 1500);
  setInterval(function () { trAggiorna(false); trDisegnaRighe(); }, 60000);
  // se la mappa cambia misura (pagina, rotazione) la reinquadro
  setInterval(function () {
    var m = TR.mappa; if (!m) return; var c = m.getContainer();
    if (c.clientWidth && c.clientWidth + "x" + c.clientHeight !== TR.misura) trInquadra();
  }, 1000);
}
