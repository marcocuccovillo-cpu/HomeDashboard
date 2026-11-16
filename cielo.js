// HomeDashboard — riquadro "Cielo sopra casa" (seconda schermata del tablet).
// Stazione Spaziale: posizione e passaggi calcolati sul tablet con SGP4 (satellite.js) dagli elementi
// orbitali ufficiali (TLE). Aerei: dati ADS-B pubblici di adsb.lol (in alternativa airplanes.live).

var CASA = { lat: LAT, lon: LON };          // da comune.js (Bologna)
var BLQ = { lat: 44.5354, lon: 11.2887 };   // aeroporto Marconi, per orientarsi sul radar
var RAGGIO_KM = 30;
var RT = 6371, AU = 149597870.7, RAD = Math.PI / 180;
var cielo = { satrec: null, passaggi: null, calcolato: 0, terra: null, aerei: null, tAerei: null };

function svgEl(tag, attr) { var e = document.createElementNS("http://www.w3.org/2000/svg", tag); for (var k in attr) e.setAttribute(k, attr[k]); return e; }
function distanzaKm(a, b) {   // haversine
  var dLat = (b.lat - a.lat) * RAD, dLon = (b.lon - a.lon) * RAD;
  var h = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(a.lat * RAD) * Math.cos(b.lat * RAD) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return 2 * RT * Math.asin(Math.sqrt(h));
}
function rotta(a, b) {   // gradi da nord, in senso orario
  var y = Math.sin((b.lon - a.lon) * RAD) * Math.cos(b.lat * RAD);
  var x = Math.cos(a.lat * RAD) * Math.sin(b.lat * RAD) - Math.sin(a.lat * RAD) * Math.cos(b.lat * RAD) * Math.cos((b.lon - a.lon) * RAD);
  return (Math.atan2(y, x) / RAD + 360) % 360;
}
function puntoCardinale(az) { return ["N", "NE", "E", "SE", "S", "SO", "O", "NO"][Math.round(az / 45) % 8]; }
function numero(n) { return Math.round(n).toLocaleString("it-IT"); }

// ---------------------------------------------------------------- Sole (formule a bassa precisione, ±0,01°)
function sole(data) {
  var n = data.getTime() / 864e5 + 2440587.5 - 2451545.0;
  var L = (280.46 + 0.9856474 * n) % 360, g = (357.528 + 0.9856003 * n) % 360 * RAD;
  var lam = (L + 1.915 * Math.sin(g) + 0.020 * Math.sin(2 * g)) * RAD, eps = (23.439 - 0.0000004 * n) * RAD;
  var u = { x: Math.cos(lam), y: Math.cos(eps) * Math.sin(lam), z: Math.sin(eps) * Math.sin(lam) };   // versore in ECI
  var dec = Math.asin(u.z), ra = Math.atan2(u.y, u.x);
  var lonSub = ((ra - satellite.gstime(data)) / RAD + 540) % 360 - 180;
  return { u: u, dec: dec / RAD, lon: lonSub };
}
function alSole(r, s) {   // la Stazione è illuminata? (ombra della Terra come cilindro)
  var d = r.x * s.x + r.y * s.y + r.z * s.z;
  if (d > 0) return true;
  var px = r.x - d * s.x, py = r.y - d * s.y, pz = r.z - d * s.z;
  return Math.sqrt(px * px + py * py + pz * pz) > RT;
}

