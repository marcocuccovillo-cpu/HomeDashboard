// Home2Love — l'acquario della pagina 3 (2 colonne × 2 righe): pixel art viva.
// I pesci nascono dai "Pensavo a te" (uno ogni 5 cuori, più 3 fondatori) e crescono con i giorni.
// Toccando l'acqua si dà da mangiare; di notte la vasca si scurisce e i pesci dormono.
// Sul fondo: sabbia, alghe, uno scrigno che fa bolle e una piccola Bologna con le Due Torri.

(function () {
  var AQ = { cv: null, g: null, W: 0, H: 0, S: 4, pesci: [], cibo: [], bolle: [], t0: performance.now(), ultimoN: -1, avviso: null, alghe: [], sassi: [], scrigno: 0 };
  var SPECIE = [
    { nome: "pesce rosso", corpo: "#ff8a2a", pancia: "#ffc27a", righe: null, coda: "#ff6a1a", alto: .42, max: 15 },
    { nome: "neon", corpo: "#3fb7ff", pancia: "#c7ecff", righe: "#ff3b5c", alto: .3, max: 10, rigaOrizz: true },
    { nome: "pesce pagliaccio", corpo: "#ff7a1a", pancia: "#ffb36b", righe: "#ffffff", alto: .42, max: 12 },
    { nome: "pesce palla", corpo: "#ffd75e", pancia: "#fff2b8", righe: null, coda: "#e8b830", alto: .62, max: 11, puntini: "#c9962a" },
    { nome: "pesce angelo", corpo: "#e9e2ff", pancia: "#ffffff", righe: "#2b2440", alto: .7, max: 14, pinnaAlta: true },
    { nome: "guppy", corpo: "#9b7bff", pancia: "#e3d8ff", righe: null, coda: "#ff5fa2", alto: .34, max: 9, codaGrande: true },
    { nome: "betta", corpo: "#d7263d", pancia: "#ff8a9a", righe: null, coda: "#a8122c", alto: .38, max: 12, codaGrande: true }
  ];
  function casuale(seme) { var x = Math.sin(seme * 9301 + 49297) * 233280; return x - Math.floor(x); }
  function nascita() { var n = leggi("acquario_nascita", 0); if (!n) { n = Date.now(); salva("acquario_nascita", n); } return n; }

  // ---------------------------------------------------------------- quanti pesci e quanto grandi (dai dati di casa)
  function anagrafe() {
    var l = window.pensieri ? pensieri() : [], base = nascita(), out = [];
    for (var i = 0; i < 3; i++) out.push({ id: i, nato: base - i * 864e5 * 3 });   // i fondatori
    for (var k = 4; k < l.length; k += 5) out.push({ id: 100 + k, nato: l[k].t });     // uno ogni 5 cuori
    return out.slice(0, 16);
  }
  function crescita(nato) { return Math.min(1, .35 + (Date.now() - nato) / 864e5 / 14 * .65); }   // adulto in 2 settimane
  var ORDINE = [0, 1, 4, 3, 2, 5, 6];   // le specie si alternano: niente vasca tutta arancione
  function aggiornaPesci() {
    var a = anagrafe();
    a.forEach(function (x, n) {
      if (AQ.pesci.some(function (p) { return p.id === x.id; })) return;
      var sp = SPECIE[ORDINE[n % ORDINE.length]];
      AQ.pesci.push({ id: x.id, sp: sp, nato: x.nato, x: 20 + casuale(x.id) * (AQ.W - 40), y: 15 + casuale(x.id + 1) * (AQ.H - 50),
                      vx: 0, vy: 0, verso: casuale(x.id + 2) < .5 ? -1 : 1, meta: null, fase: casuale(x.id + 3) * 6, nuovo: AQ.ultimoN >= 0 });
    });
    if (AQ.ultimoN >= 0 && a.length > AQ.ultimoN) { AQ.avviso = { testo: "È nato un pesce! 🐟", fino: Date.now() + 6000 }; scintille(); }
    AQ.ultimoN = a.length;
  }

  // ---------------------------------------------------------------- disegno
  function px(c, x, y, w, h) { AQ.g.fillStyle = c; AQ.g.fillRect(Math.round(x), Math.round(y), w || 1, h || 1); }
  function notte() { var h = new Date().getHours() + new Date().getMinutes() / 60; return h >= 21.5 || h < 6.5; }
  function luce() {   // 0 = notte fonda, 1 = pieno giorno (con alba e tramonto morbidi)
    var h = new Date().getHours() + new Date().getMinutes() / 60;
    if (h < 5.5 || h >= 22.5) return 0; if (h < 7.5) return (h - 5.5) / 2; if (h >= 20.5) return (22.5 - h) / 2; return 1;
  }
  function misura() {
    var box = AQ.cv.parentNode, w = Math.floor(box.clientWidth / AQ.S), h = Math.floor(box.clientHeight / AQ.S);
    if (w === AQ.W && h === AQ.H || !w || !h) return;
    AQ.W = AQ.cv.width = w; AQ.H = AQ.cv.height = h; AQ.cv.style.width = w * AQ.S + "px"; AQ.cv.style.height = h * AQ.S + "px";
    AQ.g.imageSmoothingEnabled = false;
    AQ.fondo = h - 10;
    AQ.alghe = []; for (var i = 0; i < Math.round(w / 14); i++) AQ.alghe.push({ x: 4 + casuale(i * 3) * (w - 8), h: 14 + casuale(i * 5) * (h * .45), col: ["#2f9a5a", "#3fbf6a", "#1f7a48", "#5ad17f"][i % 4], fase: casuale(i) * 6 });
    AQ.sassi = []; for (var j = 0; j < w / 3; j++) AQ.sassi.push({ x: casuale(j * 7) * w, y: AQ.fondo + 2 + casuale(j * 11) * 7, c: ["#c9b48a", "#a8936b", "#e3d3ad", "#8f7b56", "#d9c49a"][j % 5], w: 1 + Math.floor(casuale(j * 13) * 2) });
    AQ.pesci.forEach(function (p) { p.x = Math.min(p.x, w - 10); p.y = Math.min(p.y, AQ.fondo - 10); });
  }
  function mescola(a, b, t) {   // colori #rrggbb
    var x = parseInt(a.slice(1), 16), y = parseInt(b.slice(1), 16), r = function (s) { return Math.round(((x >> s) & 255) * (1 - t) + ((y >> s) & 255) * t); };
    return "rgb(" + r(16) + "," + r(8) + "," + r(0) + ")";
  }
  function disegnaAcqua(t, L) {
    var notteSu = [10, 24, 56], giornoSu = [63, 167, 214], giu = [6, 16, 42];
    for (var y = 0; y < AQ.H; y += 2) {   // gradiente a fasce di 2 pixel: più "pixel art"
      var k = y / AQ.H * .85, c = [0, 1, 2].map(function (i) { var su = notteSu[i] + (giornoSu[i] - notteSu[i]) * L; return Math.round(su + (giu[i] - su) * k); });
      AQ.g.fillStyle = "rgb(" + c.join(",") + ")"; AQ.g.fillRect(0, y, AQ.W, 2);
    }
    // riflessi sulla superficie
    for (var x = 0; x < AQ.W; x += 2) { var o = Math.sin(x * .25 + t * 1.6) + Math.sin(x * .11 - t); if (o > .8) px(L > .3 ? "rgba(255,255,255,.35)" : "rgba(180,200,255,.18)", x, 1 + Math.round(o), 2, 1); }
    px(L > .3 ? "rgba(255,255,255,.25)" : "rgba(160,180,255,.12)", 0, 0, AQ.W, 1);
    // raggi di luce (di giorno) o luce di luna (di notte)
    AQ.g.save(); AQ.g.globalAlpha = L > .2 ? .08 + .06 * Math.sin(t * .7) : .05;
    for (var r = 0; r < 5; r++) {
      var x0 = ((r * 53 + t * 4) % (AQ.W + 60)) - 30;
      AQ.g.fillStyle = L > .2 ? "#fff6c8" : "#b8c8ff";
      AQ.g.beginPath(); AQ.g.moveTo(x0, 0); AQ.g.lineTo(x0 + 10, 0); AQ.g.lineTo(x0 + 40, AQ.H); AQ.g.lineTo(x0 + 22, AQ.H); AQ.g.fill();
    }
    AQ.g.restore();
  }
  function disegnaFondo(t, L) {
    var F = AQ.fondo;
    for (var y = F; y < AQ.H; y++) px(mescola("#d9c49a", "#7a6a4c", (y - F) / 10 * .6 + (1 - L) * .5), 0, y, AQ.W, 1);
    for (var x = 0; x < AQ.W; x++) if (Math.sin(x * .35) > .6) px("rgba(255,255,255,.12)", x, F, 1, 1);
    AQ.sassi.forEach(function (s) { px(s.c, s.x, s.y, s.w, 1); });
    disegnaTorri(F, L);
    disegnaScrigno(F, t);
    AQ.alghe.forEach(function (a) {   // alghe che ondeggiano
      for (var k = 0; k < a.h; k++) {
        var sw = Math.sin(t * 1.3 + a.fase + k * .12) * (k / a.h) * 3.5;
        px(k % 6 < 3 ? a.col : mescola(a.col, "#0b3a22", .25), a.x + sw, F + 1 - k, 2, 1);
        if (k % 7 === 3) px(a.col, a.x + sw + (k % 14 < 7 ? 2 : -2), F + 1 - k, 2, 1);
      }
    });
  }
  function disegnaTorri(F, L) {   // Asinelli (dritta) e Garisenda (pende) in miniatura, con le alghe addosso
    var x = Math.round(AQ.W * .7), pietra = "#b86b45", ombra = "#8a4a2c", fin = L > .3 ? "#2a1a14" : "#ffd75e";
    var hA = Math.min(46, Math.round(AQ.H * .42));
    px(ombra, x - 1, F - hA, 7, hA + 1); px(pietra, x, F - hA, 5, hA);
    px(pietra, x - 1, F - hA - 3, 7, 3); px(ombra, x + 1, F - hA - 6, 3, 3); px(pietra, x + 2, F - hA - 8, 1, 2);
    for (var k = 6; k < hA - 4; k += 7) px(fin, x + 2, F - hA + k, 1, 2);
    var hG = Math.round(hA * .55);
    for (var y = 0; y < hG; y++) { var dx = Math.round(y * .12); px(y % 9 < 1 ? ombra : "#c47a52", x + 9 + dx, F - y, 5, 1); }
    px("#c47a52", x + 9 + Math.round(hG * .12) - 1, F - hG - 1, 7, 2);
    px("#3fbf6a", x, F - 4, 2, 4); px("#2f9a5a", x + 12, F - 3, 2, 3);   // un po' di alga sulle torri
  }
  function disegnaScrigno(F, t) {
    var x = Math.round(AQ.W * .18), aperto = AQ.scrigno > performance.now();
    px("#6b3e1f", x, F - 5, 12, 6); px("#8a5a2c", x + 1, F - 4, 10, 4); px("#ffd75e", x + 5, F - 3, 2, 2);
    if (aperto) { px("#6b3e1f", x - 1, F - 10, 3, 6); px("#ffd75e", x + 2, F - 6, 8, 1); px("#fff2b8", x + 4, F - 7, 2, 1); }
    else { px("#7a4a24", x, F - 8, 12, 3); px("#ffd75e", x, F - 6, 12, 1); }
    if (!aperto && Math.random() < .002) { AQ.scrigno = performance.now() + 2500; for (var i = 0; i < 10; i++) AQ.bolle.push({ x: x + 6 + (Math.random() - .5) * 6, y: F - 6, v: 8 + Math.random() * 10, r: Math.random() < .3 ? 2 : 1, ritardo: i * .12 }); }
  }
  function disegnaPesce(p, t, L) {
    var sp = p.sp, Lg = Math.max(6, Math.round(sp.max * 1.35 * crescita(p.nato))), Al = Math.max(3, Math.round(Lg * sp.alto)), v = p.verso, dorme = L < .15;
    var x0 = Math.round(p.x), y0 = Math.round(p.y + Math.sin(t * 2 + p.fase) * (dorme ? .3 : .8)), flap = Math.sin(t * (dorme ? 3 : 10) + p.fase);
    function P(c, dx, dy, w, h) { var x = v > 0 ? x0 + dx : x0 - dx - (w || 1) + 1; px(c, x, y0 + dy, w, h); }
    // coda
    var cl = sp.codaGrande ? Math.round(Al * .9) : Math.round(Al * .6), cw = sp.codaGrande ? 4 : 3;
    for (var k = 0; k < cw; k++) { var a = Math.round((cl / 2) * (k + 1) / cw + flap * (k / cw)); P(sp.coda || sp.corpo, -k - 1, -a, 1, a * 2 + 1); }
    // corpo
    for (var i = 0; i < Lg; i++) {
      var h = Math.max(1, Math.round(Al / 2 * Math.pow(Math.sin(Math.PI * (i + .5) / Lg), .7)));
      P(sp.corpo, i, -h, 1, h * 2 + 1);
      P(sp.pancia, i, Math.max(0, Math.round(h * .3)), 1, Math.max(1, h - Math.round(h * .3)));
      if (sp.righe && !sp.rigaOrizz && (i === Math.round(Lg * .3) || i === Math.round(Lg * .62))) P(sp.righe, i, -h, 1, h * 2 + 1);
      if (sp.puntini && (i * 7) % 5 === 1) P(sp.puntini, i, -Math.round(h * .5), 1, 1);
    }
    if (sp.rigaOrizz) P(sp.righe, Math.round(Lg * .25), -1, Math.round(Lg * .6), 1);
    if (sp.pinnaAlta) { for (var q = 0; q < 4; q++) P(sp.righe || sp.corpo, Math.round(Lg * .35) + q, -Math.round(Al / 2) - 4 + q, 1, 4 - q); }
    else P(mescola(sp.corpo, "#000000", .15), Math.round(Lg * .4), -Math.round(Al / 2) - 1, Math.max(2, Math.round(Lg * .25)), 1);
    // occhio (chiuso se dorme)
    var ex = Lg - Math.max(2, Math.round(Lg * .2));
    if (dorme) P("#1a1a2a", ex - 1, -1, 2, 1); else { P("#ffffff", ex - 1, -2, 2, 2); P("#10131c", ex, -2, 1, 1); }
    if (p.nuovo && Date.now() - p.nato < 6 * 3600000) { P("#ffd75e", Lg / 2, -Math.round(Al / 2) - 3, 1, 1); }   // stellina sui neonati
  }
  function disegnaCibo() { AQ.cibo.forEach(function (c) { px(c.c, c.x, c.y, 1, 1); }); }
  function disegnaBolle(dt) {
    AQ.bolle.forEach(function (b) {
      if (b.ritardo > 0) { b.ritardo -= dt; return; }
      b.y -= b.v * dt; b.x += Math.sin(b.y * .3) * .15;
      if (b.cuore) {   // bolla a forma di cuore
        var x = Math.round(b.x), y = Math.round(b.y), c = "#ff5f7a";
        px(c, x - 2, y, 2, 2); px(c, x + 1, y, 2, 2); px(c, x - 2, y + 1, 5, 2); px(c, x - 1, y + 3, 3, 1); px(c, x, y + 4, 1, 1); px("rgba(255,255,255,.7)", x - 2, y, 1, 1);
      } else { px("rgba(220,240,255,.75)", b.x, b.y, b.r, b.r); if (b.r > 1) px("rgba(255,255,255,.9)", b.x, b.y, 1, 1); }
    });
    AQ.bolle = AQ.bolle.filter(function (b) { return b.y > 1; });
  }
  function scintille() { for (var i = 0; i < 16; i++) AQ.bolle.push({ x: Math.random() * AQ.W, y: AQ.fondo - Math.random() * 10, v: 12 + Math.random() * 14, r: 1, ritardo: i * .08 }); }

  // ---------------------------------------------------------------- movimento
  function muovi(dt, t, L) {
    var dorme = L < .15, fame = Date.now() - leggi("acquario_pasto", 0) > 10 * 3600000;
    AQ.pesci.forEach(function (p, i) {
      var cibo = null, best = 1e9;
      AQ.cibo.forEach(function (c) { var d = Math.hypot(c.x - p.x, c.y - p.y); if (d < best) { best = d; cibo = c; } });
      if (cibo && !dorme) p.meta = { x: cibo.x, y: cibo.y };
      else if (!p.meta || Math.hypot(p.meta.x - p.x, p.meta.y - p.y) < 3 || Math.random() < dt * .08)
        p.meta = dorme ? { x: p.x + (Math.random() - .5) * 6, y: Math.min(AQ.fondo - 8, p.y + Math.random() * 3) }
                       : { x: 8 + Math.random() * (AQ.W - 16), y: 8 + Math.random() * (AQ.fondo - 22) };
      var dx = p.meta.x - p.x, dy = p.meta.y - p.y, d = Math.hypot(dx, dy) || 1, vmax = dorme ? 1.5 : cibo ? 24 : fame ? 6 : 11;
      p.vx += (dx / d * vmax - p.vx) * Math.min(1, dt * 1.6); p.vy += (dy / d * vmax * .6 - p.vy) * Math.min(1, dt * 1.6);
      p.x = Math.max(4, Math.min(AQ.W - 4, p.x + p.vx * dt)); p.y = Math.max(5, Math.min(AQ.fondo - 5, p.y + p.vy * dt));
      if (Math.abs(p.vx) > .6) p.verso = p.vx > 0 ? 1 : -1;
      if (cibo && best < 3) { AQ.cibo.splice(AQ.cibo.indexOf(cibo), 1); }
      if (!dorme && Math.random() < dt * .25) AQ.bolle.push({ x: p.x + p.verso * 4, y: p.y - 1, v: 6 + Math.random() * 5, r: 1, ritardo: 0 });
      if (dorme && Math.random() < dt * .05) AQ.bolle.push({ x: p.x, y: p.y - 3, v: 3, r: 1, ritardo: 0 });
    });
    AQ.cibo.forEach(function (c) { c.y = Math.min(AQ.fondo - 1, c.y + 5 * dt); c.x += Math.sin(t * 2 + c.f) * .05; });
    AQ.cibo = AQ.cibo.filter(function (c) { return Date.now() - c.nato < 40000; });
    if (Math.random() < dt * 1.2) AQ.bolle.push({ x: AQ.W - 6 + Math.random() * 2, y: AQ.fondo - 1, v: 10 + Math.random() * 6, r: Math.random() < .4 ? 2 : 1, ritardo: 0 });   // areatore
  }
  function info(L) {
    var n = AQ.pesci.length, pasto = leggi("acquario_pasto", 0), e = $("acq-info"); if (!e) return;
    var fame = Date.now() - pasto > 10 * 3600000;
    var testo = "🐟 " + n + (n === 1 ? " pesce" : " pesci") + " · " + (L < .15 ? "dormono 💤" : fame ? "hanno fame: tocca l'acqua!" : "ultimo pasto " + fraQuantoA(pasto));
    if (AQ.avviso && Date.now() < AQ.avviso.fino) testo = AQ.avviso.testo;
    if (e.textContent !== testo) e.textContent = testo;
    var l = window.pensieri ? pensieri().length : 0, manca = 5 - ((l + 1) % 5 || 5) + 1, f = $("acq-prossimo");
    if (f) { var t2 = "prossimo pesce tra " + (manca === 1 ? "1 cuore" : manca + " cuori") + " 💗"; if (f.textContent !== t2) f.textContent = t2; }
  }
  function fraQuantoA(t) { if (!t) return "mai"; var m = Math.round((Date.now() - t) / 60000); return m < 1 ? "adesso" : m < 60 ? m + " min fa" : Math.round(m / 60) + " h fa"; }

  function visibile() { var r = AQ.cv.getBoundingClientRect(); return r.width > 0 && r.right > 0 && r.left < innerWidth; }
  function ciclo(ora) {
    requestAnimationFrame(ciclo);
    var dt = Math.min(.1, (ora - (AQ.prima || ora)) / 1000); AQ.prima = ora;
    if (!visibile()) return;
    misura(); if (!AQ.W) return;
    if (!AQ.controllo || ora - AQ.controllo > 5000) { AQ.controllo = ora; aggiornaPesci(); }
    var t = (ora - AQ.t0) / 1000, L = luce();
    muovi(dt, t, L);
    disegnaAcqua(t, L); disegnaFondo(t, L); disegnaCibo();
    AQ.pesci.slice().sort(function (a, b) { return a.y - b.y; }).forEach(function (p) { disegnaPesce(p, t, L); });
    disegnaBolle(dt);
    if (L < 1) { AQ.g.fillStyle = "rgba(6,10,40," + (.45 * (1 - L)).toFixed(3) + ")"; AQ.g.fillRect(0, 0, AQ.W, AQ.H); }
    info(L);
  }
  function nutri(e) {
    var r = AQ.cv.getBoundingClientRect(), x = (e.clientX - r.left) / AQ.S;
    for (var i = 0; i < 7; i++) AQ.cibo.push({ x: x + (Math.random() - .5) * 10, y: 1 + Math.random() * 3, c: ["#c9783a", "#e3a35a", "#a8582a"][i % 3], f: Math.random() * 6, nato: Date.now() });
    salva("acquario_pasto", Date.now());
  }
  window.acquarioCuore = function () {   // un "Pensavo a te": sale una bolla a cuore
    if (!AQ.W) return;
    for (var i = 0; i < 3; i++) AQ.bolle.push({ cuore: true, x: AQ.W * (.3 + Math.random() * .4), y: AQ.fondo - 4, v: 9 + Math.random() * 4, r: 1, ritardo: i * .6 });
  };
  window.avviaAcquario = function () {
    AQ.cv = $("acquario"); if (!AQ.cv) return;
    AQ.g = AQ.cv.getContext("2d");
    AQ.cv.addEventListener("click", nutri);
    requestAnimationFrame(ciclo);
  };
})();
