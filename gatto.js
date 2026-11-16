// HomeDashboard — il gatto di casa: pixel art che vive sopra tutta l'interfaccia (come i bigliettini).
// Gira, si siede, dorme di notte e quando lavorate tutti e due, trema se fuori piove o nevica,
// è felice nei giorni liberi insieme, fa le fusa se lo tocchi e salta quando suona un timer.

var G = { preso: false, dondolo: 0, attivita: null, W: 24, H: 18, S: 5, x: 200, y: 400, tx: 200, ty: 400, verso: 1, stato: "seduto", fino: 0, f: 0, coccole: 0, salto: 0 };
var COL = { O: "#e8913f", D: "#b8622a", W: "#fff1e0", K: "#2b1d14", P: "#f4a6ae" };

function pix(g, c, x, y, w, h) { g.fillStyle = COL[c]; g.fillRect(x, y, w || 1, h || 1); }
function disegnaGatto(g, posa, f) {
  g.clearRect(0, 0, G.W, G.H);
  if (posa === "dorme") {   // acciambellato, con la coda davanti
    pix(g, "O", 5, 11, 13, 5); pix(g, "O", 6, 10, 11, 1); pix(g, "D", 8, 11, 1, 2); pix(g, "D", 11, 11, 1, 2);
    pix(g, "O", 13, 8, 6, 5); pix(g, "O", 13, 7, 1, 1); pix(g, "O", 18, 7, 1, 1); pix(g, "P", 13, 8); pix(g, "P", 18, 8);
    pix(g, "K", 14, 10, 2, 1); pix(g, "K", 17, 10, 1, 1); pix(g, "W", 15, 11, 3, 2);
    var r = f % 40 < 20 ? 0 : 1;   // respiro
    pix(g, "O", 5, 16 - r, 9, 1); pix(g, "W", 4, 15 - r, 2, 1);
    return;
  }
  if (posa === "preso") {
    var dz = f % 10 < 5 ? 0 : 1, cd = Math.round(Math.sin(f / 3) * 2);
    pix(g, "O", 9, 0, 7, 6); pix(g, "O", 9, 0, 1, 1); pix(g, "O", 15, 0, 1, 1); pix(g, "P", 10, 1); pix(g, "P", 14, 1);
    pix(g, "K", 11, 2, 1, 1); pix(g, "K", 14, 2, 1, 1); pix(g, "W", 12, 3, 3, 2); pix(g, "P", 13, 3);   // occhioni sorpresi
    pix(g, "O", 10, 6, 5, 8); pix(g, "W", 11, 7, 3, 5); pix(g, "D", 10, 8, 1, 1); pix(g, "D", 14, 10, 1, 1);
    pix(g, "O", 9, 7, 1, 3 + dz); pix(g, "W", 9, 10 + dz); pix(g, "O", 15, 7, 1, 3 + (1 - dz)); pix(g, "W", 15, 11 - dz);   // zampette davanti
    pix(g, "O", 10, 14, 1, 2 + dz); pix(g, "W", 10, 16 + dz); pix(g, "O", 14, 14, 1, 3 - dz); pix(g, "W", 14, 17 - dz);   // zampe dietro
    pix(g, "O", 12 + cd, 14, 1, 3); pix(g, "D", 12 + cd, 17);   // coda
    return;
  }
  if (posa === "seduto") {
    pix(g, "O", 8, 8, 7, 7); pix(g, "W", 11, 10, 3, 5); pix(g, "D", 9, 9, 1, 2); pix(g, "D", 9, 12, 1, 2);
    pix(g, "O", 9, 2, 7, 6); pix(g, "O", 9, 1, 1, 1); pix(g, "O", 15, 1, 1, 1); pix(g, "P", 10, 2); pix(g, "P", 14, 2);
    var occhi = f % 60 < 3 ? "O" : "K";   // ogni tanto sbatte le palpebre
    pix(g, occhi, 11, 4); pix(g, occhi, 14, 4); pix(g, "W", 12, 5, 3, 2); pix(g, "P", 13, 5);
    pix(g, "W", 11, 15, 1, 1); pix(g, "W", 13, 15, 1, 1);
    var c = Math.round(Math.sin(f / 6) * 1.5);   // coda che si muove
    pix(g, "O", 3, 14, 6, 2); pix(g, "O", 2, 12 + c, 2, 3); pix(g, "D", 2, 11 + c, 1, 1);
    return;
  }
  // in piedi / cammina (verso destra); "mangia" = testa giù nella ciotola
  var hy = posa === "mangia" ? 4 + (f % 6 < 3 ? 0 : 1) : 0;
  pix(g, "O", 4, 8, 12, 5); pix(g, "D", 6, 8, 1, 2); pix(g, "D", 9, 8, 1, 2); pix(g, "D", 12, 8, 1, 2); pix(g, "W", 13, 10, 3, 3);
  pix(g, "O", 14, 3 + hy, 7, 6); pix(g, "O", 15, 2 + hy, 1, 1); pix(g, "O", 19, 2 + hy, 1, 1); pix(g, "P", 15, 3 + hy); pix(g, "P", 19, 3 + hy);
  pix(g, "K", 16, 5 + hy); pix(g, "K", 19, 5 + hy); pix(g, "W", 18, 6 + hy, 3, 2); pix(g, "P", 20, 6 + hy);
  var a = posa === "cammina" && f % 8 < 4;   // zampe alternate
  [[5, a], [7, !a], [12, !a], [14, a]].forEach(function (z) { pix(g, "O", z[0], 13, 1, z[1] ? 3 : 2); pix(g, "W", z[0], z[1] ? 15 : 14); });
  var t = Math.round(Math.sin(f / 4));
  pix(g, "O", 3, 8); pix(g, "O", 2, 7); pix(g, "O", 2, 6); pix(g, "O", 1 + t, 5); pix(g, "D", 1 + t, 4);
}

