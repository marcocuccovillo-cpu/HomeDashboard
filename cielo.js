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

// ---------------------------------------------------------------- mappa: tre viste (casa, Italia, mondo)
// Proiezione equirettangolare larga sempre 360 unità; nelle viste vicine la longitudine è corretta col coseno
// della latitudine, così le distanze sono giuste e il cerchio dei 30 km è un cerchio.
var VISTE = {
  casa: { lonMin: 8.4, lonMax: 13.6, latMin: 43.55, latMax: 45.35, terra: "50m" },    // Emilia-Romagna e regioni intorno
  italia: { lonMin: 6.3, lonMax: 19.2, latMin: 36.4, latMax: 47.3, terra: "50m" },
  mondo: { terra: "110m" }
};
var vista = leggi("mappa_vista", "casa"); if (!VISTE[vista]) vista = "casa";
var PROJ = null;
function impostaVista(v) {
  vista = v; var V = VISTE[v];
  if (v === "mondo") PROJ = { mondo: true, H: 180 };
  else { var c = Math.cos((V.latMin + V.latMax) / 2 * RAD), k = 360 / ((V.lonMax - V.lonMin) * c); PROJ = { c: c, k: k, V: V, H: (V.latMax - V.latMin) * k }; }
}
impostaVista(vista);
function xy(lat, lon) {
  if (PROJ.mondo) return [lon + 180, 90 - lat];
  return [(lon - PROJ.V.lonMin) * PROJ.c * PROJ.k, (PROJ.V.latMax - lat) * PROJ.k];
}
function dentro(p, m) { m = m || 0; return p[0] >= -m && p[0] <= 360 + m && p[1] >= -m && p[1] <= PROJ.H + m; }
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
cielo.land = {}; cielo.path = {};
function caricaTerra() {   // terre emerse della risoluzione giusta per la vista (110m mondo, 50m vicino)
  var res = VISTE[vista].terra;
  if (cielo.land[res]) return Promise.resolve();
  return fetch("https://cdn.jsdelivr.net/npm/world-atlas@2.0.2/land-" + res + ".json").then(function (r) { return r.json(); }).then(function (w) {
    var f = topojson.feature(w, w.objects.land); cielo.land[res] = f.features || [f];
  });
}
function caricaRegioni() {
  if (cielo.regioni) return Promise.resolve();
  return fetch("regioni.json").then(function (r) { return r.json(); }).then(function (j) { cielo.regioni = j.regioni; });
}
function pathTerra() {
  var res = VISTE[vista].terra; if (!cielo.land[res]) return "";
  if (cielo.path[vista]) return cielo.path[vista];
  var d = "";
  cielo.land[res].forEach(function (ft) {
    var g = ft.geometry, poli = g.type === "Polygon" ? [g.coordinates] : g.coordinates;
    poli.forEach(function (p) {
      if (!PROJ.mondo) {   // nelle viste vicine salto le terre lontane (più leggero)
        var b = p[0].reduce(function (m, c) { return [Math.min(m[0], c[0]), Math.max(m[1], c[0]), Math.min(m[2], c[1]), Math.max(m[3], c[1])]; }, [999, -999, 999, -999]);
        var V = PROJ.V; if (b[1] < V.lonMin - 2 || b[0] > V.lonMax + 2 || b[3] < V.latMin - 2 || b[2] > V.latMax + 2) return;
      }
      p.forEach(function (anello) { d += anelloTerra(anello); });
    });
  });
  return (cielo.path[vista] = d);
}
function disegnaRegioni(svg) {   // confini ISTAT; la regione di casa evidenziata, i nomi di quelle visibili
  if (PROJ.mondo || !cielo.regioni) return;
  cielo.regioni.forEach(function (r) {
    var d = "", grande = null, area = 0;
    r.a.forEach(function (an) {
      d += percorso(an.map(function (c) { return [c[1], c[0]]; })) + "Z";
      if (an.length > area) { area = an.length; grande = an; }
    });
    svg.appendChild(svgEl("path", { d: d, class: "reg" + (r.id === 8 ? " casa-reg" : "") }));
    if (!grande || (vista !== "casa" && r.id !== 8)) return;   // in vista Italia solo il nome della regione di casa
    // nome al centro della parte visibile della regione (se se ne vede abbastanza)
    var vis = grande.map(function (c) { return xy(c[1], c[0]); }).filter(function (q) { return dentro(q, -6); });
    if (vis.length < Math.max(6, grande.length * 0.12)) return;
    var p = [0, 0]; vis.forEach(function (q) { p[0] += q[0]; p[1] += q[1]; }); p = [p[0] / vis.length, p[1] / vis.length];
    var t = svgEl("text", { x: p[0].toFixed(1), y: p[1].toFixed(1), class: "reg-nome" + (r.id === 8 ? " casa-reg" : "") });
    t.textContent = r.n.replace("Trentino-Alto Adige", "Trentino A.A.").replace("Friuli-Venezia Giulia", "Friuli V.G."); svg.appendChild(t);
  });
}
function frecciaVerso(svg, lat, lon, testo, cls) {   // oggetto fuori dalla vista: freccia sul bordo nella sua direzione
  var c = xy(CASA.lat, CASA.lon), az = rotta(CASA, { lat: lat, lon: lon }) * RAD, dx = Math.sin(az), dy = -Math.cos(az), M = 9;
  var t = Math.min(dx > 0 ? (360 - M - c[0]) / dx : dx < 0 ? (M - c[0]) / dx : 1e9, dy > 0 ? (PROJ.H - M - c[1]) / dy : dy < 0 ? (M - c[1]) / dy : 1e9);
  var x = c[0] + dx * t, y = c[1] + dy * t, g = svgEl("g", { class: "freccia " + (cls || ""), transform: "translate(" + x.toFixed(1) + " " + y.toFixed(1) + ")" });
  g.appendChild(svgEl("path", { d: "M0 -4L3.5 3L0 1.5L-3.5 3Z", transform: "rotate(" + (az / RAD).toFixed(0) + ")" }));
  var l = svgEl("text", { x: dx > .3 ? -6 : 6, y: dy > .3 ? -5 : 9, "text-anchor": dx > .3 ? "end" : "start" }); l.textContent = testo; g.appendChild(l);
  svg.appendChild(g);
}
function disegnaMappa(ora, attuale) {
  var svg = $("iss-mappa"); svg.innerHTML = ""; svg.setAttribute("viewBox", "0 0 360 " + PROJ.H.toFixed(1));
  svg.appendChild(svgEl("rect", { x: 0, y: 0, width: 360, height: PROJ.H, class: "mare" }));
  var t = pathTerra(); if (t) svg.appendChild(svgEl("path", { d: t, class: "terra" }));
  disegnaRegioni(svg);
  // notte: la parte di mondo dove il Sole è sotto l'orizzonte
  var s = sole(ora), dec = s.dec * RAD, polo = dec > 0 ? -90 : 90, dN = "M" + xy(polo, -180).join(" ");
  for (var lon = -180; lon <= 180; lon += (PROJ.mondo ? 3 : 0.5)) { var q = xy(Math.atan(-Math.cos((lon - s.lon) * RAD) / Math.tan(dec)) / RAD, lon); dN += "L" + q[0].toFixed(1) + " " + q[1].toFixed(1); }
  dN += "L" + xy(polo, 180).join(" ") + "Z";
  svg.appendChild(svgEl("path", { d: dN, class: "notte" }));
  // casa vista: cerchio dei 30 km e aerei veri
  var c = xy(CASA.lat, CASA.lon);
  if (vista === "casa") {
    svg.appendChild(svgEl("circle", { cx: c[0], cy: c[1], r: (RAGGIO_KM / 111.2 * PROJ.k).toFixed(1), class: "raggio" }));
    (cielo.aerei || []).forEach(function (a) {
      if (a.lat == null) return; var p = xy(a.lat, a.lon);
      var g = svgEl("g", { transform: "translate(" + p[0].toFixed(1) + " " + p[1].toFixed(1) + ") rotate(" + (a.rotta || 0) + ")" });
      g.appendChild(svgEl("path", { d: "M0 -3.4L2.3 2.8L0 1.4L-2.3 2.8Z", class: "aereo-mappa" })); svg.appendChild(g);
    });
  }
  // traccia della ISS: 45 minuti indietro (tratteggiata) e 45 avanti
  var passato = [], futuro = [];
  for (var m = -45; m <= 45; m += 1) {
    var g = guarda(cielo.satrec, new Date(ora.getTime() + m * 60000)); if (!g) continue;
    (m <= 0 ? passato : futuro).push([g.lat, g.lon]);
  }
  svg.appendChild(svgEl("path", { d: percorso(passato), class: "traccia passata" }));
  svg.appendChild(svgEl("path", { d: percorso(futuro), class: "traccia" }));
  disegnaViaggiMappa(svg);
  svg.appendChild(svgEl("circle", { cx: c[0], cy: c[1], r: 2.2, class: "casa" }));
  var i = xy(attuale.lat, attuale.lon);
  if (dentro(i)) {
    svg.appendChild(svgEl("circle", { cx: i[0], cy: i[1], r: 9, class: "iss-alone" }));
    svg.appendChild(svgEl("circle", { cx: i[0], cy: i[1], r: 3.6, class: "iss" }));
  } else frecciaVerso(svg, attuale.lat, attuale.lon, "ISS " + numero(attuale.dist) + " km", "iss-freccia");
}
function cambiaVista(v) {
  impostaVista(v); salva("mappa_vista", v); seg("mappa-zoom", v);
  Promise.all([window.topojson ? caricaTerra() : null, caricaRegioni()]).then(aggiornaISS, aggiornaISS);
  aggiornaISS();
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
    $("mappa-zoom").onclick = function (e) { var v = e.target.getAttribute("data-v"); if (v) cambiaVista(v); };
    seg("mappa-zoom", vista);
    return Promise.all([window.topojson ? caricaTerra() : null, caricaRegioni()]).then(aggiornaISS);
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
        return { nome: (a.flight || a.r || a.hex || "").trim(), tipo: a.t || "", quota: typeof quota === "number" ? quota * 0.3048 : null, lat: a.lat, lon: a.lon,
          vel: a.gs ? a.gs * 1.852 : null, rotta: a.track, km: distanzaKm(CASA, p), dir: rotta(CASA, p) };
      }).filter(function (a) { return a.km <= RAGGIO_KM; }).sort(function (a, b) { return a.km - b.km; });
      cielo.erroreAerei = "";
    }, function (e) { cielo.erroreAerei = e.message || "errore"; })
    .then(function () { disegnaRadar(); if (vista === "casa") aggiornaISS(); });
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

