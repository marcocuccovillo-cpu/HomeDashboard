// HomeDashboard — il gatto di casa: disegnato (gattodisegno.js), vive sopra tutta l'interfaccia (come i bigliettini).
// Gira, si siede, dorme di notte e quando lavorate tutti e due, trema se fuori piove o nevica,
// è felice nei giorni liberi insieme, fa le fusa se lo tocchi e salta quando suona un timer.

var G = { preso: false, dondolo: 0, attivita: null, W: 24, H: 18, S: 5, x: 200, y: 400, tx: 200, ty: 400, verso: 1, stato: "seduto", fino: 0, f: 0, coccole: 0, salto: 0 };
var DPR = Math.min(2, window.devicePixelRatio || 1);
function cappelloOggi() {   // cappellino a feste e compleanni (calcolato una volta al giorno)
  var d = new Date(), k = d.toDateString();
  if (cappelloOggi.k !== k) {
    cappelloOggi.k = k;
    var feste = window.festeDel ? festeDel(d) : [], comp = window.compleanniDel ? compleanniDel(d) : [];
    cappelloOggi.v = feste.some(function (x) { return x.festivo || x.regalo; }) || comp.length > 0;
  }
  return cappelloOggi.v;
}
function disegnaGatto(g, posa, f) {   // il gatto disegnato (gattodisegno.js), nitido alla risoluzione dello schermo
  var w = G.W * G.S, h = G.H * G.S, t = performance.now();
  g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, g.canvas.width, g.canvas.height);
  if (posa === "preso") { g.setTransform(DPR * .33, 0, 0, DPR * .33, DPR * w / 2, DPR * h * .11); GATTO_VET.disegna(g, 0, 0, "preso", t, 1, {}); return; }
  var k = DPR * .52;
  g.setTransform(k, 0, 0, k, DPR * w / 2, DPR * (h - 3));
  GATTO_VET.disegna(g, 0, 0, posa, t, 1, { blink: f % 60 < 2, fusa: G.coccole > Date.now(), cappello: cappelloOggi() });
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
function cucciaPronta() {   // la cuccia esiste ed è impaginata (anche se la pagina 2 non è in vista)
  var c = $("cuccia"); return !!(c && c.parentNode.clientWidth > 0);
}
function cucciaVisibile() {
  var c = $("cuccia"); if (!c || !c.width) return false;
  var r = c.getBoundingClientRect();
  return r.width > 0 && r.left >= -2 && r.right <= innerWidth + 2;
}
function misuraCuccia() {   // un pixel della scena = un pixel del gatto (G.S)
  var c = $("cuccia"); if (!c) return;
  var box = c.parentNode, w = Math.floor(box.clientWidth / G.S), h = Math.floor(box.clientHeight / G.S);
  if (w === CU.w && h === CU.h) return;
  CU.w = w; CU.h = h; c.width = Math.round(w * G.S * DPR); c.height = Math.round(h * G.S * DPR); c.style.width = w * G.S + "px"; c.style.height = h * G.S + "px";
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
function disegnaCuccia() {   // illustrazione morbida: tappetino, cuccia imbottita, ciotole di ceramica, gomitolo, topolino
  var c = $("cuccia"); if (!c || !CU.w) return;
  var g = c.getContext("2d"), p = CU.pos, F = CU.F, scuro = document.body.classList.contains("notte");
  g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, c.width, c.height);
  g.setTransform(G.S * DPR, 0, 0, G.S * DPR, 0, 0);   // da qui in poi: unità della scena (1 = G.S pixel)
  function ell(x, y, rx, ry) { g.beginPath(); g.ellipse(x, y, Math.max(.01, rx), Math.max(.01, ry), 0, 0, Math.PI * 2); }
  function lin(x0, y0, x1, y1, st) { var gr = g.createLinearGradient(x0, y0, x1, y1); st.forEach(function (s) { gr.addColorStop(s[0], s[1]); }); return gr; }
  // pavimento: una striscia di parquet sfumata
  g.fillStyle = lin(0, F - 2, 0, CU.h, [[0, "rgba(0,0,0,0)"], [.45, scuro ? "rgba(120,80,50,.28)" : "rgba(168,113,74,.18)"], [1, scuro ? "rgba(120,80,50,.4)" : "rgba(168,113,74,.3)"]]);
  g.fillRect(0, F - 2, CU.w, CU.h);
  // tappetino e cuccia
  var cx = p.cuccia + 13.5;
  g.fillStyle = scuro ? "rgba(140,110,170,.35)" : "rgba(196,170,226,.6)"; ell(cx, F + .6, 16, 1.6); g.fill();
  g.fillStyle = "rgba(0,0,0,.18)"; ell(cx, F + .5, 13, 1.4); g.fill();
  g.fillStyle = lin(0, F - 6, 0, F + .5, [[0, "#d65466"], [1, "#a83447"]]); ell(cx, F - 2.3, 13, 3.6); g.fill();
  g.fillStyle = lin(0, F - 5, 0, F - 2, [[0, "#f6e3d0"], [1, "#e7cdb4"]]); ell(cx, F - 3.3, 10, 2); g.fill();
  g.strokeStyle = "rgba(255,255,255,.3)"; g.lineWidth = .25; ell(cx, F - 2.3, 12, 3); g.stroke();
  // ciotole (larghe 9 unità): livello visibile + crocchette e gocce che cadono quando si riempiono
  function ciotola(x0, tipo, pieno) {
    var x = x0 + 4.5, l = Math.max(0, Math.min(100, pieno)) / 100;
    g.fillStyle = "rgba(0,0,0,.18)"; ell(x, F + .7, 4.8, .9); g.fill();
    g.fillStyle = lin(x - 4.5, 0, x + 4.5, 0, [[0, "#d8dde6"], [.5, "#ffffff"], [1, "#c9cfda"]]);
    g.beginPath(); g.moveTo(x - 4.5, F - 3); g.lineTo(x + 4.5, F - 3); g.lineTo(x + 3.4, F + .3); g.lineTo(x - 3.4, F + .3); g.closePath(); g.fill();
    g.fillStyle = tipo === "cibo" ? "#e89b5a" : "#6fb8e8"; g.fillRect(x - 4, F - 1.9, 8, .7);
    g.fillStyle = "#eef1f5"; ell(x, F - 3, 4.5, 1.1); g.fill(); g.fillStyle = "#c9cfda"; ell(x, F - 3, 3.7, .75); g.fill();
    if (l > .02) {
      if (tipo === "cibo") for (var i = 0; i < Math.round(12 * l); i++) { g.fillStyle = i % 2 ? "#9b5a2e" : "#b56d3a"; ell(x - 2.7 + (i * 37 % 54) / 10, F - 3.1 - (i % 3) * .2 - l * .4, .55, .4); g.fill(); }
      else { g.fillStyle = "rgba(90,170,235,.85)"; ell(x, F - 3 - l * .3, 3.3 * (.6 + l * .4), .6 * (.6 + l * .4)); g.fill(); g.fillStyle = "rgba(255,255,255,.6)"; ell(x - 1, F - 3.1 - l * .3, .8, .15); g.fill(); }
    }
  }
  ciotola(p.cibo, "cibo", CU.cibo);
  ciotola(p.acqua, "acqua", CU.acqua);
  CU.cade.forEach(function (d) { g.fillStyle = d.col; ell(d.x + .5, d.y, d.col === "#7cc8f0" ? .3 : .45, d.col === "#7cc8f0" ? .55 : .35); g.fill(); });
  // gomitolo che rimbalza quando ci gioca
  var gx = p.gomitolo + 2 + Math.sin(CU.gioco / 3) * (CU.gioco ? 3 : 0), alto = CU.gioco ? Math.abs(Math.sin(CU.gioco / 2) * 3) : 0, gy = F - 1.9 - alto;
  if (gx + 3 < CU.w) {
    g.fillStyle = "rgba(0,0,0," + (.18 - alto * .03) + ")"; ell(gx, F + .5, 2, .45); g.fill();
    g.strokeStyle = "#c24a6c"; g.lineWidth = .25; g.beginPath(); g.moveTo(gx + 1, F - .3); g.quadraticCurveTo(gx + 3.5, F + .9, gx + 6, F + .2); g.stroke();
    var gr = g.createRadialGradient(gx - .6, gy - .6, .2, gx, gy, 2.1); gr.addColorStop(0, "#f59ab2"); gr.addColorStop(1, "#c94a6e");
    g.fillStyle = gr; ell(gx, gy, 1.9, 1.9); g.fill();
    g.save(); g.translate(gx, gy); g.rotate(CU.gioco / 4); g.strokeStyle = "rgba(255,255,255,.45)"; g.lineWidth = .18;
    for (var k = -1; k <= 1; k += .5) { g.beginPath(); g.ellipse(0, 0, 1.75, Math.abs(k) + .4, .6, 0, Math.PI); g.stroke(); }
    g.restore();
  }
  // topolino di pezza
  var t = p.topo + 3;
  if (t + 4 < CU.w) {
    g.fillStyle = "rgba(0,0,0,.15)"; ell(t, F + .5, 2.6, .4); g.fill();
    g.strokeStyle = "#f4a6ae"; g.lineWidth = .25; g.lineCap = "round"; g.beginPath(); g.moveTo(t - 2.2, F - .6); g.quadraticCurveTo(t - 4, F - 2.2, t - 4.6, F - .4); g.stroke();
    g.fillStyle = "#a3a3b0"; g.beginPath(); g.moveTo(t - 2.4, F); g.quadraticCurveTo(t - 2.2, F - 2.6, t + .6, F - 2.2); g.quadraticCurveTo(t + 2.4, F - 1.6, t + 2.8, F - .1); g.closePath(); g.fill();
    g.fillStyle = "#f4a6ae"; ell(t + .6, F - 2.3, .7, .7); g.fill(); g.fillStyle = "#2b1d14"; ell(t + 1.7, F - 1.1, .22, .22); g.fill();
    g.fillStyle = "#e57f8f"; ell(t + 2.8, F - .3, .25, .25); g.fill();
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
  var tit = s.parentNode && s.parentNode.firstChild, ng = window.reg && reg["gatto.nome"] && !reg["gatto.nome"].d && reg["gatto.nome"].v ? reg["gatto.nome"].v.nome : "";
  if (tit && tit.nodeType === 3) tit.nodeValue = (ng ? "L'angolo di " + ng : "L'angolo del gatto") + " ";   // il nome scelto sul telefono
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
  var u = umore(), ora = Date.now(), vis = cucciaPronta(), vista = cucciaVisibile(); G.f++;
  if (G.preso) {   // in braccio: lo muove il dito, qui solo l'animazione
    G.dondolo *= .85; mettiGatto(0, 0);
    disegnaGatto($("gatto").getContext("2d"), "preso", G.f);
    if (vis) { misuraCuccia(); aggiornaCiotole(); disegnaCuccia(); }
    return;
  }
  if (G.salto > 0) G.salto--;
  if (vis) { misuraCuccia(); aggiornaCiotole(); }
  if (G.attivita && !vis) { G.attivita = null; if (G.stato !== "dorme") { G.stato = "seduto"; G.fino = ora + 2000; } }
  // nel suo angolo resta attaccato alla cuccia anche quando si cambia pagina
  if (G.attivita) { var q = punto(G.attivita); G.tx = q.x; G.ty = q.y; if (G.stato !== "cammina") { G.x = q.x; G.y = q.y; } }
  CU.gioco = 0;
  if (G.coccole > ora) G.stato = "seduto";
  else if (G.stato === "cammina") {
    // fuori dallo schermo non serve camminare: va dritto alla meta (o rientra dal bordo)
    var largo = G.W * G.S, fuori = function (x) { return x > innerWidth || x < -largo; };
    if (fuori(G.x) && fuori(G.tx)) { G.x = G.tx; G.y = G.ty; }
    else if (fuori(G.x)) G.x = G.tx > G.x ? -largo : innerWidth;
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
    if (vis && Math.random() < (vista ? .6 : .35)) vaiA(scegliAttivita()); else { nuovaMeta(); G.stato = "cammina"; }
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
  $("gatto-zzz").style.visibility = G.x > innerWidth || G.x < -G.W * G.S ? "hidden" : "";
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
  var c = $("gatto"); c.width = Math.round(G.W * G.S * DPR); c.height = Math.round(G.H * G.S * DPR); c.style.width = G.W * G.S + "px"; c.style.height = G.H * G.S + "px";
  G.x = innerWidth * 0.6; G.y = innerHeight * 0.75; nuovaMeta(); G.fino = Date.now() + 2000;
  avviaPresa();
  if ($("pagine")) $("pagine").addEventListener("scroll", function () {   // scorrendo le pagine il gatto nella cuccia scorre con lei
    if (!G.attivita || G.stato === "cammina" || G.preso) return;
    var q = punto(G.attivita); G.x = q.x; G.y = q.y; mettiGatto(0, 0);
    $("gatto-zzz").style.transform = "translate(" + Math.round(G.x + 70) + "px," + Math.round(G.y - 6) + "px)";
  }, { passive: true });
  setInterval(passoGatto, 100);
}