// ---------------------------------------------------------------- umore: da ora, turni, meteo
function umore() {
  var h = new Date().getHours(), notte = h >= 23 || h < 7;
  var tutti = window.statoAdesso && statoAdesso(0).stato === "lavoro" && statoAdesso(1).stato === "lavoro";
  var freddo = ["pioggia", "neve", "temporale"].indexOf(window.meteoAdesso) >= 0;
  var festa = window.insieme && insieme(new Date()) === "giorno";
  return { sonno: notte || tutti, freddo: freddo, festa: festa, perche: notte ? "è notte" : tutti ? "siete al lavoro" : "" };
}
function fumetto(testo, ms) {
  var b = $("gatto-fumetto"); b.textContent = testo; b.hidden = false;
  clearTimeout(fumetto.t); fumetto.t = setTimeout(function () { b.hidden = true; }, ms || 2500);
}
function cuoricino() {
  var c = el("span", "gatto-cuore"); c.textContent = "♥";
  c.style.left = (G.x + 30 + Math.random() * 40) + "px"; c.style.top = (G.y + 10) + "px";
  $("gatto-strato").appendChild(c); setTimeout(function () { c.remove(); }, 1800);
}
function nuovaMeta() {
  var w = innerWidth - G.W * G.S, h = innerHeight - G.H * G.S;
  G.tx = Math.random() * w; G.ty = h * 0.25 + Math.random() * h * 0.72;
}
// ---------------------------------------------------------------- l'angolo del gatto (pagina 2)
// Cuccia, due ciotole che si riempiono da sole e i giochini: quando la pagina 2 è in vista
// il gatto ogni tanto ci va a mangiare, bere, giocare o fare un pisolino.
var CU = { cibo: 100, acqua: 100, diario: {}, w: 0, h: 0, pos: {}, cade: [], gioco: 0 };
(function () { var v = leggi("gatto_ciotole", null); if (v) { CU.cibo = v.cibo; CU.acqua = v.acqua; CU.diario = v.diario || {}; } })();
function salvaCiotole() { salva("gatto_ciotole", { cibo: Math.round(CU.cibo), acqua: Math.round(CU.acqua), diario: CU.diario }); }
function cucciaVisibile() {
  var c = $("cuccia"); if (!c || !c.width) return false;
  var r = c.getBoundingClientRect();
  return r.width > 0 && r.left >= -2 && r.right <= innerWidth + 2;
}
function misuraCuccia() {   // un pixel della scena = un pixel del gatto (G.S)
  var c = $("cuccia"); if (!c) return;
  var box = c.parentNode, w = Math.floor(box.clientWidth / G.S), h = Math.floor(box.clientHeight / G.S);
  if (w === CU.w && h === CU.h) return;
  CU.w = c.width = w; CU.h = c.height = h; c.style.width = w * G.S + "px"; c.style.height = h * G.S + "px";
  var F = h - 2, x = 1;
  CU.F = F; CU.pos = { cuccia: x, cibo: x + 31, acqua: x + 43, gomitolo: x + 58, topo: x + 66 };
}
function punto(cosa) {   // dove mettere il gatto (angolo in alto a sinistra dello sprite, in pixel dello schermo)
  var r = $("cuccia").getBoundingClientRect(), p = CU.pos, F = CU.F, lx, ly;
  if (cosa === "cuccia") { lx = p.cuccia + 2; ly = F - 18; }
  else if (cosa === "gioco") { lx = p.gomitolo - 22; ly = F - 16; }
  else { lx = p[cosa] - 13; ly = F - 16; }   // la testa sopra la ciotola
  return { x: r.left + lx * G.S, y: r.top + ly * G.S };
}
function px2(g, col, x, y, w, h) { g.fillStyle = col; g.fillRect(x, y, w || 1, h || 1); }
function disegnaCuccia() {
  var c = $("cuccia"); if (!c || !CU.w) return;
  var g = c.getContext("2d"), p = CU.pos, F = CU.F, scuro = document.body.classList.contains("notte");
  g.clearRect(0, 0, CU.w, CU.h);
  px2(g, scuro ? "#3a332c" : "#e9ddcb", 0, F + 1, CU.w, 1);   // pavimento
  px2(g, scuro ? "#4a3d4f" : "#d9cbe8", p.cuccia - 1, F, 30, 1);   // tappetino
  // cuccia: bordo rosso e cuscino
  var x = p.cuccia;
  px2(g, "#b8263a", x + 1, F - 7, 24, 1); px2(g, "#d7263d", x, F - 6, 26, 5); px2(g, "#b8263a", x + 1, F - 1, 24, 1);
  px2(g, "#f7c6cd", x + 3, F - 6, 20, 2); px2(g, "#fbe0e4", x + 5, F - 6, 6, 1);
  px2(g, "#fff", x + 11, F - 4); px2(g, "#fff", x + 13, F - 4); px2(g, "#fff", x + 12, F - 3);   // cuoricino
  // ciotole: livello visibile + crocchette/acqua che cadono quando si riempiono
  function ciotola(cx, col, pieno, cont) {
    var liv = Math.ceil(pieno / 34);   // 0..3 righe
    for (var k = 0; k < liv; k++) px2(g, cont, cx + 1 + (k === 2 ? 1 : 0), F - 3 - k, 7 - (k === 2 ? 2 : 0), 1);
    if (cont === "#7a4a22") for (var q = 0; q < liv; q++) px2(g, "#a8692f", cx + 2 + q * 2, F - 3 - q);
    px2(g, col, cx, F - 2, 9, 2); px2(g, col, cx + 1, F, 7, 1); px2(g, "rgba(255,255,255,.35)", cx + 1, F - 2, 3, 1);
  }
  ciotola(p.cibo, "#3f6fbf", CU.cibo, "#7a4a22");
  ciotola(p.acqua, "#2f9a93", CU.acqua, "#7cc8f0");
  CU.cade.forEach(function (d) { px2(g, d.col, d.x, Math.floor(d.y), 1, 1); });
  // gomitolo che rimbalza quando ci gioca
  var gx = p.gomitolo + Math.round(Math.sin(CU.gioco / 3) * (CU.gioco ? 3 : 0)), gy = F - 3 - (CU.gioco ? Math.abs(Math.round(Math.sin(CU.gioco / 2) * 3)) : 0);
  if (gx + 4 < CU.w) {
    px2(g, "#e86a8a", gx, gy, 4, 4); px2(g, "#e86a8a", gx - 1, gy + 1, 6, 2); px2(g, "#c24a6c", gx + 1, gy + 1, 1, 2); px2(g, "#c24a6c", gx + 3, gy + 2);
    px2(g, "#e86a8a", gx + 5, gy + 4, 3, 1);   // filo
  }
  // topolino di pezza
  var t = p.topo;
  if (t + 7 < CU.w) {
    px2(g, "#9a9aa6", t + 1, F - 2, 5, 2); px2(g, "#9a9aa6", t + 5, F - 3, 2, 2); px2(g, "#f4a6ae", t + 5, F - 4); px2(g, "#2b1d14", t + 6, F - 2);
    px2(g, "#f4a6ae", t, F - 1); px2(g, "#f4a6ae", t - 1, F - 2);
  }
  $("liv-cibo").style.width = Math.round(CU.cibo) + "%"; $("liv-acqua").style.width = Math.round(CU.acqua) + "%";
}
function aggiornaCiotole() {   // si riempiono da sole quando scendono sotto un terzo
  var p = CU.pos;
  ["cibo", "acqua"].forEach(function (k) {
    if (CU["riempi_" + k] || CU[k] < 30) {
      CU["riempi_" + k] = CU[k] < 100;
      if (!CU["riempi_" + k]) { salvaCiotole(); return; }
      CU[k] = Math.min(100, CU[k] + 1.2);
      if (G.f % 2 === 0) CU.cade.push({ x: p[k] + 2 + Math.floor(Math.random() * 5), y: 0, col: k === "cibo" ? "#7a4a22" : "#7cc8f0" });
    }
  });
  CU.cade = CU.cade.filter(function (d) { d.y += 1.5; return d.y < CU.F - 3; });
}
function scriviStatoCuccia() {
  var a = G.attivita, s = $("cuccia-stato");
  if (!s) return;
  s.textContent = $("gatto-strato").hidden ? "il gatto è spento" : G.stato === "dorme" && a === "cuccia" ? "dorme nella cuccia" :
    a === "cibo" && G.stato === "mangia" ? "sta mangiando" : a === "acqua" && G.stato === "mangia" ? "sta bevendo" :
    a === "gioco" && G.stato === "in piedi" ? "gioca col gomitolo" : a && G.stato === "cammina" ? "arriva…" :
    CU.riempi_cibo || CU.riempi_acqua ? "le ciotole si riempiono" : "";
  var d = CU.diario, parti = [];
  function ora(t) { var x = new Date(t); return due(x.getHours()) + ":" + due(x.getMinutes()); }
  if (d.cuccia) parti.push("pisolino " + ora(d.cuccia));
  if (d.gioco) parti.push("gioco " + ora(d.gioco));
  $("cuccia-diario").textContent = parti.join(" · ");
}
function vaiA(cosa) {
  G.attivita = cosa; var q = punto(cosa); G.tx = q.x; G.ty = q.y; G.stato = "cammina";
}
function scegliAttivita() {
  var l = [];
  if (CU.cibo > 25) l.push("cibo"); if (CU.acqua > 25) l.push("acqua");
  l.push("gioco", "gioco", "cuccia");
  return l[Math.floor(Math.random() * l.length)];
}
function iniziaAttivita(ora, u) {
  var a = G.attivita; CU.diario[a] = ora; salvaCiotole();
  if (a === "cuccia") { G.stato = "dorme"; G.fino = ora + (u.sonno ? 60000 : 40000 + Math.random() * 80000); fumetto("che bella cuccia… zzz"); }
  else if (a === "gioco") { G.stato = "in piedi"; G.verso = 1; G.fino = ora + 9000 + Math.random() * 7000; fumetto("!"); }
  else { G.stato = "mangia"; G.verso = 1; G.fino = ora + 6000 + Math.random() * 4000; fumetto(a === "cibo" ? "gnam gnam" : "slurp"); }
}
function passoGatto() {
  var u = umore(), ora = Date.now(), vis = cucciaVisibile(); G.f++;
  if (G.preso) {   // in braccio: lo muove il dito, qui solo l'animazione
    G.dondolo *= .85; mettiGatto(0, 0);
    disegnaGatto($("gatto").getContext("2d"), "preso", G.f);
    if (vis) { misuraCuccia(); aggiornaCiotole(); disegnaCuccia(); }
    return;
  }
  if (G.salto > 0) G.salto--;
  if (vis) { misuraCuccia(); aggiornaCiotole(); }
  if (G.attivita && !vis) { G.attivita = null; if (G.stato !== "dorme") { G.stato = "seduto"; G.fino = ora + 2000; } }
  if (G.attivita && G.stato === "cammina") { var q = punto(G.attivita); G.tx = q.x; G.ty = q.y; }
  CU.gioco = 0;
  if (G.coccole > ora) G.stato = "seduto";
  else if (G.stato === "cammina") {
    var dx = G.tx - G.x, dy = G.ty - G.y, d = Math.sqrt(dx * dx + dy * dy), v = 5;
    if (d < v) { G.x = G.tx; G.y = G.ty; if (G.attivita) iniziaAttivita(ora, u); else { G.stato = "seduto"; G.fino = ora + 4000 + Math.random() * 9000; } }
    else { G.x += dx / d * v; G.y += dy / d * v; G.verso = dx >= 0 ? 1 : -1; }
  }
  else if (u.sonno && !(G.attivita === "cuccia")) {
    if (vis) vaiA("cuccia"); else if (G.stato !== "dorme") G.stato = "dorme";
  }
  else if (G.stato === "dorme" && !(G.attivita === "cuccia" && (ora < G.fino || u.sonno))) { G.attivita = null; G.stato = "seduto"; G.fino = ora + 3000; fumetto("miao?"); }
  else if (G.attivita && G.stato !== "dorme") {
    if (G.attivita === "cibo") CU.cibo = Math.max(0, CU.cibo - .45);
    if (G.attivita === "acqua") CU.acqua = Math.max(0, CU.acqua - .45);
    if (G.attivita === "gioco") { CU.gioco = G.f; if (G.f % 28 === 0) G.salto = 10; }
    if (ora > G.fino) { if (G.attivita !== "gioco") salvaCiotole(); G.attivita = null; G.stato = "seduto"; G.fino = ora + 3000 + Math.random() * 5000; }
  }
  else if (G.stato === "seduto" && ora > G.fino) {
    if (vis && Math.random() < .6) vaiA(scegliAttivita()); else { nuovaMeta(); G.stato = "cammina"; }
  }
  // effetti dell'umore
  if (G.stato !== "dorme" && u.festa && G.f % 70 === 0) cuoricino();
  if (G.stato === "seduto" && u.freddo && G.f % 90 === 0) fumetto("brrr… piove");
  var tremo = G.stato === "seduto" && u.freddo && G.f % 4 < 2 ? 1 : 0;
  mettiGatto(tremo, G.salto ? -Math.sin(G.salto / 10 * Math.PI) * 40 : 0);
  $("gatto-zzz").hidden = G.stato !== "dorme";
  $("gatto-zzz").style.transform = "translate(" + Math.round(G.x + 70) + "px," + Math.round(G.y - 6) + "px)";
  $("gatto").title = G.stato === "dorme" ? (G.attivita === "cuccia" ? "Dorme nella cuccia" : "Dorme: " + u.perche) : "Accarezzami";
  disegnaGatto($("gatto").getContext("2d"), G.stato, G.f);
  if (vis) { disegnaCuccia(); if (G.f % 5 === 0) scriviStatoCuccia(); }
}
function mettiGatto(tremo, salto) {
  $("gatto").style.transform = "translate(" + Math.round(G.x + tremo) + "px," + Math.round(G.y + salto) + "px)" +
    (G.preso ? " rotate(" + G.dondolo.toFixed(1) + "deg)" : "") + " scaleX(" + G.verso + ")";
  $("gatto-fumetto").style.transform = "translate(" + Math.round(G.x + 20) + "px," + Math.round(G.y - 34) + "px)";
}
// ---------------------------------------------------------------- prenderlo in braccio e spostarlo
// Un tocco = coccole. Tenendo premuto e trascinando lo si prende per la collottola, con dolcezza:
// penzola e dondola, e lasciato giù si siede lì. Se lo lasci sulla cuccia, su una ciotola o sul gomitolo, ci va.
function attivitaSotto(x, y) {
  if (!cucciaVisibile()) return null;
  var r = $("cuccia").getBoundingClientRect(), p = CU.pos;
  if (x < r.left || x > r.right || y < r.top - 40 || y > r.bottom + 10) return null;
  var lx = (x - r.left) / G.S;
  return lx < p.cibo - 2 ? "cuccia" : lx < p.acqua - 1 ? "cibo" : lx < p.gomitolo - 2 ? "acqua" : "gioco";
}
function avviaPresa() {
  var c = $("gatto"), giu = null;
  c.style.touchAction = "none";
  c.addEventListener("pointerdown", function (e) {
    e.preventDefault(); e.stopPropagation();
    giu = { x: e.clientX, y: e.clientY, t: Date.now(), ox: e.clientX - G.x, oy: e.clientY - G.y, ux: e.clientX };
    try { c.setPointerCapture(e.pointerId); } catch (er) {}
  });
  c.addEventListener("pointermove", function (e) {
    if (!giu) return;
    if (!G.preso) {
      if (Math.abs(e.clientX - giu.x) + Math.abs(e.clientY - giu.y) < 10) return;
      G.preso = true; G.attivita = null; G.dondolo = 0; G.coccole = 0; c.style.cursor = "grabbing";
      fumetto(G.stato === "dorme" ? "mrrp? mi hai svegliato" : ["mrrp?", "miao!", "dove andiamo?"][Math.floor(Math.random() * 3)], 2000);
      $("gatto-zzz").hidden = true;
    }
    // la collottola resta sotto il dito; dondola nel verso opposto al movimento
    G.x = e.clientX - 12 * G.S; G.y = e.clientY - 2 * G.S;
    G.dondolo = Math.max(-25, Math.min(25, G.dondolo - (e.clientX - giu.ux) * .8)); giu.ux = e.clientX;
    mettiGatto(0, 0);
  });
  function lascia(e) {
    if (!giu) return;
    var eraPreso = G.preso; giu = null; G.preso = false; c.style.cursor = "";
    if (!eraPreso) { coccola(); return; }
    var ora = Date.now(), a = attivitaSotto(e.clientX, e.clientY);
    G.x = Math.max(0, Math.min(innerWidth - G.W * G.S, G.x)); G.y = Math.max(0, Math.min(innerHeight - G.H * G.S, G.y));
    if (a) { vaiA(a); G.x = G.tx; G.y = G.ty; iniziaAttivita(ora, umore()); }
    else { G.stato = "seduto"; G.fino = ora + 5000; G.salto = 4; fumetto("eccomi ♥", 1600); }
    passoGatto();
  }
  c.addEventListener("pointerup", lascia);
  c.addEventListener("pointercancel", lascia);
}
function coccola() {
  G.attivita = null; G.coccole = Date.now() + 6000; G.stato = "seduto"; G.fino = Date.now() + 6000;
  fumetto(umore().sonno ? "prrr… zzz" : "prrr ♥"); for (var i = 0; i < 4; i++) setTimeout(cuoricino, i * 250);
}
function saltaGatto() { G.attivita = null; G.salto = 10; G.stato = "seduto"; G.fino = Date.now() + 5000; fumetto("MIAO! Il timer!", 4000); }

function avviaGatto() {
  var acceso = leggi("gatto_acceso", true);
  $("gatto-strato").hidden = !acceso;
  if (!acceso || avviaGatto.fatto) return;
  avviaGatto.fatto = true;
  var c = $("gatto"); c.width = G.W; c.height = G.H; c.style.width = G.W * G.S + "px"; c.style.height = G.H * G.S + "px";
  G.x = innerWidth * 0.6; G.y = innerHeight * 0.75; nuovaMeta(); G.fino = Date.now() + 2000;
  avviaPresa();
  setInterval(passoGatto, 100);
}