// ---------------------------------------------------------------- Stazione Spaziale
function osservatore() { return { latitude: CASA.lat * RAD, longitude: CASA.lon * RAD, height: 0.06 }; }
function guarda(satrec, data) {
  var p = satellite.propagate(satrec, data);
  if (!p || !p.position) return null;
  var gmst = satellite.gstime(data), geo = satellite.eciToGeodetic(p.position, gmst);
  var look = satellite.ecfToLookAngles(osservatore(), satellite.eciToEcf(p.position, gmst));
  var v = p.velocity;
  return { r: p.position, lat: geo.latitude / RAD, lon: ((geo.longitude / RAD + 540) % 360) - 180, alt: geo.height,
    vel: Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z) * 3600, el: look.elevation / RAD, az: look.azimuth / RAD, dist: look.rangeSat };
}
function elevazioneSole(data, s) {
  var gmst = satellite.gstime(data);
  var ecf = satellite.eciToEcf({ x: s.u.x * AU, y: s.u.y * AU, z: s.u.z * AU }, gmst);
  return satellite.ecfToLookAngles(osservatore(), ecf).elevation / RAD;
}
function calcolaPassaggi(satrec, da, ore) {   // passaggi sopra 10° nei prossimi giorni, con visibilità a occhio nudo
  var out = [], cur = null, PASSO = 20 * 1000;
  for (var t = da.getTime(); t < da.getTime() + ore * 3600e3; t += PASSO) {
    var d = new Date(t), g = guarda(satrec, d); if (!g) continue;
    if (g.el > 10) {
      if (!cur) cur = { inizio: d, azInizio: g.az, max: 0, visibile: false };
      if (g.el > cur.max) { cur.max = g.el; cur.tMax = d; }
      cur.fine = d; cur.azFine = g.az;
      if (!cur.visibile) { var s = sole(d); if (alSole(g.r, s.u) && elevazioneSole(d, s) < -6) cur.visibile = true; }
    } else if (cur) { out.push(cur); cur = null; }
  }
  if (cur) out.push(cur);
  return out;
}
function leggiTLE() {
  var salvato = leggi("cielo_tle", null);
  if (salvato && Date.now() - salvato.quando < 12 * 3600e3) return Promise.resolve(salvato);
  function da(url, conv) { return fetch(url, { cache: "no-store" }).then(function (r) { if (!r.ok) throw new Error(r.status); return r.text(); }).then(conv); }
  return da("https://api.wheretheiss.at/v1/satellites/25544/tles", function (t) { var j = JSON.parse(t); return { l1: j.line1, l2: j.line2 }; })
    .catch(function () {
      return da("https://celestrak.org/NORAD/elements/gp.php?CATNR=25544&FORMAT=TLE", function (t) {
        var r = t.trim().split(/\r?\n/); return { l1: r[r.length - 2].trim(), l2: r[r.length - 1].trim() };
      });
    })
    .then(function (x) { x.quando = Date.now(); salva("cielo_tle", x); return x; }, function (e) { if (salvato) return salvato; throw e; });
}

