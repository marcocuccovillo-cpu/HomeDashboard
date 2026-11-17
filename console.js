// Home2Love — Console di casa: il tablet (pagina 3) è lo schermo, i telefoni sono i joypad.
// Collegamento: WebRTC diretto in casa (DataChannel, cifrato, ritardo minimo). Per "presentarsi" telefono e tablet
// si scambiano offerta e risposta nel registro condiviso già cifrato ("console.offerta.<p>", "console.risposta.<p>");
// dopo l'aggancio i comandi viaggiano solo tra i due dispositivi.
// Giochi originali: Tron a due (moto di luce) e Carri armati. Se manca un giocatore, gioca il computer.

(function () {   // tutto chiuso qui dentro: nomi come W, H, COL non si scontrano con quelli del gatto e dello skyline
var CONS = { STUN: [{ urls: "stun:stun.l.google.com:19302" }], OFFERTA_VALIDA: 10 * 60000 };
function regMetti(k, v) { var ora = Date.now(); reg[k] = { v: v, t: ora }; salva("cucina_registro", reg); sincronizza(); }
function regLeggi(k) { var e = reg && reg[k]; return e && !e.d ? e.v : null; }
function attendiIce(pc) {   // aspetto i candidati (al massimo 3 secondi): così basta un solo scambio di messaggi
  return new Promise(function (ok) {
    if (pc.iceGatheringState === "complete") return ok();
    var t = setTimeout(ok, 3000);
    pc.addEventListener("icegatheringstatechange", function () { if (pc.iceGatheringState === "complete") { clearTimeout(t); ok(); } });
  });
}

// =====================================================================================================
// TABLET
// =====================================================================================================
var CN = { pc: [null, null], dc: [null, null], offerta: [null, null], usata: ["", ""], umano: [false, false], tastiera: [0, 0],
           tasti: [{}, {}], eventi: [], scena: "menu", sel: 0, attivo: false, tSync: null, ac: null };
var GIOCHI_CONS = [
  { id: "tron", nome: "TRON A DUE", spiega: "Moto di luce: non sbattere contro le scie. Vince chi arriva a 3." },
  { id: "tank", nome: "CARRI ARMATI", spiega: "Su/giù per muoverti, sinistra/destra per girare, A per sparare. I colpi rimbalzano! Vince chi arriva a 5." }
];

function consoleSulTablet() { return !!$("card-console"); }
function suono(f, ms, tipo, vol) {   // bip a 8 bit
  try {
    CN.ac = CN.ac || new (window.AudioContext || window.webkitAudioContext)();
    if (CN.ac.state === "suspended") CN.ac.resume();
    var o = CN.ac.createOscillator(), g = CN.ac.createGain(), t = CN.ac.currentTime;
    o.type = tipo || "square"; o.frequency.setValueAtTime(f, t);
    g.gain.setValueAtTime(vol || .06, t); g.gain.exponentialRampToValueAtTime(.0001, t + ms / 1000);
    o.connect(g); g.connect(CN.ac.destination); o.start(t); o.stop(t + ms / 1000);
  } catch (e) {}
}
function collegato(p) { return !!(CN.dc[p] && CN.dc[p].readyState === "open"); }
function manda(p, m) { if (collegato(p)) try { CN.dc[p].send(JSON.stringify(m)); } catch (e) {} }
function vibra(p, ms) { manda(p, { t: "vib", ms: ms }); }

// ---------------------------------------------------------------- aggancio dei joypad
function preparaOfferta(p) {
  if (CN.pc[p]) try { CN.pc[p].close(); } catch (e) {}
  var pc = new RTCPeerConnection({ iceServers: CONS.STUN }), id = String(nuovoId());
  var dc = pc.createDataChannel("joypad", { ordered: true });
  CN.pc[p] = pc; CN.dc[p] = dc; CN.offerta[p] = { id: id, quando: Date.now(), pronta: false };
  dc.onopen = function () { suono(880, 90); suono(1320, 120); manda(p, { t: "ciao", nome: cfg.nomi[p] }); disegnaMenuSePronto(); };
  dc.onclose = function () { if (CN.dc[p] === dc) { CN.offerta[p] = null; } disegnaMenuSePronto(); };
  dc.onmessage = function (e) { try { input(p, JSON.parse(e.data)); } catch (er) {} };
  pc.onconnectionstatechange = function () { if (/failed|closed/.test(pc.connectionState) && CN.pc[p] === pc) CN.offerta[p] = null; };
  pc.createOffer().then(function (o) { return pc.setLocalDescription(o); }).then(function () { return attendiIce(pc); }).then(function () {
    if (CN.pc[p] !== pc) return;
    CN.offerta[p].pronta = true;
    regMetti("console.offerta." + p, { id: id, sdp: pc.localDescription.sdp, t: Date.now() });
  }).catch(function () { CN.offerta[p] = null; });
}
function controllaAgganci() {
  if (!CN.attivo || !token || !chiaveCripto) return;
  [0, 1].forEach(function (p) {
    if (collegato(p)) return;
    var o = CN.offerta[p];
    if (!o || Date.now() - o.quando > CONS.OFFERTA_VALIDA) { preparaOfferta(p); return; }
    var r = regLeggi("console.risposta." + p);
    if (o.pronta && r && r.id === o.id && CN.usata[p] !== r.id && CN.pc[p].signalingState === "have-local-offer") {
      CN.usata[p] = r.id;
      CN.pc[p].setRemoteDescription({ type: "answer", sdp: r.sdp }).catch(function () { CN.offerta[p] = null; });
    }
  });
}

// ---------------------------------------------------------------- comandi (joypad o tastiera)
var TASTIERA = {
  KeyW: [0, "su"], KeyS: [0, "giu"], KeyA: [0, "sx"], KeyD: [0, "dx"], Space: [0, "a"], KeyQ: [0, "b"],
  ArrowUp: [1, "su"], ArrowDown: [1, "giu"], ArrowLeft: [1, "sx"], ArrowRight: [1, "dx"], Enter: [1, "a"], Backspace: [1, "b"]
};
function input(p, m) {
  if (m.t === "giu") { if (!CN.tasti[p][m.k]) CN.eventi.push({ p: p, k: m.k }); CN.tasti[p][m.k] = true; }
  else if (m.t === "su") CN.tasti[p][m.k] = false;
}
document.addEventListener("keydown", function (e) {
  var x = TASTIERA[e.code]; if (!x || !CN.attivo) return;
  e.preventDefault(); CN.tastiera[x[0]] = Date.now();
  if (!e.repeat) input(x[0], { t: "giu", k: x[1] });
});
document.addEventListener("keyup", function (e) { var x = TASTIERA[e.code]; if (x && CN.attivo) input(x[0], { t: "su", k: x[1] }); });
function umano(p) { return collegato(p) || Date.now() - CN.tastiera[p] < 120000; }

// ---------------------------------------------------------------- disegno: tela con effetto CRT
var CV = null, CX = null, W = 320, H = 180;   // risoluzione "a pixel" della console
function tela() {
  if (CV) return;
  CV = $("console-tela"); CX = CV.getContext("2d"); CV.width = W; CV.height = H; CX.imageSmoothingEnabled = false;
  CV.addEventListener("click", function (e) {   // anche toccando lo schermo del tablet si sceglie il gioco
    if (CN.scena !== "menu") return;
    var r = CV.getBoundingClientRect(), y = (e.clientY - r.top) / r.height * H;
    GIOCHI_CONS.forEach(function (g, i) { if (Math.abs(y - (92 + i * 20)) < 9) { CN.sel = i; avviaGioco(); } });
  });
}
var COL = { fondo: "#05060a", griglia: "#0d1626", testo: "#d8f3ff", p0: "#ff8a3d", p1: "#3de0d2", muro: "#3a4c7a", rosso: "#ff3b5c" };
function scrivi(t, x, y, dim, col, centro) {
  CX.font = "bold " + (dim || 8) + "px ui-monospace, Menlo, Consolas, monospace";
  CX.fillStyle = col || COL.testo; CX.textAlign = centro === false ? "left" : "center"; CX.textBaseline = "middle";
  CX.fillText(t, x, y);
}
function nomeCorto(p) { return (cfg.nomi[p] || "P" + (p + 1)).split(" ")[0].toUpperCase().slice(0, 10); }
function record(id) { cfg.record = cfg.record || {}; cfg.record[id] = cfg.record[id] || [0, 0]; return cfg.record[id]; }

function disegnaMenu() {
  CX.fillStyle = COL.fondo; CX.fillRect(0, 0, W, H);
  for (var x = 0; x < W; x += 16) { CX.fillStyle = COL.griglia; CX.fillRect(x, 0, 1, H); }
  for (var y = 0; y < H; y += 16) { CX.fillStyle = COL.griglia; CX.fillRect(0, y, W, 1); }
  scrivi("HOME2LOVE", W / 2, 22, 18, COL.rosso); scrivi("C O N S O L E", W / 2, 40, 8, COL.testo);
  [0, 1].forEach(function (p) {
    var x = p ? W - 70 : 70, c = collegato(p), u = umano(p);
    CX.fillStyle = p ? COL.p1 : COL.p0; CX.fillRect(x - 46, 52, 92, 20);
    CX.fillStyle = COL.fondo; CX.fillRect(x - 45, 53, 90, 18);
    scrivi(nomeCorto(p), x, 59, 7, p ? COL.p1 : COL.p0);
    scrivi(c ? "JOYPAD OK" : u ? "TASTIERA" : "CPU", x, 66, 6, c ? "#7dff9a" : "#8aa0b8");
  });
  GIOCHI_CONS.forEach(function (g, i) {
    var y = 92 + i * 20, s = i === CN.sel, r = record(g.id);
    if (s) { CX.fillStyle = "#1c2a48"; CX.fillRect(40, y - 8, W - 80, 16); scrivi("▶", 50, y, 8, COL.rosso); }
    scrivi(g.nome, W / 2, y - 1, 9, s ? "#fff" : "#9fb4cc");
    scrivi(nomeCorto(0) + " " + r[0] + " - " + r[1] + " " + nomeCorto(1), W / 2, y + 6, 5, "#6c84a3");
  });
  scrivi(GIOCHI_CONS[CN.sel].spiega, W / 2, 140, 5, "#9fb4cc");
  var lampo = Math.floor(Date.now() / 500) % 2;
  scrivi(lampo ? "PREMI A PER GIOCARE" : "", W / 2, 156, 7, "#ffd75e");
  scrivi("SUL TELEFONO: GIOCHI → CONSOLE → COLLEGA IL JOYPAD", W / 2, 171, 5, "#5d7391");
}
function disegnaMenuSePronto() { if (CN.scena === "menu" && CX) disegnaMenu(); }

// ---------------------------------------------------------------- partite: punteggio e fine
var PARTITA = null;
function avviaGioco() {
  var g = GIOCHI_CONS[CN.sel]; suono(660, 80); suono(990, 140);
  PARTITA = { gioco: g.id, punti: [0, 0], fine: false, msg: "", tMsg: 0, vince: g.id === "tron" ? 3 : 5 };
  CN.scena = "gioco";
  [0, 1].forEach(function (p) { manda(p, { t: "msg", testo: g.nome.toLowerCase() }); });
  if (g.id === "tron") tronRound(); else tankRound();
}
function puntoA(p) {   // p segna (p = null: pareggio del round)
  if (p !== null) { PARTITA.punti[p]++; vibra(p, 120); vibra(1 - p, 400); suono(p ? 523 : 392, 300, "sawtooth", .05); }
  else suono(200, 400, "sawtooth", .05);
  var fine = p !== null && PARTITA.punti[p] >= PARTITA.vince;
  PARTITA.msg = fine ? nomeCorto(p) + " VINCE!" : p === null ? "PAREGGIO" : "PUNTO A " + nomeCorto(p);
  PARTITA.tMsg = Date.now() + (fine ? 99e9 : 1600);
  if (fine) {
    PARTITA.fine = true; var r = record(PARTITA.gioco); r[p]++; salvaCfg();
    [0, 1].forEach(function (q) { manda(q, { t: "msg", testo: q === p ? "hai vinto! 🎉" : "ha vinto " + cfg.nomi[p] }); });
    [784, 988, 1175, 1568].forEach(function (f, i) { setTimeout(function () { suono(f, 160); }, i * 140); });
  }
}
function barraPunti() {
  scrivi(nomeCorto(0) + " " + PARTITA.punti[0], 6, 7, 7, COL.p0, false);
  CX.textAlign = "right"; CX.fillStyle = COL.p1; CX.fillText(PARTITA.punti[1] + " " + nomeCorto(1), W - 6, 7);
  if (PARTITA.msg && Date.now() < PARTITA.tMsg) {
    CX.fillStyle = "rgba(5,6,10,.75)"; CX.fillRect(0, H / 2 - 16, W, 32);
    scrivi(PARTITA.msg, W / 2, H / 2 - 3, 14, "#fff");
    if (PARTITA.fine) scrivi("A = RIVINCITA   B = MENU", W / 2, H / 2 + 10, 6, "#ffd75e");
  }
}

// ---------------------------------------------------------------- TRON A DUE
var TR2 = null, TRON_W = 80, TRON_H = 42, TRON_Y0 = 14;   // griglia di celle da 4 px sotto la barra dei punti
function tronRound() {
  TR2 = { scia: {}, m: [{ x: 12, y: 21, d: "dx", vuole: "dx", vivo: true }, { x: 67, y: 21, d: "sx", vuole: "sx", vivo: true }], passo: 0, via: Date.now() + 1200 };
  TR2.m.forEach(function (m, p) { TR2.scia[m.x + "," + m.y] = p; });
}
var OPPOSTA = { su: "giu", giu: "su", sx: "dx", dx: "sx" }, PASSO = { su: [0, -1], giu: [0, 1], sx: [-1, 0], dx: [1, 0] };
function tronLibero(x, y) { return x >= 0 && y >= 0 && x < TRON_W && y < TRON_H && TR2.scia[x + "," + y] === undefined; }
function tronBot(p) {   // va dritto finché può, gira verso lo spazio più libero
  var m = TR2.m[p], scelte = ["su", "giu", "sx", "dx"].filter(function (d) { return d !== OPPOSTA[m.d]; });
  function spazio(d) { var n = 0, x = m.x, y = m.y; while (n < 25) { x += PASSO[d][0]; y += PASSO[d][1]; if (!tronLibero(x, y)) break; n++; } return n; }
  var dritto = spazio(m.d);
  if (dritto > 3 && Math.random() > .03) return;
  scelte.sort(function (a, b) { return spazio(b) - spazio(a); }); m.vuole = scelte[0];
}
function tronAggiorna() {
  if (Date.now() < TR2.via || PARTITA.fine || Date.now() < PARTITA.tMsg) return;
  TR2.passo++;
  [0, 1].forEach(function (p) { if (!umano(p)) tronBot(p); });
  var nuove = TR2.m.map(function (m) {
    if (m.vuole !== OPPOSTA[m.d]) m.d = m.vuole;
    return [m.x + PASSO[m.d][0], m.y + PASSO[m.d][1]];
  });
  var morti = nuove.map(function (n) { return !tronLibero(n[0], n[1]); });
  if (nuove[0][0] === nuove[1][0] && nuove[0][1] === nuove[1][1]) morti = [true, true];   // frontale
  TR2.m.forEach(function (m, p) { if (!morti[p]) { m.x = nuove[p][0]; m.y = nuove[p][1]; TR2.scia[m.x + "," + m.y] = p; } });
  if (morti[0] || morti[1]) { suono(110, 300, "sawtooth", .07); puntoA(morti[0] && morti[1] ? null : morti[0] ? 1 : 0); if (!PARTITA.fine) setTimeout(tronRound, 1600); }
  else if (TR2.passo % 3 === 0) suono(70 + TR2.passo % 40, 30, "triangle", .015);
}
function tronDisegna() {
  CX.fillStyle = COL.fondo; CX.fillRect(0, 0, W, H);
  for (var x = 0; x <= TRON_W; x += 5) { CX.fillStyle = COL.griglia; CX.fillRect(x * 4, TRON_Y0, 1, TRON_H * 4); }
  for (var y = 0; y <= TRON_H; y += 5) { CX.fillStyle = COL.griglia; CX.fillRect(0, TRON_Y0 + y * 4, W, 1); }
  CX.strokeStyle = COL.muro; CX.strokeRect(.5, TRON_Y0 + .5, W - 1, TRON_H * 4 - 1);
  Object.keys(TR2.scia).forEach(function (k) {
    var c = k.split(","), p = TR2.scia[k];
    CX.fillStyle = p ? COL.p1 : COL.p0; CX.globalAlpha = .55; CX.fillRect(+c[0] * 4, TRON_Y0 + +c[1] * 4, 4, 4);
  });
  CX.globalAlpha = 1;
  TR2.m.forEach(function (m, p) { CX.fillStyle = "#fff"; CX.fillRect(m.x * 4, TRON_Y0 + m.y * 4, 4, 4); CX.fillStyle = p ? COL.p1 : COL.p0; CX.fillRect(m.x * 4 + 1, TRON_Y0 + m.y * 4 + 1, 2, 2); });
  if (Date.now() < TR2.via) scrivi(String(Math.ceil((TR2.via - Date.now()) / 400)), W / 2, H / 2, 24, "#fff");
  barraPunti();
}

// ---------------------------------------------------------------- CARRI ARMATI
var TK = null, MURI = [[60, 40, 12, 40], [248, 100, 12, 40], [140, 30, 40, 10], [140, 140, 40, 10], [150, 80, 20, 20]];
function tankRound() {
  TK = { c: [{ x: 24, y: 94, a: 0, ric: 0 }, { x: 296, y: 94, a: Math.PI, ric: 0 }], colpi: [], via: Date.now() + 1000, ultimo: Date.now() };
}
function dentroMuro(x, y, r) {
  if (x < r || y < 14 + r || x > W - r || y > H - r) return true;
  return MURI.some(function (m) { return x + r > m[0] && x - r < m[0] + m[2] && y + r > m[1] && y - r < m[1] + m[3]; });
}
function tankBot(p, dt) {
  var me = TK.c[p], lui = TK.c[1 - p], verso = Math.atan2(lui.y - me.y, lui.x - me.x), diff = ((verso - me.a + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
  var k = { sx: diff < -.08, dx: diff > .08, su: Math.abs(diff) < .6 && Math.hypot(lui.x - me.x, lui.y - me.y) > 60, giu: false };
  if (Math.abs(diff) < .15 && Math.random() < dt * 1.6) k.a = true;
  return k;
}
function tankAggiorna(dt) {
  if (Date.now() < TK.via || PARTITA.fine || Date.now() < PARTITA.tMsg) return;
  TK.c.forEach(function (c, p) {
    var k = umano(p) ? CN.tasti[p] : tankBot(p, dt), sparo = umano(p) ? CN.eventi.some(function (e) { return e.p === p && e.k === "a"; }) : k.a;
    if (k.sx) c.a -= 2.6 * dt; if (k.dx) c.a += 2.6 * dt;
    var v = (k.su ? 42 : 0) - (k.giu ? 28 : 0), nx = c.x + Math.cos(c.a) * v * dt, ny = c.y + Math.sin(c.a) * v * dt;
    if (!dentroMuro(nx, c.y, 6)) c.x = nx; if (!dentroMuro(c.x, ny, 6)) c.y = ny;
    c.ric -= dt;
    if (sparo && c.ric <= 0 && TK.colpi.filter(function (b) { return b.p === p; }).length < 3) {
      c.ric = .35; suono(p ? 700 : 600, 60, "square", .04);
      TK.colpi.push({ p: p, x: c.x + Math.cos(c.a) * 9, y: c.y + Math.sin(c.a) * 9, vx: Math.cos(c.a) * 110, vy: Math.sin(c.a) * 110, vita: 2.4, rimb: 2 });
    }
  });
  TK.colpi.forEach(function (b) {
    b.vita -= dt;
    var nx = b.x + b.vx * dt, ny = b.y + b.vy * dt;
    if (dentroMuro(nx, b.y, 1)) { b.vx = -b.vx; b.rimb--; suono(300, 20, "triangle", .02); } else b.x = nx;
    if (dentroMuro(b.x, ny, 1)) { b.vy = -b.vy; b.rimb--; suono(300, 20, "triangle", .02); } else b.y = ny;
    if (b.rimb < 0) b.vita = 0;
    TK.c.forEach(function (c, p) {
      if (b.vita > 0 && Math.hypot(b.x - c.x, b.y - c.y) < 6 && !(b.p === p && b.vita > 2.25)) {   // il proprio colpo appena sparato non conta
        b.vita = 0; puntoA(1 - p); if (!PARTITA.fine) setTimeout(tankRound, 1600);
      }
    });
  });
  TK.colpi = TK.colpi.filter(function (b) { return b.vita > 0; });
}
function tankDisegna() {
  CX.fillStyle = COL.fondo; CX.fillRect(0, 0, W, H);
  for (var x = 0; x < W; x += 20) { CX.fillStyle = COL.griglia; CX.fillRect(x, 14, 1, H - 14); }
  for (var y = 14; y < H; y += 20) { CX.fillStyle = COL.griglia; CX.fillRect(0, y, W, 1); }
  CX.strokeStyle = COL.muro; CX.strokeRect(.5, 14.5, W - 1, H - 15);
  MURI.forEach(function (m) { CX.fillStyle = COL.muro; CX.fillRect(m[0], m[1], m[2], m[3]); CX.fillStyle = "#5068a3"; CX.fillRect(m[0], m[1], m[2], 2); });
  TK.c.forEach(function (c, p) {
    CX.save(); CX.translate(c.x, c.y); CX.rotate(c.a);
    CX.fillStyle = p ? COL.p1 : COL.p0; CX.fillRect(-6, -5, 12, 10);
    CX.fillStyle = "#0b0d14"; CX.fillRect(-6, -5, 12, 2); CX.fillRect(-6, 3, 12, 2);
    CX.fillStyle = "#fff"; CX.fillRect(0, -1, 9, 2); CX.fillRect(-2, -2, 4, 4);
    CX.restore();
  });
  TK.colpi.forEach(function (b) { CX.fillStyle = "#fff"; CX.fillRect(b.x - 1, b.y - 1, 2, 2); CX.fillStyle = b.p ? COL.p1 : COL.p0; CX.fillRect(b.x - .5, b.y - .5, 1, 1); });
  if (Date.now() < TK.via) scrivi("PRONTI…", W / 2, H / 2, 14, "#fff");
  barraPunti();
}

// ---------------------------------------------------------------- ciclo principale
function cicloConsole(t) {
  if (!CN.attivo) { CN.ciclo = false; return; }
  requestAnimationFrame(cicloConsole);
  var dt = Math.min(.05, (t - (CN.tPrima || t)) / 1000); CN.tPrima = t;
  var ev = CN.eventi; CN.eventi = [];
  if (CN.scena === "menu") {
    ev.forEach(function (e) {
      if (e.k === "su" || e.k === "giu") { CN.sel = (CN.sel + (e.k === "su" ? -1 : 1) + GIOCHI_CONS.length) % GIOCHI_CONS.length; suono(520, 40); }
      if (e.k === "a") avviaGioco();
    });
    if (CN.scena === "menu") disegnaMenu();
    return;
  }
  if (PARTITA.fine) ev.forEach(function (e) { if (e.k === "a") avviaGioco(); });
  if (ev.some(function (e) { return e.k === "b" || e.k === "menu"; })) { CN.scena = "menu"; suono(330, 80); return; }
  if (PARTITA.gioco === "tron") {
    ev.forEach(function (e) { if (PASSO[e.k] && TR2) TR2.m[e.p].vuole = e.k; });
    CN.accTron = (CN.accTron || 0) + dt;
    while (CN.accTron > .075) { CN.accTron -= .075; tronAggiorna(); }
    tronDisegna();
  } else { CN.eventi = ev; tankAggiorna(dt); CN.eventi = []; tankDisegna(); }
}
function consoleVisibile(si) {   // la pagina 3 è in vista (o no)
  if (!consoleSulTablet()) return;
  document.body.classList.toggle("in-console", si);
  if (si === CN.attivo) return;
  CN.attivo = si; tela();
  clearInterval(CN.tSync);
  if (si) {
    CN.tSync = setInterval(function () { sincronizza(); controllaAgganci(); }, 2000);   // agganci più svelti mentre la console è aperta
    controllaAgganci();
    if (!CN.ciclo) { CN.ciclo = true; CN.tPrima = 0; requestAnimationFrame(cicloConsole); }
  }
}

// =====================================================================================================
// TELEFONO: il joypad
// =====================================================================================================
var JP = window.JP = { pc: null, dc: null, stato: "", tAttesa: null };
function joypadStato(t) { JP.stato = t; var e = $("jp-stato"); if (e) e.textContent = t; var f = $("jp-testo"); if (f) f.textContent = t; }
function collegaJoypad() {
  if (window.io === null || window.io === undefined) return;
  if (!token || !chiaveCripto) { joypadStato("Sblocca prima con la password."); return; }
  chiudiJoypad(true);
  joypadStato("Cerco la console… apri la pagina 3 del tablet.");
  var inizio = Date.now();
  function cerca() {
    sincronizza().then(function () {
      var o = regLeggi("console.offerta." + io);
      if (o && Date.now() - o.t < CONS.OFFERTA_VALIDA && regLeggi("console.risposta." + io) && regLeggi("console.risposta." + io).id === o.id) o = null;   // già usata
      if (!o) { if (Date.now() - inizio < 90000) JP.tAttesa = setTimeout(cerca, 2000); else joypadStato("Non trovo la console: il tablet è sulla pagina 3?"); return; }
      rispondi(o);
    });
  }
  cerca();
}
function rispondi(o) {
  joypadStato("Mi collego…");
  var pc = new RTCPeerConnection({ iceServers: CONS.STUN }); JP.pc = pc;
  pc.ondatachannel = function (e) {
    JP.dc = e.channel;
    JP.dc.onopen = function () { joypadStato("Collegato 🎮"); apriPad(); if (navigator.vibrate) navigator.vibrate([40, 60, 40]); };
    JP.dc.onclose = function () { joypadStato("Scollegato"); chiudiPad(); };
    JP.dc.onmessage = function (m) {
      var x = JSON.parse(m.data);
      if (x.t === "vib" && navigator.vibrate) navigator.vibrate(x.ms);
      if (x.t === "msg") { var f = $("jp-testo"); if (f) f.textContent = x.testo; }
    };
  };
  pc.onconnectionstatechange = function () { if (pc.connectionState === "failed") joypadStato("Collegamento non riuscito: siete sullo stesso Wi‑Fi?"); };
  pc.setRemoteDescription({ type: "offer", sdp: o.sdp }).then(function () { return pc.createAnswer(); })
    .then(function (a) { return pc.setLocalDescription(a); }).then(function () { return attendiIce(pc); })
    .then(function () { regMetti("console.risposta." + io, { id: o.id, sdp: pc.localDescription.sdp, t: Date.now() }); joypadStato("Aspetto la console…"); })
    .catch(function () { joypadStato("Collegamento non riuscito, riprova."); });
}
function chiudiJoypad(silenzioso) {
  clearTimeout(JP.tAttesa);
  if (JP.pc) try { JP.pc.close(); } catch (e) {}
  JP.pc = JP.dc = null; chiudiPad();
  if (!silenzioso) joypadStato("");
}
function tasto(k, giu) {
  if (!JP.dc || JP.dc.readyState !== "open") return;
  JP.dc.send(JSON.stringify({ t: giu ? "giu" : "su", k: k }));
  if (giu && navigator.vibrate) navigator.vibrate(12);
}
function apriPad() {
  var p = $("joypad"); if (!p) return;
  p.classList.add("on"); $("jp-nome").textContent = cfg.nomi[io];
  p.classList.toggle("p1", io === 1);
  try { if (document.documentElement.requestFullscreen) document.documentElement.requestFullscreen().catch(function () {}); } catch (e) {}
}
function chiudiPad() { var p = $("joypad"); if (p) p.classList.remove("on"); try { if (document.fullscreenElement) document.exitFullscreen(); } catch (e) {} }
function avviaJoypad() {
  if (!$("joypad")) return;
  [].forEach.call(document.querySelectorAll("#joypad [data-k]"), function (b) {
    var k = b.getAttribute("data-k");
    b.addEventListener("pointerdown", function (e) { e.preventDefault(); b.classList.add("premuto"); try { b.setPointerCapture(e.pointerId); } catch (er) {} tasto(k, true); });
    ["pointerup", "pointercancel"].forEach(function (ev) { b.addEventListener(ev, function () { b.classList.remove("premuto"); tasto(k, false); }); });
  });
  $("jp-esci").onclick = function () { chiudiJoypad(); if (window.disegnaGiochi) disegnaGiochi(); };
}

// le uniche cose visibili da fuori
window.consoleVisibile = consoleVisibile; window.collegaJoypad = collegaJoypad; window.avviaJoypad = avviaJoypad; window.chiudiJoypad = chiudiJoypad;
window.CONSOLE_DEBUG = { CN: CN, collegato: collegato, regLeggi: regLeggi, stato: function () { return { partita: PARTITA, tron: TR2, tank: TK }; } };
})();
