// Home2Love — il paesaggio di Bologna dal vivo, con il meteo vero (Open-Meteo): cielo che segue il sole, sole e luna
// dove sono davvero, nuvole col vento, pioggia, neve, nebbia, lampi; i colli con San Luca, i tetti e le Due Torri.
// Lo usano "Casa · Dove siete?" (dove.html) e il comodino. PAESAGGIO.avvia({ tela, scena, testo(info), attivo(), ms, primoPiano(g, info) }).
var PAESAGGIO = (function () {
var OPZ = { ms: 33 };
var prova = new URLSearchParams(location.search);   // ?prova=pioggia|neve|temporale|nebbia|sereno|nuvoloso&ora=21:30 per vederlo subito
function adesso() {
  var d = new Date(), o = prova.get("ora");
  if (o && /^\d{1,2}:\d{2}$/.test(o)) { var p = o.split(":"); d.setHours(+p[0], +p[1]); }
  return d;
}

// ================= sole e luna: dove sono davvero =================
function posSole(d) {   // altezza e azimut in gradi (formula NOAA)
  var rad = Math.PI / 180, n = (d - Date.UTC(d.getUTCFullYear(), 0, 1)) / 864e5, ora = d.getUTCHours() + d.getUTCMinutes() / 60;
  var g = 2 * Math.PI / 365 * (n - 1 + (ora - 12) / 24);
  var eq = 229.18 * (.000075 + .001868 * Math.cos(g) - .032077 * Math.sin(g) - .014615 * Math.cos(2 * g) - .040849 * Math.sin(2 * g));
  var dec = .006918 - .399912 * Math.cos(g) + .070257 * Math.sin(g) - .006758 * Math.cos(2 * g) + .000907 * Math.sin(2 * g) - .002697 * Math.cos(3 * g) + .00148 * Math.sin(3 * g);
  var tst = ora * 60 + eq + 4 * LON, ha = (tst / 4 - 180) * rad, lat = LAT * rad;
  var cz = Math.sin(lat) * Math.sin(dec) + Math.cos(lat) * Math.cos(dec) * Math.cos(ha), z = Math.acos(Math.max(-1, Math.min(1, cz)));
  var az = Math.acos(Math.max(-1, Math.min(1, (Math.sin(lat) * Math.cos(z) - Math.sin(dec)) / (Math.cos(lat) * Math.sin(z))))) / rad;
  az = ha > 0 ? (az + 180) % 360 : (540 - az) % 360;
  return { alt: 90 - z / rad, az: az };
}
function etaLuna(d) { var s = 29.530588853, x = ((d - Date.UTC(2000, 0, 6, 18, 14)) / 864e5) % s; return (x + s) % s / s; }   // 0 nuova · .5 piena
function posLuna(d) { return posSole(new Date(d.getTime() - etaLuna(d) * 864e5 * 1.0347)); }   // la luna "ritarda" sul sole di circa un giorno al mese

// ================= meteo =================
var M = null;   // { t, codice, nuvole 0..1, mm, vento km/h, verso (gradi), giorno, j }
function tipo(c) {
  return c >= 95 ? "temporale" : (c >= 71 && c <= 77) || c === 85 || c === 86 ? "neve" : (c >= 51 && c <= 67) || (c >= 80 && c <= 82) ? "pioggia" : c === 45 || c === 48 ? "nebbia" : c === 3 ? "coperto" : c >= 1 ? "nuvoloso" : "sereno";
}
function descrizione(c) {
  return { 0: "Sereno", 1: "Quasi sereno", 2: "Poco nuvoloso", 3: "Coperto", 45: "Nebbia", 48: "Nebbia gelata", 51: "Pioggerella", 53: "Pioggerella", 55: "Pioggerella fitta", 56: "Pioggerella gelata", 57: "Pioggerella gelata",
    61: "Pioggia debole", 63: "Pioggia", 65: "Pioggia forte", 66: "Pioggia gelata", 67: "Pioggia gelata", 71: "Neve debole", 73: "Neve", 75: "Neve forte", 77: "Nevischio",
    80: "Rovesci", 81: "Rovesci", 82: "Rovesci forti", 85: "Rovesci di neve", 86: "Rovesci di neve", 95: "Temporale", 96: "Temporale con grandine", 99: "Temporale con grandine" }[c] || "";
}
function leggiMeteo() {
  var finti = { pioggia: [63, .95, 2.5, 18], neve: [73, .95, 1.2, 8], temporale: [95, 1, 6, 30], nebbia: [45, .6, 0, 4], sereno: [0, 0, 0, 6], nuvoloso: [2, .5, 0, 12] }, f = finti[prova.get("prova")];
  if (f) { M = { t: 9, codice: f[0], nuvole: f[1], mm: f[2], vento: f[3], verso: 250, j: null }; aggiornaTesto(); preparaSfondo(); preparaNuvole(); preparaParticelle(); return; }
  fetch("https://api.open-meteo.com/v1/forecast?latitude=" + LAT + "&longitude=" + LON +
    "&current=temperature_2m,weather_code,cloud_cover,precipitation,wind_speed_10m,wind_direction_10m&hourly=precipitation_probability,precipitation,weather_code&timezone=Europe%2FRome&forecast_days=2")
    .then(function (r) { return r.json(); }).then(function (j) {
      var c = j.current;
      M = { t: c.temperature_2m, codice: c.weather_code, nuvole: (c.cloud_cover || 0) / 100, mm: c.precipitation || 0, vento: c.wind_speed_10m || 0, verso: c.wind_direction_10m || 0, j: j };
      aggiornaTesto(); preparaSfondo(); preparaNuvole(); preparaParticelle();
    }, function () {});
}
function prossimaPioggia() {   // "Stasera piove verso le 19" / "Smette verso le 16"
  var j = M && M.j; if (!j || !j.hourly) return "";
  var h = j.hourly, d = adesso(), ora = d.getFullYear() + "-" + due(d.getMonth() + 1) + "-" + due(d.getDate()) + "T" + due(d.getHours()) + ":00", i0 = h.time.indexOf(ora);
  if (i0 < 0) return "";
  var bagnato = function (i) { return h.precipitation[i] >= .2 || h.precipitation_probability[i] >= 55; };
  var neve = function (i) { var c = h.weather_code[i]; return (c >= 71 && c <= 77) || c === 85 || c === 86; };
  var quando = function (i) {
    var t = new Date(h.time[i]), oggi = t.getDate() === d.getDate(), o = t.getHours();
    return [oggi ? (o < 12 ? "stamattina" : o < 18 ? "oggi pomeriggio" : o < 22 ? "stasera" : "stanotte") : (o < 6 ? "stanotte" : o < 12 ? "domani mattina" : o < 18 ? "domani pomeriggio" : "domani sera"), o === 0 ? "verso mezzanotte" : o === 1 ? "verso l'una" : "verso le " + o];
  };
  var su = function (x) { return x.charAt(0).toUpperCase() + x.slice(1); };
  var t0 = tipo(M.codice), oraPiove = t0 === "pioggia" || t0 === "temporale" || t0 === "neve" || M.mm >= .1;
  for (var i = i0 + 1; i < Math.min(h.time.length, i0 + 25); i++) {
    if (oraPiove && !bagnato(i)) { var q = quando(i); return (t0 === "neve" ? "Smette di nevicare " : "Smette ") + q[0] + " " + q[1]; }   // "Smette stasera verso le 19"
    if (!oraPiove && bagnato(i)) { var x = quando(i); return su(x[0]) + (neve(i) ? " nevica " : " piove ") + x[1]; }       // "Stasera piove verso le 19"
  }
  return oraPiove ? (t0 === "neve" ? "Nevica per tutto il giorno" : "Piove per tutto il giorno") : "Niente pioggia nelle prossime 24 ore";
}
function aggiornaTesto() { if (M && OPZ.testo) OPZ.testo({ temp: M.t, codice: M.codice, descr: descrizione(M.codice), pioggia: prossimaPioggia() }); }

// ================= colori del cielo secondo l'altezza del sole =================
function hex(c) { return [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)]; }
function mix(a, b, t) { t = Math.max(0, Math.min(1, t)); return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]; }
function css(c, a) { return "rgba(" + Math.round(c[0]) + "," + Math.round(c[1]) + "," + Math.round(c[2]) + "," + (a === undefined ? 1 : a) + ")"; }
var TAPPE = [   // altezza del sole → [alto, basso (orizzonte)]
  [-18, "#04060f", "#0a1128"], [-9, "#0a1030", "#1d2350"], [-4, "#1a1d4a", "#7a4a6e"], [0, "#2c3570", "#e0805a"], [5, "#3f62a6", "#f2b27a"], [14, "#3b78c4", "#a9cdee"], [40, "#2f6fc0", "#9fcaf0"]
];
function cielo(alt) {
  for (var i = 1; i < TAPPE.length; i++) if (alt < TAPPE[i][0] || i === TAPPE.length - 1) {
    var a = TAPPE[i - 1], b = TAPPE[i], t = (alt - a[0]) / (b[0] - a[0]);
    return [mix(hex(a[1]), hex(b[1]), t), mix(hex(a[2]), hex(b[2]), t)];
  }
}
function grigiore(t, cop) { return t === "pioggia" || t === "temporale" || t === "neve" ? .75 : t === "nebbia" ? .6 : t === "coperto" ? .55 : cop * .35; }
function coloriCielo(s) {   // [alto, orizzonte] tenendo conto delle nuvole
  var col = cielo(s.alt), L = luce(s.alt), gr = grigiore(M ? tipo(M.codice) : "", M ? M.nuvole : .3);
  return [mix(col[0], mix([120, 128, 140], [16, 20, 30], 1 - L), gr), mix(col[1], mix([165, 172, 182], [26, 30, 40], 1 - L), gr)];
}
function luce(alt) { return Math.max(.08, Math.min(1, (alt + 10) / 22)); }   // quanto è illuminata la scena (0 notte · 1 giorno)