// ---------------------------------------------------------------- viaggi sulla mappa del mondo
// ♥ posti dove siete stati · ☆ posti dove volete andare · rotta con l'aereo verso il prossimo viaggio
function prossimoViaggio() {
  var oggi = iso(new Date());
  return viaggi.filter(function (v) { return v.stato === "sogno" && v.data && v.data >= oggi; })
    .sort(function (a, b) { return a.data < b.data ? -1 : 1; })[0] || null;
}
function rottaVerso(v) {   // arco di cerchio massimo da Bologna (aeroporto) al viaggio
  var a = [BLQ.lat * RAD, BLQ.lon * RAD], b = [v.lat * RAD, v.lon * RAD];
  var d = 2 * Math.asin(Math.sqrt(Math.pow(Math.sin((b[0] - a[0]) / 2), 2) + Math.cos(a[0]) * Math.cos(b[0]) * Math.pow(Math.sin((b[1] - a[1]) / 2), 2)));
  var punti = [];
  for (var k = 0; k <= 40; k++) {
    var f = k / 40, A = Math.sin((1 - f) * d) / Math.sin(d || 1e-9), B = Math.sin(f * d) / Math.sin(d || 1e-9);
    var x = A * Math.cos(a[0]) * Math.cos(a[1]) + B * Math.cos(b[0]) * Math.cos(b[1]);
    var y = A * Math.cos(a[0]) * Math.sin(a[1]) + B * Math.cos(b[0]) * Math.sin(b[1]);
    var z = A * Math.sin(a[0]) + B * Math.sin(b[0]);
    punti.push([Math.atan2(z, Math.sqrt(x * x + y * y)) / RAD, Math.atan2(y, x) / RAD]);
  }
  return punti;
}
function disegnaViaggiMappa(svg) {
  viaggi.forEach(function (v) {
    var p = xy(v.lat, v.lon), t = svgEl("text", { x: p[0], y: p[1] + 2.4, class: "viaggio " + v.stato });
    t.textContent = v.stato === "fatto" ? "♥" : "☆"; svg.appendChild(t);
  });
  var pv = prossimoViaggio(); cielo.rotta = pv ? rottaVerso(pv) : null;
  if (cielo.rotta) {
    svg.appendChild(svgEl("path", { d: percorso(cielo.rotta), class: "rotta" }));
    var aereo = svgEl("path", { d: "M3 0L-2 -2.2L-1 0L-2 2.2Z", class: "aereo-rotta", id: "aereo-rotta" });
    svg.appendChild(aereo);
  }
  var prox = pv ? Math.round((new Date(pv.data + "T00:00:00") - new Date(new Date().toDateString())) / 864e5) : null;
  var fatti = viaggi.filter(function (v) { return v.stato === "fatto"; }).length, sogni = viaggi.length - fatti;
  var r = $("viaggio-riga");
  if (r) r.textContent = pv ? "✈ " + pv.nome + (prox === 0 ? " oggi!" : prox === 1 ? " domani!" : " tra " + prox + " giorni")
    : viaggi.length ? "♥ " + fatti + (fatti === 1 ? " posto visto" : " posti visti") + " insieme · ☆ " + sogni + " da vedere" : "Aggiungi i vostri viaggi con ✈ +";
}
function animaAereo() {   // l'aereo percorre la rotta in 8 secondi, poi riparte
  var a = document.getElementById("aereo-rotta"), r = cielo.rotta; if (!a || !r) return;
  var f = (Date.now() % 8000) / 8000 * (r.length - 1), i = Math.floor(f), k = f - i, p = r[i], q = r[Math.min(i + 1, r.length - 1)];
  var P = xy(p[0] + (q[0] - p[0]) * k, p[1] + (q[1] - p[1]) * k), Q = xy(q[0], q[1]);
  var ang = Math.atan2(Q[1] - P[1], Q[0] - P[0]) / RAD;
  if (Math.abs(q[1] - p[1]) > 180) return;   // salto della linea del cambio data
  a.setAttribute("transform", "translate(" + P[0].toFixed(1) + " " + P[1].toFixed(1) + ") rotate(" + ang.toFixed(0) + ")");
}
setInterval(animaAereo, 80);