// ---------------------------------------------------------------- mappa (equirettangolare 360×180)
function xy(lat, lon) { return [lon + 180, 90 - lat]; }
function percorso(punti) {   // spezza la linea quando attraversa la linea del cambio data
  var d = "", prima = null;
  punti.forEach(function (p) {
    var q = xy(p[0], p[1]);
    d += (prima === null || Math.abs(p[1] - prima) > 180 ? "M" : "L") + q[0].toFixed(1) + " " + q[1].toFixed(1);
    prima = p[1];
  });
  return d;
}
function anelloTerra(anello) {   // [lon, lat] → path; gestisce i contorni che attraversano la linea del cambio data
  var p = anello.map(function (q) { return [q[1], q[0]]; }), salti = [];
  for (var i = 1; i < p.length; i++) if (Math.abs(p[i][1] - p[i - 1][1]) > 180) salti.push(i);
  if (!salti.length) return percorso(p) + "Z";
  if (salti.length === 1) {   // contorno che fa il giro del mondo (Antartide): lo chiudo lungo il polo
    var r = p.slice(salti[0]).concat(p.slice(0, salti[0])), sud = r[0][0] < 0 ? -90 : 90;
    var verso = r[0][1] < r[r.length - 1][1] ? 1 : -1;
    var a = xy(sud, -180 * verso), b = xy(sud, 180 * verso);
    var d = "M" + xy(r[0][0], -180 * verso).join(" ");
    r.forEach(function (q) { d += "L" + xy(q[0], q[1]).map(function (v) { return v.toFixed(1); }).join(" "); });
    return d + "L" + xy(r[r.length - 1][0], 180 * verso).join(" ") + "L" + b.join(" ") + "L" + a.join(" ") + "Z";
  }
  var d = "", pezzo = [];   // contorni tagliati (es. Chukotka): ogni pezzo chiuso per conto suo
  p.forEach(function (q, i) { if (salti.indexOf(i) >= 0) { d += percorso(pezzo) + "Z"; pezzo = []; } pezzo.push(q); });
  return d + percorso(pezzo) + "Z";
}
function caricaTerra() {
  if (cielo.terra) return Promise.resolve(cielo.terra);
  return fetch("https://cdn.jsdelivr.net/npm/world-atlas@2.0.2/land-110m.json").then(function (r) { return r.json(); }).then(function (w) {
    var f = topojson.feature(w, w.objects.land), d = "";
    (f.features || [f]).forEach(function (ft) {
      var g = ft.geometry, poli = g.type === "Polygon" ? [g.coordinates] : g.coordinates;
      poli.forEach(function (p) { p.forEach(function (anello) { d += anelloTerra(anello); }); });
    });
    cielo.terra = d; return d;
  });
}
function disegnaMappa(ora, attuale) {
  var svg = $("iss-mappa"); svg.innerHTML = "";
  svg.appendChild(svgEl("rect", { x: 0, y: 0, width: 360, height: 180, class: "mare" }));
  if (cielo.terra) svg.appendChild(svgEl("path", { d: cielo.terra, class: "terra" }));
  // notte: la parte di mondo dove il Sole è sotto l'orizzonte
  var s = sole(ora), dec = s.dec * RAD, pts = [];
  for (var lon = -180; lon <= 180; lon += 3) pts.push([Math.atan(-Math.cos((lon - s.lon) * RAD) / Math.tan(dec)) / RAD, lon]);
  var polo = dec > 0 ? -90 : 90, dN = "M0 " + xy(polo, -180)[1];
  pts.forEach(function (p) { var q = xy(p[0], p[1]); dN += "L" + q[0].toFixed(1) + " " + q[1].toFixed(1); });
  dN += "L360 " + xy(polo, 180)[1] + "Z";
  svg.appendChild(svgEl("path", { d: dN, class: "notte" }));
  // traccia: 45 minuti indietro (tratteggiata) e 45 avanti
  var passato = [], futuro = [];
  for (var m = -45; m <= 45; m += 1) {
    var g = guarda(cielo.satrec, new Date(ora.getTime() + m * 60000)); if (!g) continue;
    (m <= 0 ? passato : futuro).push([g.lat, g.lon]);
  }
  svg.appendChild(svgEl("path", { d: percorso(passato), class: "traccia passata" }));
  svg.appendChild(svgEl("path", { d: percorso(futuro), class: "traccia" }));
  var c = xy(CASA.lat, CASA.lon); svg.appendChild(svgEl("circle", { cx: c[0], cy: c[1], r: 2.2, class: "casa" }));
  var i = xy(attuale.lat, attuale.lon);
  svg.appendChild(svgEl("circle", { cx: i[0], cy: i[1], r: 9, class: "iss-alone" }));
  svg.appendChild(svgEl("circle", { cx: i[0], cy: i[1], r: 3.6, class: "iss" }));
}
function quandoTesto(d) {
  var oggi = new Date(), dom = new Date(); dom.setDate(dom.getDate() + 1);
  var g = d.toDateString() === oggi.toDateString() ? (d.getHours() >= 17 ? "stasera" : "oggi")
    : d.toDateString() === dom.toDateString() ? "domani" : GIORNI[d.getDay()];
  return g + " alle " + d.getHours() + ":" + due(d.getMinutes());
}
function aggiornaISS() {
  if (!cielo.satrec || !window.satellite) return;
  var ora = new Date(), g = guarda(cielo.satrec, ora); if (!g) return;
  disegnaMappa(ora, g);
  var sopra = g.el > 0;
  $("iss-stato").textContent = sopra ? "sopra l'orizzonte!" : (g.lat >= 0 ? "N " : "S ") + Math.abs(g.lat).toFixed(1) + "° · " + (g.lon >= 0 ? "E " : "O ") + Math.abs(g.lon).toFixed(1) + "°";
  $("iss-stato").className = "pillola" + (sopra ? " ok" : "");
  $("iss-dati").textContent = numero(g.alt) + " km di quota · " + numero(g.vel) + " km/h · a " + numero(g.dist) + " km da casa";
  // passaggi: ricalcolati ogni 30 minuti
  if (!cielo.passaggi || Date.now() - cielo.calcolato > 30 * 60000) {
    cielo.passaggi = calcolaPassaggi(cielo.satrec, ora, 96); cielo.calcolato = Date.now();
  }
  var futuri = cielo.passaggi.filter(function (p) { return p.fine > ora; });
  var vis = futuri.filter(function (p) { return p.visibile; })[0], box = $("iss-passaggio");
  if (vis) {
    var min = Math.max(1, Math.round((vis.fine - vis.inizio) / 60000));
    box.innerHTML = "<b>Prossimo passaggio visibile</b><span></span>";
    box.lastChild.textContent = quandoTesto(vis.inizio) + " · da " + puntoCardinale(vis.azInizio) + " verso " + puntoCardinale(vis.azFine) +
      " · alta " + Math.round(vis.max) + "° · " + min + " min";
  } else if (futuri[0]) {
    box.innerHTML = "<b>Nessun passaggio visibile nei prossimi 4 giorni</b><span></span>";
    box.lastChild.textContent = "Passa comunque " + quandoTesto(futuri[0].inizio) + ", ma di giorno o in ombra";
  } else box.textContent = "";
}
function avviaISS() {
  if (!window.satellite) { $("iss-dati").textContent = "Libreria satellite.js non caricata."; return; }
  leggiTLE().then(function (t) {
    cielo.satrec = satellite.twoline2satrec(t.l1, t.l2); cielo.passaggi = null;
    aggiornaISS();
    return window.topojson ? caricaTerra().then(aggiornaISS) : null;
  }).catch(function () { $("iss-dati").textContent = "Non riesco a scaricare l'orbita della Stazione, riprovo più tardi."; });
}