// ================= scena =================
var tela = null, g = null, W = 0, H = 0, DPR = 1, ORIZ = 0;
var sfondo = document.createElement("canvas"), sprite = [], NUV = [], GOCCE = [], STELLE = [], lampo = 0, prossimoLampo = 0;
function rnd(s) { var x = Math.sin(s * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); }   // casuale ma sempre uguale
function ridimensiona() {
  if (!tela) return;
  DPR = Math.min(1.5, devicePixelRatio || 1); var sc = OPZ.scena || tela.parentNode; W = sc.clientWidth; H = sc.clientHeight; ORIZ = H * (W > H ? .7 : .74);
  tela.width = W * DPR; tela.height = H * DPR; sfondo.width = W * DPR; sfondo.height = H * DPR;
  STELLE = []; for (var i = 0; i < 160; i++) STELLE.push([rnd(i) * W, rnd(i + 500) * ORIZ * .92, rnd(i + 900) * 1.2 + .25, rnd(i + 1300) * 6]);
  preparaSfondo(); preparaNuvole(); preparaParticelle();
}
function profiloColli(x, sem) { return Math.sin(x * .0042 + sem) * 18 + Math.sin(x * .011 + sem * 2) * 9 + Math.sin(x * .027 + sem * 3) * 4; }
var BASE = 0;   // dove poggiano i tetti (in pixel): serve a chi disegna davanti (la casetta)
function preparaSfondo() {   // colli, San Luca, tetti e torri: si ridisegnano solo quando cambia la luce
  if (!W) return;
  var d = adesso(), s = posSole(d), L = luce(s.alt), col = coloriCielo(s), c = sfondo.getContext("2d");
  c.setTransform(DPR, 0, 0, DPR, 0, 0); c.clearRect(0, 0, W, H);
  var scuro = function (k) { return css(mix([6, 8, 16], col[1], k * L)); };
  var tinta = function (rgb, k) { return css(mix(mix([8, 10, 20], rgb, L * .92), col[1], k || 0)); };   // colori veri di giorno, ombre di notte
  var K = Math.max(.7, Math.min(W, H) / 560);
  // colli lontani (nella foschia) con San Luca
  var colle = function (x) { return ORIZ - 26 - profiloColli(x, 1.3) * (H / 700); };
  c.fillStyle = scuro(.55); c.beginPath(); c.moveTo(0, H);
  for (var x = 0; x <= W; x += 5) c.lineTo(x, colle(x));
  c.lineTo(W, H); c.fill();
  var sx = W * .7, sy = colle(sx) - 2, k = Math.max(.75, H / 760);
  c.fillStyle = scuro(.42);
  c.fillRect(sx - 14 * k, sy - 10 * k, 28 * k, 10 * k);                                   // la basilica
  c.beginPath(); c.ellipse(sx, sy - 10 * k, 9 * k, 9.5 * k, 0, Math.PI, 0); c.fill();        // la cupola
  c.fillRect(sx - 1.6 * k, sy - 24 * k, 3.2 * k, 6 * k); c.beginPath(); c.arc(sx, sy - 24.5 * k, 2 * k, Math.PI, 0); c.fill();   // la lanterna
  c.fillRect(sx - 18 * k, sy - 15 * k, 4 * k, 15 * k); c.fillRect(sx + 14 * k, sy - 15 * k, 4 * k, 15 * k);   // i due campaniletti
  c.beginPath(); c.moveTo(sx - 18.6 * k, sy - 15 * k); c.lineTo(sx - 16 * k, sy - 19 * k); c.lineTo(sx - 13.4 * k, sy - 15 * k); c.fill();
  c.beginPath(); c.moveTo(sx + 13.4 * k, sy - 15 * k); c.lineTo(sx + 16 * k, sy - 19 * k); c.lineTo(sx + 18.6 * k, sy - 15 * k); c.fill();
  c.strokeStyle = scuro(.42); c.lineWidth = 1.4 * k; c.beginPath();                          // il portico che scende, con gli archetti
  for (var p = 0; p <= 1.001; p += .01) { var px = sx - 16 * k - p * W * .18; c.lineTo(px, colle(px) + p * 16 - 1); }
  c.stroke();
  c.lineWidth = .7 * k;
  for (p = 0; p <= 1; p += .025) { var ax = sx - 16 * k - p * W * .18, ay = colle(ax) + p * 16 - 1; c.beginPath(); c.arc(ax, ay + 2.2 * k, 1.3 * k, Math.PI, 0); c.stroke(); }
  // colli vicini
  c.fillStyle = scuro(.33); c.beginPath(); c.moveTo(0, H);
  for (x = 0; x <= W; x += 5) c.lineTo(x, ORIZ - 4 - profiloColli(x, 4.1) * .55 * (H / 700));
  c.lineTo(W, H); c.fill();
  // la città: una fila di case dietro (più chiare, nella foschia) e una davanti, color mattone e ocra
  var base = H * (W > H ? .86 : .88); BASE = base;
  var PAL = [[178, 84, 58], [196, 106, 63], [208, 138, 78], [168, 72, 58], [201, 119, 74], [184, 107, 76], [214, 160, 96]];
  var finestre = [];
  [[.55, base - 16 * K, .45], [1, base, 0]].forEach(function (fila, f) {
    var sc = fila[0], b0 = fila[1], neb = fila[2];
    for (var x = -10, i = f * 300; x < W + 40; i++) {
      var lw = (30 + rnd(i) * 52) * K * (f ? 1 : .8), lh = (16 + rnd(i + 40) * 34) * K * (f ? 1 : .9) + (f ? 0 : 14 * K), colr = PAL[Math.floor(rnd(i + 7) * PAL.length)];
      c.fillStyle = tinta(colr, neb); c.fillRect(x, b0 - lh, lw + 1, H - b0 + lh);
      c.fillStyle = tinta(mix(colr, [0, 0, 0], .18), neb); c.fillRect(x + lw * .82, b0 - lh, lw * .18 + 1, H - b0 + lh);   // il lato in ombra
      var tetto = rnd(i + 80);
      c.fillStyle = tinta([120, 52, 38], neb);
      if (tetto > .35) { c.beginPath(); c.moveTo(x - 2, b0 - lh); c.lineTo(x + lw / 2, b0 - lh - lw * .2); c.lineTo(x + lw + 2, b0 - lh); c.fill(); }   // tetto a capanna di coppi
      else c.fillRect(x - 1, b0 - lh - 3 * K, lw + 2, 3 * K);
      if (rnd(i + 120) > .55) { c.fillStyle = tinta([110, 60, 50], neb); c.fillRect(x + lw * .25, b0 - lh - (tetto > .35 ? lw * .12 : 0) - 9 * K, 4 * K, 9 * K); }   // il comignolo
      if (f) for (var r = 0; r < 3; r++) for (var q = 0; q < 3; q++) {   // le finestre
        var wx = x + lw * (.16 + q * .26), wy = b0 - lh + 8 * K + r * 14 * K;
        if (wy > b0 - 6 * K || wx > x + lw - 6 * K) continue;
        finestre.push([wx, wy, rnd(i * 13 + r * 3 + q)]);
      }
      x += lw;
    }
  });
  finestre.forEach(function (w) { c.fillStyle = css(mix([60, 40, 34], [10, 10, 16], 1 - L), .55); c.fillRect(w[0], w[1], 4 * K, 6 * K); });
  // le Due Torri: l'Asinelli (alta, coi merli) e la Garisenda (bassa, che pende)
  var tx = W * (W > H ? .38 : .14), tw = Math.max(9, Math.min(W, H) * .032), th = Math.min(tw * 12, H * .36);
  var mattone = [150, 82, 56];
  c.fillStyle = tinta(mattone);
  c.beginPath(); c.moveTo(tx - tw * .08, base); c.lineTo(tx + tw * .06, base - th); c.lineTo(tx + tw * .94, base - th); c.lineTo(tx + tw * 1.08, base); c.fill();   // un filo rastremata
  c.fillStyle = tinta(mix(mattone, [0, 0, 0], .28)); c.beginPath(); c.moveTo(tx + tw * .62, base); c.lineTo(tx + tw * .6, base - th); c.lineTo(tx + tw * .94, base - th); c.lineTo(tx + tw * 1.08, base); c.fill();
  c.fillStyle = tinta(mattone); c.fillRect(tx - tw * .22, base - th - tw * .42, tw * 1.44, tw * .42);   // la cella in cima
  for (var m = 0; m < 4; m++) c.fillRect(tx - tw * .22 + m * tw * .4, base - th - tw * .72, tw * .24, tw * .3);   // i merli
  c.fillRect(tx + tw * .38, base - th - tw * 1.25, tw * .24, tw * .55);                                     // l'asta
  c.fillStyle = tinta([180, 110, 70]); c.fillRect(tx - tw * .7, base - tw * 1.6, tw * 2.4, tw * 1.6);   // la rocchetta alla base
  c.fillStyle = css(mix([30, 16, 12], [8, 8, 14], 1 - L), .7);
  for (m = 1; m < 7; m++) c.fillRect(tx + tw * .4, base - th * m / 7, tw * .14, tw * .5);               // le feritoie
  c.save(); c.translate(tx + tw * 2.2, base); c.rotate(-.07);
  c.fillStyle = tinta(mix(mattone, [255, 255, 255], .06)); c.fillRect(0, -th * .44, tw * 1.25, th * .44);
  c.fillStyle = tinta(mix(mattone, [0, 0, 0], .28)); c.fillRect(tw * .85, -th * .44, tw * .4, th * .44);
  c.fillStyle = tinta(mattone); c.fillRect(-tw * .06, -th * .44 - tw * .25, tw * 1.37, tw * .25);
  c.restore();
  // finestre accese quando fa buio: si accendono un po' alla volta (sempre le stesse)
  if (L < .6) {
    var accese = 1 - L / .6;
    finestre.forEach(function (w) { if (w[2] < accese * .55) { c.fillStyle = "rgba(255,196,120," + (.55 + .4 * accese).toFixed(2) + ")"; c.fillRect(w[0], w[1], 4 * K, 6 * K); } });
    c.fillStyle = "rgba(255,196,120," + (.8 * accese).toFixed(2) + ")"; c.fillRect(tx + tw * .4, base - th * .55, 3, 4);
  }
}
function preparaNuvole() {   // nuvole fatte di sbuffi morbidi, colorate dalla luce del momento
  if (!W) return;
  var s = posSole(adesso()), L = luce(s.alt), col = cielo(s.alt), cop = M ? M.nuvole : .3, t = M ? tipo(M.codice) : "";
  var grigio = t === "pioggia" || t === "temporale" || t === "neve" ? .55 : t === "coperto" ? .3 : 0;
  var chiaro = mix(mix([255, 255, 255], col[1], .25), [120, 128, 140], grigio), base = mix(chiaro, [12, 16, 28], 1 - L);
  var tramonto = s.alt > -6 && s.alt < 8 ? mix([255, 160, 120], [255, 255, 255], (s.alt + 6) / 14) : null;
  sprite = [];
  for (var k = 0; k < 4; k++) {
    var cv = document.createElement("canvas"), w = 420, h = 200; cv.width = w; cv.height = h; var c = cv.getContext("2d");
    for (var b = 0; b < 26; b++) {
      var q = rnd(k * 40 + b), bx = w * (.12 + q * .76), alto = 1 - Math.abs(q - .5) * 1.6, r = h * (.09 + rnd(k * 40 + b + 33) * .13) * (.7 + alto * .6);
      var by = h * .66 - alto * h * .22 * rnd(k * 40 + b + 17) - r * .2;
      var gr = c.createRadialGradient(bx, by - r * .3, 0, bx, by, r), sopra = tramonto && L > .2 ? mix(base, tramonto, .5) : base;
      gr.addColorStop(0, css(sopra, .9)); gr.addColorStop(.6, css(base, .55)); gr.addColorStop(1, css(base, 0));
      c.fillStyle = gr; c.beginPath(); c.arc(bx, by, r, 0, 7); c.fill();
    }
    c.globalCompositeOperation = "destination-out";   // base piatta, come le nuvole vere
    var tg = c.createLinearGradient(0, h * .64, 0, h * .8); tg.addColorStop(0, "rgba(0,0,0,0)"); tg.addColorStop(1, "rgba(0,0,0,1)");
    c.fillStyle = tg; c.fillRect(0, h * .64, w, h * .36); c.globalCompositeOperation = "source-over";
    sprite.push(cv);
  }
  var n = Math.round(cop < .08 ? 0 : 1 + cop * 18), prima = NUV;
  NUV = [];
  for (var i = 0; i < n; i++) NUV.push(prima[i] || { x: rnd(i * 9 + 1) * W * 1.4 - W * .2, y: ORIZ * (.04 + rnd(i * 9 + 2) * (cop > .8 ? .6 : .48)), s: (.6 + rnd(i * 9 + 3) * 1.1) * Math.max(1, W / 700), k: i % 4, a: .55 + rnd(i * 9 + 4) * .4 });
}
function preparaParticelle() {
  GOCCE = []; if (!M || !W) return;
  var t = tipo(M.codice), n = t === "neve" ? Math.round(90 + M.mm * 70) : t === "pioggia" || t === "temporale" ? Math.round(80 + M.mm * 110) : 0;
  for (var i = 0; i < Math.min(n, 480); i++) GOCCE.push({ x: Math.random() * W, y: Math.random() * H, v: .6 + Math.random() * .8, r: Math.random() });
}
function ventoX() { if (!M) return 0; var vx = -Math.sin(M.verso * Math.PI / 180) * M.vento; return Math.max(-30, Math.min(30, vx)); }   // da dove soffia → verso dove va

