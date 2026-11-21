// Home2Love — il gatto disegnato (lo stesso ovunque: stanza del gatto, tablet, visite sui telefoni).
// Illustrazione vettoriale: tigrato arancione con petto bianco, occhi verdi, baffi, coda che si muove.
// GATTO_VET.disegna(ctx, x, y, posa, t, verso, opz): (x, y) = dove poggiano le zampe; misure "logiche"
// (seduto è alto circa 160, in piedi largo circa 200: scala il contesto prima di chiamarlo).
// Pose: seduto, cammina, in piedi, mangia, dorme, preso (appeso per la collottola: (x, y) = collottola).
// opz: { blink: occhi chiusi un attimo, fusa: occhi chiusi beati, cappello: cappellino della festa, collare: colore del collare }
var GATTO_VET = (function () {
var c = null, O = {};
function rr(x, y, w, h, r) { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }
function ell(x, y, rx, ry, rot) { c.beginPath(); c.ellipse(x, y, Math.max(.1, rx), Math.max(.1, ry), rot || 0, 0, Math.PI * 2); }
function rad(x, y, r0, r1, stops) { var gr = c.createRadialGradient(x, y, r0, x, y, r1); stops.forEach(function (s) { gr.addColorStop(s[0], s[1]); }); return gr; }
var PELO = "#f0963d", SCURO = "#c8682a", CHIARO = "#fde8d2", ROSA = "#f4a2ab", OCCHI = "#8fbf3f";
function orecchio(x, y, w, h, rot) {
  c.save(); c.translate(x, y); c.rotate(rot);
  c.fillStyle = PELO; c.beginPath(); c.moveTo(-w / 2, 0); c.quadraticCurveTo(-w * .2, -h * .7, 0, -h); c.quadraticCurveTo(w * .2, -h * .7, w / 2, 0); c.fill();
  c.fillStyle = ROSA; c.beginPath(); c.moveTo(-w * .28, -2); c.quadraticCurveTo(-w * .1, -h * .55, 0, -h * .74); c.quadraticCurveTo(w * .1, -h * .55, w * .28, -2); c.fill();
  c.restore();
}
function testa(x, y, r, profilo, t, chiusi, sorpreso) {
  // orecchie
  if (profilo) { orecchio(x - r * .2, y - r * .7, r * .8, r * .85, -.25); orecchio(x + r * .45, y - r * .62, r * .7, r * .8, .3); }
  else { orecchio(x - r * .55, y - r * .6, r * .8, r * .9, -.35); orecchio(x + r * .55, y - r * .6, r * .8, r * .9, .35); }
  c.fillStyle = rad(x - r * .3, y - r * .3, r * .2, r * 1.2, [[0, "#f6a656"], [1, PELO]]); ell(x, y, r * 1.08, r); c.fill();
  // strisce sulla fronte
  c.strokeStyle = SCURO; c.lineWidth = r * .1; c.lineCap = "round";
  [-.25, 0, .25].forEach(function (k) { c.beginPath(); c.moveTo(x + k * r, y - r * .95); c.lineTo(x + k * r * 1.2, y - r * .55); c.stroke(); });
  // muso chiaro
  var mx = profilo ? x + r * .55 : x, my = y + r * .32;
  c.fillStyle = CHIARO; ell(mx - r * .18, my, r * .32, r * .25); c.fill(); ell(mx + r * .18, my, r * .32, r * .25); c.fill();
  // occhi
  var occhi = profilo ? [[x + r * .45, y - r * .1]] : [[x - r * .38, y - r * .08], [x + r * .38, y - r * .08]];
  occhi.forEach(function (o) {
    if (chiusi || O.blink) { c.strokeStyle = "#3a2418"; c.lineWidth = r * .07; c.beginPath(); c.arc(o[0], o[1] - r * .02, r * .17, .25, Math.PI - .25); c.stroke(); return; }
    c.fillStyle = "#fffbe8"; ell(o[0], o[1], r * .2, r * .22); c.fill();
    c.fillStyle = OCCHI; ell(o[0], o[1], r * .17, r * .2); c.fill();
    c.fillStyle = "#1f1a14"; ell(o[0] + (profilo ? r * .04 : 0), o[1], sorpreso ? r * .13 : r * .06, sorpreso ? r * .15 : r * .17); c.fill();
    c.fillStyle = "#fff"; ell(o[0] - r * .06, o[1] - r * .08, r * .05, r * .05); c.fill();
  });
  // naso e bocca
  c.fillStyle = "#e57f8f"; c.beginPath(); c.moveTo(mx - r * .1, my - r * .14); c.lineTo(mx + r * .1, my - r * .14); c.lineTo(mx, my - r * .02); c.closePath(); c.fill();
  c.strokeStyle = "#7a4a3a"; c.lineWidth = r * .045; c.beginPath(); c.moveTo(mx, my - r * .02); c.quadraticCurveTo(mx - r * .08, my + r * .1, mx - r * .17, my + r * .04); c.moveTo(mx, my - r * .02); c.quadraticCurveTo(mx + r * .08, my + r * .1, mx + r * .17, my + r * .04); c.stroke();
  // baffi
  c.strokeStyle = "rgba(255,255,255,.85)"; c.lineWidth = r * .03;
  [-1, 1].forEach(function (s) { if (profilo && s < 0) return; for (var k = -1; k <= 1; k++) { c.beginPath(); c.moveTo(mx + s * r * .2, my + k * r * .06); c.quadraticCurveTo(mx + s * r * .6, my + k * r * .1 - r * .04, mx + s * r * .95, my + k * r * .18); c.stroke(); } });
  if (O.cappello) {   // cappellino della festa
    var hx = profilo ? x + r * .05 : x, hy = y - r * .8;
    c.fillStyle = "#ff5468"; c.beginPath(); c.moveTo(hx - r * .38, hy); c.lineTo(hx + r * .38, hy); c.lineTo(hx + r * .05, hy - r * 1.1); c.closePath(); c.fill();
    c.fillStyle = "#ffd166"; [.25, .55].forEach(function (k) { ell(hx + r * .02 - k * r * .05, hy - k * r * 1.05 + r * .1, r * .07, r * .07); c.fill(); });
    ell(hx + r * .05, hy - r * 1.12, r * .12, r * .12); c.fill();
  }
}
function collare(x, y, rx, ry, rot) {   // il collare col campanellino (opz.collare = colore)
  if (!O.collare) return;
  c.save(); c.translate(x, y); c.rotate(rot || 0);
  c.strokeStyle = O.collare; c.lineWidth = 7; c.beginPath(); c.ellipse(0, 0, rx, ry, 0, .15, Math.PI - .15); c.stroke();
  c.fillStyle = "#f2c94c"; c.beginPath(); c.arc(0, ry + 5, 5.5, 0, 7); c.fill();
  c.fillStyle = "rgba(0,0,0,.35)"; c.fillRect(-.8, ry + 6, 1.6, 3.5);
  c.restore();
}
function coda(punti, sp) { c.strokeStyle = PELO; c.lineWidth = sp; c.lineCap = "round"; c.beginPath(); c.moveTo(punti[0], punti[1]); c.bezierCurveTo(punti[2], punti[3], punti[4], punti[5], punti[6], punti[7]); c.stroke();
  c.strokeStyle = SCURO; c.lineWidth = sp * .9; c.setLineDash([sp * .5, sp * 1.1]); c.stroke(); c.setLineDash([]); }
function disegna(ctx, x, y, posa, t, verso, opz) {
  c = ctx; O = opz || {}; verso = verso || 1;
  if (posa === "preso") { preso(x, y, t); return; }
  var resp = Math.sin(t / 700) * .02;
  c.fillStyle = "rgba(0,0,0,.2)"; ell(x, y + 2, posa === "dorme" ? 70 : 62, 9); c.fill();
  c.save(); c.translate(x, y); c.scale(verso, 1);
  if (posa === "dorme") {
    c.scale(1, 1 + resp * 1.5);
    coda([-55, -10, -70, 10, 10, 14, 50, -2], 13);
    c.fillStyle = rad(-10, -40, 10, 80, [[0, "#f6a656"], [1, PELO]]); ell(-5, -30, 62, 32); c.fill();
    c.strokeStyle = SCURO; c.lineWidth = 6; c.lineCap = "round"; [-35, -15, 5].forEach(function (k) { c.beginPath(); c.arc(k, -30, 26, -2.4, -1.4); c.stroke(); });
    testa(40, -28, 27, false, t, true);
    c.fillStyle = PELO; ell(30, -6, 18, 8); c.fill(); c.fillStyle = CHIARO; ell(42, -5, 9, 6); c.fill();
  } else if (posa === "seduto") {
    var cs = Math.sin(t / 500) * 12;
    coda([-28, -6, -70, 0 + cs * .2, -60, -40 + cs, -40, -60 + cs], 13);
    c.fillStyle = rad(-10, -70, 10, 70, [[0, "#f6a656"], [1, PELO]]); c.beginPath(); c.moveTo(-40, 0); c.bezierCurveTo(-50, -60, -30, -96, 0, -98); c.bezierCurveTo(30, -96, 46, -60, 38, 0); c.closePath(); c.fill();
    c.strokeStyle = SCURO; c.lineWidth = 6; c.lineCap = "round"; [-60, -40, -20].forEach(function (k) { c.beginPath(); c.moveTo(-36, k); c.quadraticCurveTo(-26, k - 6, -18, k - 2); c.stroke(); });
    c.fillStyle = CHIARO; ell(6, -48, 18, 34); c.fill();
    c.fillStyle = PELO; rr(-12, -40, 15, 40, 7); c.fill(); rr(10, -40, 15, 40, 7); c.fill();
    c.fillStyle = CHIARO; ell(-4, -3, 10, 6); c.fill(); ell(18, -3, 10, 6); c.fill();
    testa(4, -118 + resp * 40, 36, false, t, O.fusa);
    collare(4, -86 + resp * 30, 18, 5);
  } else {   // cammina / mangia (di profilo, verso destra)
    var mangia = posa === "mangia", ferma = mangia || posa === "in piedi", ph = ferma ? 0 : t / 110, sw = ferma ? 0 : 1;
    var cs2 = Math.sin(t / 400) * 10;
    coda([-58, -62, -95, -80 + cs2, -96, -128 + cs2, -78, -146 + cs2], 12);
    [[-38, 0], [-24, Math.PI], [26, Math.PI], [40, 0]].forEach(function (z, i) {   // zampe
      var a = Math.sin(ph + z[1]) * .45 * sw;
      c.save(); c.translate(z[0], -44); c.rotate(a); c.fillStyle = i === 1 || i === 2 ? SCURO : PELO; rr(-7, 0, 14, 44, 7); c.fill(); c.fillStyle = CHIARO; ell(1, 42, 9, 5); c.fill(); c.restore();
    });
    c.fillStyle = rad(-10, -70, 10, 90, [[0, "#f6a656"], [1, PELO]]); ell(0, -62, 64, 30); c.fill();
    c.fillStyle = CHIARO; ell(18, -44, 34, 12); c.fill();
    c.strokeStyle = SCURO; c.lineWidth = 6; c.lineCap = "round"; [-40, -20, 0].forEach(function (k) { c.beginPath(); c.moveTo(k, -90); c.quadraticCurveTo(k + 6, -76, k + 2, -64); c.stroke(); });
    collare(mangia ? 50 : 52, mangia ? -56 : -76, 7, 18, mangia ? -.9 : -.35);
    if (mangia) testa(66, -38 + Math.abs(Math.sin(t / 220)) * 4, 28, true, t, true);
    else testa(70, -96 + Math.sin(ph * 2) * 1.5, 30, true, t, false);
  }
  c.restore();
}

function preso(x, y, t) {   // appeso per la collottola: zampe a penzoloni, coda che dondola, occhioni
  var dz = Math.sin(t / 160) * .18;
  c.save(); c.translate(x, y);
  coda([0, 150, 18 + Math.sin(t / 300) * 20, 190, -20, 210, Math.sin(t / 300) * 30, 240], 12);
  [[-22, 1], [22, -1]].forEach(function (z) { c.save(); c.translate(z[0], 140); c.rotate(dz * z[1]); c.fillStyle = PELO; rr(-8, 0, 16, 46, 8); c.fill(); c.fillStyle = CHIARO; ell(0, 46, 10, 6); c.fill(); c.restore(); });
  c.fillStyle = rad(-8, 80, 8, 70, [[0, "#f6a656"], [1, PELO]]); ell(0, 100, 36, 58); c.fill();
  c.fillStyle = CHIARO; ell(0, 96, 20, 40); c.fill();
  c.strokeStyle = SCURO; c.lineWidth = 6; c.lineCap = "round"; [70, 95, 120].forEach(function (k) { c.beginPath(); c.moveTo(-34, k); c.quadraticCurveTo(-26, k - 5, -20, k - 2); c.stroke(); c.beginPath(); c.moveTo(34, k); c.quadraticCurveTo(26, k - 5, 20, k - 2); c.stroke(); });
  [[-30, -1], [30, 1]].forEach(function (z) { c.save(); c.translate(z[0], 62); c.rotate(z[1] * (.25 + dz)); c.fillStyle = PELO; rr(-7, 0, 14, 48, 7); c.fill(); c.fillStyle = CHIARO; ell(0, 48, 9, 6); c.fill(); c.restore(); });
  testa(0, 30, 34, false, t, false, true);
  c.restore();
}
function collareDiCasa() { var e = window.reg && reg["gatto.collare"]; return e && !e.d && e.v && e.v.colore ? e.v.colore : ""; }   // scelto nella stanza del gatto
return { disegna: disegna, collare: collareDiCasa };
})();