// ---------------------------------------------------------------- aerei sopra casa
// Fonti degli aerei, in ordine. Alcune non permettono a una pagina di un altro sito di leggere i dati (CORS):
// l'ultima è il lettore in Termux sul tablet stesso, che li chiede lui e li passa alla pagina.
var PORTA_LETTORE = 8789;
function fontiAerei(nm) {
  var d = 0.35;   // ~30 km in gradi, per OpenSky che vuole un riquadro
  return [
    { nome: "adsb.lol", url: "https://api.adsb.lol/v2/point/" + CASA.lat + "/" + CASA.lon + "/" + nm },
    { nome: "airplanes.live", url: "https://api.airplanes.live/v2/point/" + CASA.lat + "/" + CASA.lon + "/" + nm },
    { nome: "OpenSky", url: "https://opensky-network.org/api/states/all?lamin=" + (CASA.lat - d) + "&lomin=" + (CASA.lon - d * 1.4) + "&lamax=" + (CASA.lat + d) + "&lomax=" + (CASA.lon + d * 1.4) },
    { nome: "lettore sul tablet", url: "http://127.0.0.1:" + PORTA_LETTORE + "/aerei?lat=" + CASA.lat + "&lon=" + CASA.lon + "&nm=" + nm }
  ];
}
function daOpenSky(j) {   // stati OpenSky → stesso formato di adsb.lol
  return { ac: (j.states || []).map(function (s) {
    return { hex: s[0], flight: s[1], lat: s[6], lon: s[5], alt_baro: s[8] ? "ground" : (s[7] != null ? s[7] / 0.3048 : null),
      gs: s[9] != null ? s[9] * 1.94384 : null, track: s[10] };
  }) };
}
function leggiAerei() {
  var nm = Math.ceil(RAGGIO_KM / 1.852), fonti = fontiAerei(nm), errori = [];
  var ordine = fonti.slice().sort(function (a, b) { return (b.nome === cielo.fonte) - (a.nome === cielo.fonte); });
  function prova(i) {
    if (i >= ordine.length) return Promise.reject(new Error(errori.join(" · ")));
    var f = ordine[i], ctrl = window.AbortController ? new AbortController() : null;
    var t = setTimeout(function () { if (ctrl) ctrl.abort(); }, f.nome === "lettore sul tablet" ? 25000 : 7000);   // il lettore può provare più fonti
    return fetch(f.url, { cache: "no-store", signal: ctrl ? ctrl.signal : undefined }).then(function (r) {
      clearTimeout(t); if (!r.ok) throw new Error(r.status); return r.json();
    }).then(function (j) { cielo.fonte = f.nome; return f.nome === "OpenSky" ? daOpenSky(j) : j; }, function (e) {
      clearTimeout(t); errori.push(f.nome + ": " + (e && e.message === "Failed to fetch" ? "bloccato" : (e && e.message) || "errore"));
      return prova(i + 1);
    });
  }
  return prova(0)
    .then(function (j) {
      cielo.aerei = (j.ac || j.aircraft || []).filter(function (a) { return typeof a.lat === "number"; }).map(function (a) {
        var p = { lat: a.lat, lon: a.lon }, quota = a.alt_baro === "ground" ? 0 : (a.alt_geom || a.alt_baro);
        return { nome: (a.flight || a.r || a.hex || "").trim(), tipo: a.t || "", quota: typeof quota === "number" ? quota * 0.3048 : null,
          vel: a.gs ? a.gs * 1.852 : null, rotta: a.track, km: distanzaKm(CASA, p), dir: rotta(CASA, p) };
      }).filter(function (a) { return a.km <= RAGGIO_KM; }).sort(function (a, b) { return a.km - b.km; });
      cielo.erroreAerei = "";
    }, function (e) { cielo.erroreAerei = e.message || "errore"; })
    .then(disegnaRadar);
}
function disegnaRadar() {
  var svg = $("radar"); svg.innerHTML = "";
  [1, 2, 3].forEach(function (k) { svg.appendChild(svgEl("circle", { cx: 0, cy: 0, r: k * 30, class: "anello" })); });
  svg.appendChild(svgEl("path", { d: "M0 -92V92M-92 0H92", class: "anello" }));
  var n = svgEl("text", { x: 0, y: -80, class: "nord" }); n.textContent = "N"; svg.appendChild(n);
  function pos(km, dir) { var r = km / RAGGIO_KM * 90; return [Math.sin(dir * RAD) * r, -Math.cos(dir * RAD) * r]; }
  var b = pos(distanzaKm(CASA, BLQ), rotta(CASA, BLQ));
  var t = svgEl("text", { x: b[0] + 4, y: b[1] + 3, class: "blq" }); t.textContent = "BLQ"; svg.appendChild(t);
  svg.appendChild(svgEl("rect", { x: b[0] - 1.6, y: b[1] - 1.6, width: 3.2, height: 3.2, class: "blq-p" }));
  svg.appendChild(svgEl("circle", { cx: 0, cy: 0, r: 2.6, class: "casa" }));
  var lista = $("aerei"); lista.innerHTML = "";
  if (cielo.erroreAerei) {   // con il dettaglio delle fonti provate, per capire cosa non va
    lista.innerHTML = '<li class="vuoto">Dati degli aerei non disponibili, riprovo.<small></small></li>';
    lista.querySelector("small").textContent = cielo.erroreAerei; $("aerei-conta").textContent = ""; return;
  }
  if (!cielo.aerei) return;
  cielo.aerei.forEach(function (a, i) {
    var p = pos(a.km, a.dir), g = svgEl("g", { transform: "translate(" + p[0].toFixed(1) + " " + p[1].toFixed(1) + ") rotate(" + (a.rotta || 0) + ")" });
    g.appendChild(svgEl("path", { d: "M0 -6L4 5L0 2.5L-4 5Z", class: "aereo" + (i < 3 ? " vicino" : "") }));
    svg.appendChild(g);
  });
  if (!cielo.aerei.length) { lista.innerHTML = '<li class="vuoto">Nessun aereo entro ' + RAGGIO_KM + ' km in questo momento.</li>'; $("aerei-conta").textContent = cielo.fonte; return; }
  cielo.aerei.slice(0, 4).forEach(function (a) {
    var li = el("li"), n = el("b"), d = el("span");
    n.textContent = a.nome || "?";
    d.textContent = [a.tipo, a.quota != null ? (a.quota < 30 ? "a terra" : numero(a.quota) + " m") : "", a.km.toFixed(0) + " km " + puntoCardinale(a.dir)].filter(Boolean).join(" · ");
    li.appendChild(n); li.appendChild(d); lista.appendChild(li);
  });
  $("aerei-conta").textContent = cielo.aerei.length + (cielo.aerei.length === 1 ? " aereo" : " aerei") + " · " + cielo.fonte;
}

function avviaCielo() {
  avviaISS(); setInterval(aggiornaISS, 15 * 1000);
  setInterval(avviaISS, 6 * 3600 * 1000);   // orbita aggiornata ogni 6 ore
  disegnaRadar();
}
function cieloVisibile(visibile) {   // gli aerei si leggono solo mentre la schermata è aperta
  clearInterval(cielo.tAerei); cielo.tAerei = null;
  if (visibile) { leggiAerei(); cielo.tAerei = setInterval(function () { if (document.visibilityState === "visible") leggiAerei(); }, 20 * 1000); }
}