// ================= un po' di vita: rondini di giorno, lucciole nelle notti d'estate =================
var RONDINI = [], LUCCIOLE = [];
function vita(ora, dt, s, L, t) {
  var asciutto = t !== "pioggia" && t !== "temporale" && t !== "neve" && t !== "nebbia", mese = adesso().getMonth();
  if (asciutto && L > .6 && mese >= 2 && mese <= 9) {   // le rondini, da marzo a ottobre
    if (!RONDINI.length) for (var i = 0; i < 5; i++) RONDINI.push({ x: Math.random() * W, y: ORIZ * (.25 + Math.random() * .4), v: 40 + Math.random() * 50, f: Math.random() * 6, k: .7 + Math.random() * .6 });
    g.strokeStyle = "rgba(25,28,40,.75)"; g.lineCap = "round";
    RONDINI.forEach(function (r) {
      r.x += r.v * dt; r.y += Math.sin(ora / 700 + r.f) * 12 * dt; if (r.x > W + 30) { r.x = -30; r.y = ORIZ * (.25 + Math.random() * .4); }
      var a = Math.sin(ora / 110 + r.f) * 4 * r.k, w = 8 * r.k * Math.max(1, Math.min(W, H) / 700);
      g.lineWidth = 1.6 * r.k; g.beginPath(); g.moveTo(r.x - w, r.y - a); g.quadraticCurveTo(r.x - w * .3, r.y - a * .2, r.x, r.y + 1); g.quadraticCurveTo(r.x + w * .3, r.y - a * .2, r.x + w, r.y - a); g.stroke();
    });
  } else RONDINI = [];
  if (asciutto && L < .25 && mese >= 5 && mese <= 7) {   // le lucciole, da giugno ad agosto
    if (!LUCCIOLE.length) for (var j = 0; j < 26; j++) LUCCIOLE.push({ x: Math.random() * W, y: BASE + Math.random() * (H - BASE) - 20, f: Math.random() * 9, vx: 0, vy: 0 });
    LUCCIOLE.forEach(function (l) {
      l.vx += (Math.random() - .5) * 18 * dt; l.vy += (Math.random() - .5) * 18 * dt; l.vx *= .96; l.vy *= .96; l.x += l.vx * dt * 8; l.y += l.vy * dt * 8;
      if (l.x < 0) l.x = W; if (l.x > W) l.x = 0; if (l.y < BASE - 60) l.vy += 2; if (l.y > H) l.vy -= 2;
      var a = Math.max(0, Math.sin(ora / 600 + l.f)); if (a < .05) return;
      var gl = g.createRadialGradient(l.x, l.y, 0, l.x, l.y, 9); gl.addColorStop(0, "rgba(220,255,140," + (.9 * a).toFixed(2) + ")"); gl.addColorStop(1, "rgba(220,255,140,0)");
      g.fillStyle = gl; g.fillRect(l.x - 9, l.y - 9, 18, 18);
    });
  } else LUCCIOLE = [];
}