// ---- aggiungere e togliere viaggi
var nuovoViaggio = { stato: "fatto" };
function disegnaListaViaggi() {
  var ul = $("ev-lista"); ul.innerHTML = "";
  if (!viaggi.length) { ul.innerHTML = '<li class="vuoto">Ancora nessun viaggio.</li>'; return; }
  viaggi.slice().sort(function (a, b) { return a.stato === b.stato ? (a.data || "").localeCompare(b.data || "") : a.stato === "sogno" ? -1 : 1; }).forEach(function (v) {
    var li = el("li"), t = el("span"), x = el("button");
    t.textContent = (v.stato === "fatto" ? "♥ " : "☆ ") + v.nome + (v.paese ? ", " + v.paese : "") + (v.data ? " · " + v.data.split("-").reverse().join("/") : "");
    x.type = "button"; x.className = "btn-piccolo"; x.textContent = "Togli";
    x.onclick = function () { viaggi = viaggi.filter(function (y) { return y !== v; }); salva("cucina_viaggi", viaggi); disegnaListaViaggi(); aggiornaISS(); };
    li.appendChild(t); li.appendChild(x); ul.appendChild(li);
  });
}
function apriViaggi() {
  $("ev-luogo").value = ""; $("ev-data").value = ""; $("ev-msg").textContent = "";
  seg("ev-stato", nuovoViaggio.stato); $("ev-data-riga").hidden = nuovoViaggio.stato !== "sogno";
  disegnaListaViaggi(); apri("ed-viaggi");
}
function avviaViaggi() {
  if (!$("ed-viaggi")) return;
  $("viaggio-aggiungi").onclick = apriViaggi;
  $("ev-stato").onclick = function (e) { var v = e.target.getAttribute("data-v"); if (!v) return; nuovoViaggio.stato = v; seg("ev-stato", v); $("ev-data-riga").hidden = v !== "sogno"; };
  $("ed-viaggi").querySelector("form").onsubmit = function (e) {
    e.preventDefault();
    var q = $("ev-luogo").value.trim(); if (!q) return;
    $("ev-msg").textContent = "Cerco " + q + "…";
    fetch("https://geocoding-api.open-meteo.com/v1/search?count=1&language=it&format=json&name=" + encodeURIComponent(q))
      .then(function (r) { return r.json(); }).then(function (j) {
        var x = j.results && j.results[0];
        if (!x) { $("ev-msg").textContent = "Non trovo \"" + q + "\": prova a scriverlo diversamente."; return; }
        viaggi.push({ id: nuovoId(), nome: x.name, paese: x.country || "", lat: +x.latitude.toFixed(3), lon: +x.longitude.toFixed(3),
          stato: nuovoViaggio.stato, data: nuovoViaggio.stato === "sogno" ? $("ev-data").value : "" });
        salva("cucina_viaggi", viaggi);
        $("ev-msg").textContent = "Aggiunto: " + x.name + (x.country ? ", " + x.country : "");
        $("ev-luogo").value = ""; disegnaListaViaggi(); aggiornaISS();
      }, function () { $("ev-msg").textContent = "Non riesco a cercare il luogo, riprova tra poco."; });
  };
}