var ultimo = 0, ultimoSfondo = 0;
function frame(ora) {
  requestAnimationFrame(frame);
  if (ora - ultimo < OPZ.ms) return;   // circa 30 al secondo: basta e avanza, e il telefono vecchio non scalda
  if (OPZ.attivo && !OPZ.attivo()) return;   // per esempio nel tablet, quando la pagina non è in vista
  var dt = Math.min(100, ora - ultimo) / 1000; ultimo = ora;
  if (ora - ultimoSfondo > 300000) { ultimoSfondo = ora; preparaSfondo(); preparaNuvole(); }
  var d = adesso(), s = posSole(d), L = luce(s.alt), col = cielo(s.alt), t = M ? tipo(M.codice) : "", cop = M ? M.nuvole : .3;
  var grigio = grigiore(t, cop), cc = coloriCielo(s), sopra = cc[0], sotto = cc[1];
  g.setTransform(DPR, 0, 0, DPR, 0, 0);
  var gr = g.createLinearGradient(0, 0, 0, ORIZ); gr.addColorStop(0, css(sopra)); gr.addColorStop(1, css(sotto));
  g.fillStyle = gr; g.fillRect(0, 0, W, H);
  // stelle
  var vis = Math.max(0, Math.min(1, (-s.alt - 6) / 8)) * (1 - Math.min(1, cop * 1.3));
  if (vis > .02) STELLE.forEach(function (st) { g.fillStyle = "rgba(255,255,255," + (vis * (.35 + .65 * Math.abs(Math.sin(ora / 2400 + st[3])))).toFixed(3) + ")"; g.beginPath(); g.arc(st[0], st[1], st[2], 0, 7); g.fill(); });
  // sole o luna, dove sono (guardando verso sud: est a sinistra, ovest a destra)
  var cx = function (az) { return W * (az - 90) / 180; }, cy = function (alt) { return ORIZ - alt / 62 * ORIZ * .92; };
  var velo = Math.max(0, 1 - grigio * 1.3);   // con il cielo coperto sole e luna non si vedono
  if (s.alt > -3) {
    var sx = cx(s.az), sy = cy(s.alt), rr = Math.max(14, Math.min(W, H) * .035);
    var al = g.createRadialGradient(sx, sy, 0, sx, sy, rr * 9); al.addColorStop(0, css(s.alt < 8 ? [255, 190, 120] : [255, 244, 214], .55 * velo)); al.addColorStop(1, "rgba(255,220,170,0)");
    g.fillStyle = al; g.fillRect(0, 0, W, H);
    g.fillStyle = css(s.alt < 6 ? [255, 196, 140] : [255, 250, 232], .95 * velo); g.beginPath(); g.arc(sx, sy, rr, 0, 7); g.fill();
  }
  var lu = posLuna(d), fase = etaLuna(d);
  if (lu.alt > -2 && s.alt < 6) {
    var mx = cx(lu.az), my = cy(lu.alt), mr = Math.max(10, Math.min(W, H) * .026), vl = velo * (s.alt < -4 ? 1 : .5);
    var ml = g.createRadialGradient(mx, my, 0, mx, my, mr * 7); ml.addColorStop(0, "rgba(220,228,255," + (.22 * vl).toFixed(3) + ")"); ml.addColorStop(1, "rgba(220,228,255,0)");
    g.fillStyle = ml; g.fillRect(mx - mr * 7, my - mr * 7, mr * 14, mr * 14);
    g.save(); g.beginPath(); g.arc(mx, my, mr, 0, 7); g.clip();
    g.fillStyle = css(mix(sopra, [0, 0, 0], .3), vl); g.fillRect(mx - mr, my - mr, mr * 2, mr * 2);   // la parte in ombra
    g.fillStyle = "rgba(240,242,250," + (.95 * vl).toFixed(3) + ")"; g.beginPath();               // la parte illuminata
    var cr = Math.cos(fase * 2 * Math.PI), dx = fase < .5 ? 1 : -1;
    g.arc(mx, my, mr, -Math.PI / 2, Math.PI / 2, dx < 0); g.ellipse(mx, my, Math.abs(cr) * mr, mr, 0, Math.PI / 2, -Math.PI / 2, (cr > 0) === (dx > 0)); g.fill();
    g.restore();
  }
  // nuvole che passano col vento
  var vx = ventoX();
  NUV.forEach(function (n) {
    n.x += (4 + Math.abs(vx) * .9) * (vx < 0 ? -1 : 1) * dt * (.6 + n.s * .3);
    var w = 420 * n.s, h = 200 * n.s;
    if (n.x > W + 40) n.x = -w; if (n.x < -w - 40) n.x = W;
    g.globalAlpha = n.a * Math.min(1, .35 + cop); if (sprite[n.k]) g.drawImage(sprite[n.k], n.x, n.y, w, h);
  });
  g.globalAlpha = 1;
  // lampi
  if (t === "temporale") {
    if (ora > prossimoLampo) { lampo = 1; prossimoLampo = ora + 5000 + Math.random() * 14000; }
    if (lampo > .01) { g.fillStyle = "rgba(225,230,255," + (lampo * .55).toFixed(3) + ")"; g.fillRect(0, 0, W, H); lampo *= .82; }
  }
  // colli, tetti e torri
  g.drawImage(sfondo, 0, 0, W, H);
  vita(ora, dt, s, L, t);
  if (OPZ.primoPiano) OPZ.primoPiano(g, { W: W, H: H, ORIZ: ORIZ, base: BASE, L: L, alt: s.alt, ora: ora, dt: dt, tipo: t, temp: M ? M.t : null });
  // nebbia: veli che scivolano bassi
  if (t === "nebbia" || (t === "coperto" && s.alt < 5 && cop > .9)) {
    for (var f = 0; f < 4; f++) {
      var fy = ORIZ - 40 + f * (H - ORIZ) * .3, fx = Math.sin(ora / (9000 + f * 2600) + f) * W * .15;
      var nb = g.createLinearGradient(0, fy - 90, 0, fy + 90); var nc = mix([200, 206, 214], [40, 46, 60], 1 - L);
      nb.addColorStop(0, css(nc, 0)); nb.addColorStop(.5, css(nc, t === "nebbia" ? .42 : .18)); nb.addColorStop(1, css(nc, 0));
      g.fillStyle = nb; g.fillRect(fx - W * .2, fy - 90, W * 1.4, 180);
    }
  }
  // pioggia e neve
  if (GOCCE.length) {
    var neve = t === "neve";
    g.strokeStyle = css(mix([200, 214, 236], [120, 135, 160], 1 - L), .42); g.lineWidth = 1.1; g.fillStyle = css(mix([255, 255, 255], [170, 180, 200], 1 - L), .85);
    if (!neve) g.beginPath();
    GOCCE.forEach(function (p) {
      if (neve) {
        p.y += (28 + p.v * 30) * dt; p.x += (vx * 1.2 + Math.sin(ora / 900 + p.r * 9) * 14) * dt;
        g.beginPath(); g.arc(p.x, p.y, 1 + p.r * 2.2, 0, 7); g.fill();
      } else {
        var vy = 620 + p.v * 380, sp = vx * 9; p.y += vy * dt; p.x += sp * dt;
        g.moveTo(p.x, p.y); g.lineTo(p.x - sp * .028, p.y - (12 + p.v * 12));
      }
      if (p.y > H + 20) { p.y = -20 - Math.random() * 60; p.x = Math.random() * (W + 200) - 100; }
      if (p.x > W + 120) p.x -= W + 200; if (p.x < -120) p.x += W + 200;
    });
    if (!neve) g.stroke();
  }
}

function avvia(o) {
  for (var k in o) OPZ[k] = o[k];
  tela = OPZ.tela; g = tela.getContext("2d");
  addEventListener("resize", function () { clearTimeout(ridimensiona.t); ridimensiona.t = setTimeout(ridimensiona, 200); });
  addEventListener("scena", function () { clearTimeout(ridimensiona.t); ridimensiona.t = setTimeout(ridimensiona, 50); });
  ridimensiona(); leggiMeteo();
  setInterval(function () { leggiMeteo(); }, 15 * 60000);
  setInterval(aggiornaTesto, 5 * 60000);
  requestAnimationFrame(frame);
}
return { avvia: avvia, adesso: adesso, ridisegnaSfondo: function () { preparaSfondo(); }, meteo: function () { return M; }, opz: OPZ, posSole: posSole, luce: luce, tipo: tipo };
})();
