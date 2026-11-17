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
  { id: "tank", nome: "CARRI ARMATI", spiega: "Su/giù per muoverti, sinistra/destra per girare, A per sparare. I colpi rimbalzano! Vince chi arriva a 5." },
  { id: "pong", nome: "PONG A DUE", spiega: "Su e giù per muovere la racchetta. La palla accelera a ogni colpo. Vince chi arriva a 7." },
  { id: "serpi", nome: "SERPENTI", spiega: "Mangia le mele e allungati. Perde chi sbatte contro muri, code o l'altro. Vince chi arriva a 3." },
  { id: "sumo", nome: "SUMO", spiega: "Spingi l'altro fuori dall'arena che si restringe. A = scatto. Vince chi arriva a 3." },
  { id: "party", nome: "DISEGNA E INDOVINA", spiega: "Party con gli ospiti: si entra inquadrando il QR, a turno uno disegna e gli altri indovinano." }
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
  dc.onopen = function () {
    suono(880, 90); suono(1320, 120); manda(p, { t: "ciao", nome: cfg.nomi[p] }); disegnaMenuSePronto();
    regMetti("console.offerta." + p, { occupato: true, t: Date.now() });   // gli altri telefoni sanno che il posto è preso
  };
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
    if (o.applicata && Date.now() - o.applicata > 20000) { preparaOfferta(p); return; }   // risposta arrivata ma niente collegamento: si riparte
    if (o.pronta && r && r.id === o.id && r.rid && CN.usata[p] !== r.rid) {
      CN.usata[p] = r.rid;
      if (CN.pc[p].signalingState !== "have-local-offer") { preparaOfferta(p); return; }   // offerta già usata da un tentativo fallito
      o.applicata = Date.now();
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
    GIOCHI_CONS.forEach(function (g, i) { if (Math.abs(y - (84 + i * 11)) < 5.5) { CN.sel = i; avviaGioco(); } });
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
    var y = 84 + i * 11, s = i === CN.sel;
    if (s) { CX.fillStyle = "#1c2a48"; CX.fillRect(60, y - 5, W - 120, 10); scrivi("▶", 68, y, 7, COL.rosso); }
    scrivi(g.nome, W / 2, y, 8, s ? "#fff" : "#7f95b0");
  });
  var gs = GIOCHI_CONS[CN.sel], r = record(gs.id);
  if (gs.id !== "party") scrivi("RECORD  " + nomeCorto(0) + " " + r[0] + " - " + r[1] + " " + nomeCorto(1), W / 2, 152, 6, "#ffd75e");
  scrivi(gs.spiega, W / 2, 160, 5, "#9fb4cc");
  var lampo = Math.floor(Date.now() / 500) % 2;
  scrivi(lampo ? "PREMI A PER GIOCARE" : "", W / 2, 169, 6, "#ffd75e");
  scrivi("SUL TELEFONO: GIOCHI → 🎮 → COLLEGA IL JOYPAD", W / 2, 177, 4, "#5d7391");
}
function disegnaMenuSePronto() { if (CN.scena === "menu" && CX) disegnaMenu(); }

// ---------------------------------------------------------------- partite: punteggio e fine
var PARTITA = null;
function avviaGioco() {
  var g = GIOCHI_CONS[CN.sel]; suono(660, 80); suono(990, 140);
  if (g.id === "party") { CN.scena = "party"; apriParty(); return; }
  PARTITA = { gioco: g.id, punti: [0, 0], fine: false, msg: "", tMsg: 0, vince: { tron: 3, tank: 5, pong: 7, serpi: 3, sumo: 3 }[g.id] };
  CN.scena = "gioco";
  [0, 1].forEach(function (p) { manda(p, { t: "msg", testo: g.nome.toLowerCase() }); });
  GIOCHI_FN[g.id].round();
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

// ---------------------------------------------------------------- PONG A DUE
var PG = null;
function pongRound(chi) {
  var v = chi === undefined ? (Math.random() < .5 ? 1 : -1) : (chi ? 1 : -1);   // la palla va verso chi ha subito il punto
  PG = { y: [97, 97], bx: W / 2, by: 97, vx: 110 * v, vy: (Math.random() - .5) * 90, via: Date.now() + 1000, colpi: 0 };
}
function pongPasso(dt) {
  if (Date.now() < PG.via || PARTITA.fine || Date.now() < PARTITA.tMsg) return;
  [0, 1].forEach(function (p) {
    var su, giu;
    if (umano(p)) { su = CN.tasti[p].su; giu = CN.tasti[p].giu; }
    else { var verso = (p === 0 ? PG.vx < 0 : PG.vx > 0), meta = verso ? PG.by + PG.vy * .08 : 97, d = meta - PG.y[p]; su = d < -6; giu = d > 6; }
    PG.y[p] = Math.max(14 + 15, Math.min(H - 15, PG.y[p] + ((giu ? 1 : 0) - (su ? 1 : 0)) * (umano(p) ? 150 : 105) * dt));
  });
  PG.bx += PG.vx * dt; PG.by += PG.vy * dt;
  if (PG.by < 17 || PG.by > H - 3) { PG.vy = -PG.vy; PG.by = Math.max(17, Math.min(H - 3, PG.by)); suono(400, 25, "square", .03); }
  [0, 1].forEach(function (p) {
    var x = p ? W - 12 : 12;
    if ((p ? PG.vx > 0 : PG.vx < 0) && Math.abs(PG.bx - x) < 3 && Math.abs(PG.by - PG.y[p]) < 16) {
      var off = (PG.by - PG.y[p]) / 15; PG.colpi++;
      var vel = Math.min(260, Math.hypot(PG.vx, PG.vy) * 1.06);
      PG.vx = (p ? -1 : 1) * vel * Math.cos(off * .9); PG.vy = vel * Math.sin(off * .9);
      PG.bx = x + (p ? -3 : 3); suono(p ? 660 : 520, 40); vibra(p, 25);
    }
  });
  if (PG.bx < -4 || PG.bx > W + 4) { var chi = PG.bx < 0 ? 1 : 0; puntoA(chi); if (!PARTITA.fine) { var perso = 1 - chi; setTimeout(function () { pongRound(perso); }, 1600); } }
}
function pongDisegna() {
  CX.fillStyle = COL.fondo; CX.fillRect(0, 0, W, H);
  for (var y = 16; y < H; y += 8) { CX.fillStyle = "#1c2a48"; CX.fillRect(W / 2 - 1, y, 2, 4); }
  CX.fillStyle = COL.muro; CX.fillRect(0, 14, W, 1); CX.fillRect(0, H - 1, W, 1);
  scrivi(String(PARTITA.punti[0]), W / 2 - 30, 34, 20, "rgba(255,138,61,.35)"); scrivi(String(PARTITA.punti[1]), W / 2 + 30, 34, 20, "rgba(61,224,210,.35)");
  CX.fillStyle = COL.p0; CX.fillRect(8, PG.y[0] - 15, 4, 30); CX.fillStyle = COL.p1; CX.fillRect(W - 12, PG.y[1] - 15, 4, 30);
  CX.fillStyle = "#fff"; CX.fillRect(Math.round(PG.bx) - 2, Math.round(PG.by) - 2, 4, 4);
  barraPunti();
}

// ---------------------------------------------------------------- SERPENTI
var SP = null;
function serpiRound() {
  SP = { s: [{ c: [[14, 21], [13, 21], [12, 21], [11, 21]], d: "dx", vuole: "dx" }, { c: [[65, 21], [66, 21], [67, 21], [68, 21]], d: "sx", vuole: "sx" }],
         mele: [], via: Date.now() + 1200, acc: 0 };
  while (SP.mele.length < 4) serpiMela();
}
function serpiOccupato(x, y) { return SP.s.some(function (s) { return s.c.some(function (q) { return q[0] === x && q[1] === y; }); }); }
function serpiMela() {
  for (var k = 0; k < 200; k++) {
    var x = 2 + Math.floor(Math.random() * (TRON_W - 4)), y = 2 + Math.floor(Math.random() * (TRON_H - 4));
    if (!serpiOccupato(x, y) && !SP.mele.some(function (m) { return m[0] === x && m[1] === y; })) { SP.mele.push([x, y]); return; }
  }
}
function serpiLibero(x, y) { return x >= 0 && y >= 0 && x < TRON_W && y < TRON_H && !serpiOccupato(x, y); }
function serpiBot(p) {
  var s = SP.s[p], t = s.c[0], m = SP.mele.slice().sort(function (a, b) { return (Math.abs(a[0] - t[0]) + Math.abs(a[1] - t[1])) - (Math.abs(b[0] - t[0]) + Math.abs(b[1] - t[1])); })[0];
  var scelte = ["su", "giu", "sx", "dx"].filter(function (d) { return d !== OPPOSTA[s.d] && serpiLibero(t[0] + PASSO[d][0], t[1] + PASSO[d][1]); });
  if (!scelte.length) return;
  scelte.sort(function (a, b) {
    function dist(d) { var x = t[0] + PASSO[d][0], y = t[1] + PASSO[d][1]; return m ? Math.abs(m[0] - x) + Math.abs(m[1] - y) : 0; }
    return dist(a) - dist(b);
  });
  s.vuole = scelte[0];
}
function serpiPasso(dt, ev) {
  ev.forEach(function (e) { if (PASSO[e.k]) SP.s[e.p].vuole = e.k; });
  if (Date.now() < SP.via || PARTITA.fine || Date.now() < PARTITA.tMsg) return;
  SP.acc += dt; if (SP.acc < .09) return; SP.acc -= .09;
  [0, 1].forEach(function (p) { if (!umano(p)) serpiBot(p); });
  var teste = SP.s.map(function (s) { if (s.vuole !== OPPOSTA[s.d]) s.d = s.vuole; return [s.c[0][0] + PASSO[s.d][0], s.c[0][1] + PASSO[s.d][1]]; });
  var mangia = teste.map(function (t) { return SP.mele.findIndex(function (m) { return m[0] === t[0] && m[1] === t[1]; }); });
  SP.s.forEach(function (s, p) { if (mangia[p] < 0) s.c.pop(); });   // la coda si sposta prima del controllo
  var morti = teste.map(function (t) { return !serpiLibero(t[0], t[1]); });
  if (teste[0][0] === teste[1][0] && teste[0][1] === teste[1][1]) morti = [true, true];
  if (morti[0] || morti[1]) { suono(110, 300, "sawtooth", .07); puntoA(morti[0] && morti[1] ? null : morti[0] ? 1 : 0); if (!PARTITA.fine) setTimeout(serpiRound, 1600); return; }
  SP.s.forEach(function (s, p) {
    s.c.unshift(teste[p]);
    if (mangia[p] >= 0) { SP.mele.splice(mangia[p], 1); serpiMela(); suono(p ? 880 : 740, 50); vibra(p, 20); }
  });
}
function serpiDisegna() {
  CX.fillStyle = COL.fondo; CX.fillRect(0, 0, W, H);
  CX.strokeStyle = COL.muro; CX.strokeRect(.5, TRON_Y0 + .5, W - 1, TRON_H * 4 - 1);
  SP.mele.forEach(function (m) { CX.fillStyle = COL.rosso; CX.fillRect(m[0] * 4 + .5, TRON_Y0 + m[1] * 4 + .5, 3, 3); CX.fillStyle = "#7dff9a"; CX.fillRect(m[0] * 4 + 2, TRON_Y0 + m[1] * 4 - .5, 1, 1); });
  SP.s.forEach(function (s, p) {
    s.c.forEach(function (q, i) { CX.fillStyle = i ? (p ? COL.p1 : COL.p0) : "#fff"; CX.globalAlpha = i ? .85 - Math.min(.45, i * .01) : 1; CX.fillRect(q[0] * 4, TRON_Y0 + q[1] * 4, 4, 4); });
    CX.globalAlpha = 1;
  });
  if (Date.now() < SP.via) scrivi("VIA!", W / 2, H / 2, 16, "#fff");
  barraPunti();
}

// ---------------------------------------------------------------- SUMO
var SU = null, SUMO_C = [160, 98];
function sumoRound() {
  SU = { b: [{ x: 115, y: 98, vx: 0, vy: 0, scatto: 0 }, { x: 205, y: 98, vx: 0, vy: 0, scatto: 0 }], r: 76, via: Date.now() + 1200, t0: Date.now() + 1200 };
}
function sumoPasso(dt, ev) {
  if (Date.now() < SU.via || PARTITA.fine || Date.now() < PARTITA.tMsg) return;
  SU.r = Math.max(34, 76 - (Date.now() - SU.t0) / 1000 * 1.4);   // l'arena si restringe
  SU.b.forEach(function (b, p) {
    var ax = 0, ay = 0, scatta = false, k = CN.tasti[p];
    if (umano(p)) { ax = (k.dx ? 1 : 0) - (k.sx ? 1 : 0); ay = (k.giu ? 1 : 0) - (k.su ? 1 : 0); scatta = ev.some(function (e) { return e.p === p && e.k === "a"; }); }
    else {
      var o = SU.b[1 - p], dx = o.x - b.x, dy = o.y - b.y, dc = Math.hypot(b.x - SUMO_C[0], b.y - SUMO_C[1]);
      if (dc > SU.r * .75) { ax = SUMO_C[0] - b.x; ay = SUMO_C[1] - b.y; } else { ax = dx; ay = dy; }
      var l = Math.hypot(ax, ay) || 1; ax /= l; ay /= l;
      scatta = Math.hypot(dx, dy) < 34 && Math.random() < dt * 2;
    }
    var l2 = Math.hypot(ax, ay); if (l2 > 1) { ax /= l2; ay /= l2; }
    b.vx += ax * 160 * dt; b.vy += ay * 160 * dt;
    b.scatto -= dt;
    if (scatta && b.scatto <= 0 && (ax || ay)) { b.vx += ax * 110; b.vy += ay * 110; b.scatto = 1.2; suono(p ? 330 : 290, 90, "sawtooth", .04); vibra(p, 40); }
    b.vx *= Math.pow(.18, dt); b.vy *= Math.pow(.18, dt);
    b.x += b.vx * dt; b.y += b.vy * dt;
  });
  var a = SU.b[0], c = SU.b[1], dx = c.x - a.x, dy = c.y - a.y, d = Math.hypot(dx, dy) || 1;
  if (d < 18) {   // urto: si respingono, il più veloce spinge di più
    var nx = dx / d, ny = dy / d, rel = (a.vx - c.vx) * nx + (a.vy - c.vy) * ny;
    if (rel > 0) { a.vx -= rel * nx; a.vy -= rel * ny; c.vx += rel * nx; c.vy += rel * ny; suono(180, 40, "square", .05); vibra(0, 30); vibra(1, 30); }
    var sp = (18 - d) / 2; a.x -= nx * sp; a.y -= ny * sp; c.x += nx * sp; c.y += ny * sp;
  }
  var fuori = SU.b.map(function (b) { return Math.hypot(b.x - SUMO_C[0], b.y - SUMO_C[1]) > SU.r + 4; });
  if (fuori[0] || fuori[1]) { puntoA(fuori[0] && fuori[1] ? null : fuori[0] ? 1 : 0); if (!PARTITA.fine) setTimeout(sumoRound, 1600); }
}
function sumoDisegna() {
  CX.fillStyle = COL.fondo; CX.fillRect(0, 0, W, H);
  CX.beginPath(); CX.arc(SUMO_C[0], SUMO_C[1], SU.r, 0, 7); CX.fillStyle = "#14203a"; CX.fill();
  CX.lineWidth = 2; CX.strokeStyle = SU.r < 45 ? COL.rosso : "#d8f3ff"; CX.stroke();
  CX.beginPath(); CX.arc(SUMO_C[0], SUMO_C[1], SU.r * .55, 0, 7); CX.lineWidth = 1; CX.strokeStyle = "#22345c"; CX.stroke();
  SU.b.forEach(function (b, p) {
    CX.beginPath(); CX.arc(b.x, b.y, 9, 0, 7); CX.fillStyle = p ? COL.p1 : COL.p0; CX.fill();
    CX.beginPath(); CX.arc(b.x - 3, b.y - 3, 3, 0, 7); CX.fillStyle = "rgba(255,255,255,.55)"; CX.fill();
    if (b.scatto > 0) { CX.fillStyle = "#334"; CX.fillRect(b.x - 8, b.y + 12, 16, 2); CX.fillStyle = "#ffd75e"; CX.fillRect(b.x - 8, b.y + 12, 16 * (1 - b.scatto / 1.2), 2); }
  });
  if (Date.now() < SU.via) scrivi("HAKKEYOI!", W / 2, H / 2, 14, "#fff");
  barraPunti();
}
var GIOCHI_FN = {
  tron: { round: function () { tronRound(); } },
  tank: { round: function () { tankRound(); }, passo: function (dt) { tankAggiorna(dt); }, disegna: function () { tankDisegna(); } },
  pong: { round: function () { pongRound(); }, passo: pongPasso, disegna: pongDisegna },
  serpi: { round: serpiRound, passo: serpiPasso, disegna: serpiDisegna },
  sumo: { round: sumoRound, passo: sumoPasso, disegna: sumoDisegna }
};

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
  if (CN.scena === "party") {
    ev.forEach(function (e) { if (e.k === "b" || e.k === "menu") chiudiParty(); else if (e.k === "a") partyA(); });
    partyTempo(); return;
  }
  if (PARTITA.fine) ev.forEach(function (e) { if (e.k === "a") avviaGioco(); });
  if (ev.some(function (e) { return e.k === "b" || e.k === "menu"; })) { CN.scena = "menu"; suono(330, 80); return; }
  if (PARTITA.gioco === "tron") {
    ev.forEach(function (e) { if (PASSO[e.k] && TR2) TR2.m[e.p].vuole = e.k; });
    CN.accTron = (CN.accTron || 0) + dt;
    while (CN.accTron > .075) { CN.accTron -= .075; tronAggiorna(); }
    tronDisegna();
  } else { CN.eventi = ev; GIOCHI_FN[PARTITA.gioco].passo(dt, ev); CN.eventi = []; GIOCHI_FN[PARTITA.gioco].disegna(); }
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
  var inizio = Date.now(); JP.risposto = null;
  function cerca() {
    if (Date.now() - inizio > 120000) { joypadStato("Non trovo la console: il tablet è sulla pagina 3 e sul Wi‑Fi di casa?"); return; }
    sincronizza().then(function () {
      var o = regLeggi("console.offerta." + io);
      if (o && o.occupato) {
        joypadStato("Il posto di " + cfg.nomi[io] + " è già collegato da un altro telefono. Se questo telefono è di " + cfg.nomi[1 - io] + ", tocca «cambia» qui sopra.");
        JP.tAttesa = setTimeout(cerca, 3000); return;
      }
      if (!o || !o.sdp || Date.now() - o.t > CONS.OFFERTA_VALIDA || o.id === JP.risposto) { JP.tAttesa = setTimeout(cerca, 2000); return; }
      JP.risposto = o.id; rispondi(o);
      JP.tAttesa = setTimeout(function () {   // dopo 20 secondi senza collegamento: chiudo e cerco l'offerta nuova
        if (JP.dc && JP.dc.readyState === "open") return;
        if (JP.pc) try { JP.pc.close(); } catch (e) {}
        JP.pc = JP.dc = null; joypadStato("Riprovo…"); cerca();
      }, 20000);
    });
  }
  JP.cerca = cerca;
  cerca();
}
function rispondi(o) {
  joypadStato("Mi collego…");
  var pc = new RTCPeerConnection({ iceServers: CONS.STUN }); JP.pc = pc;
  pc.ondatachannel = function (e) {
    JP.dc = e.channel;
    JP.dc.onopen = function () { clearTimeout(JP.tAttesa); joypadStato("Collegato 🎮"); apriPad(); if (navigator.vibrate) navigator.vibrate([40, 60, 40]); };
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
    .then(function () { regMetti("console.risposta." + io, { id: o.id, rid: String(nuovoId()), sdp: pc.localDescription.sdp, t: Date.now() }); joypadStato("Aspetto la console…"); })
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

// =====================================================================================================
// PARTY: "Disegna e indovina" con gli ospiti. Si entra dal QR (ospite.html), senza password.
// Per presentarsi tablet e ospiti usano ntfy.sh (pubblico, gratuito) con messaggi cifrati AES-GCM:
// la chiave sta solo nel QR (dopo il #, che non arriva a nessun server). Poi WebRTC diretto come i joypad.
// =====================================================================================================
var PY = null, NTFY = window.NTFY_BASE || "https://ntfy.sh/";   // NTFY_BASE: solo per le prove
var PAROLE = ["gatto", "casa", "sole", "luna", "albero", "pizza", "bicicletta", "treno", "aereo", "chitarra", "ombrello", "occhiali", "fiore", "pesce",
  "elefante", "giraffa", "castello", "torre", "ponte", "montagna", "spiaggia", "nave", "razzo", "robot", "cuore", "stella", "fantasma", "pupazzo di neve",
  "tortellini", "gelato", "caffè", "tazza", "forchetta", "telefono", "computer", "televisione", "orologio", "sveglia", "lampadina", "chiave", "lucchetto",
  "scala", "finestra", "porta", "letto", "divano", "sedia", "tavolo", "candela", "regalo", "torta", "palloncino", "aquilone", "farfalla", "ape", "ragno",
  "serpente", "coccodrillo", "pinguino", "orso", "cane", "coniglio", "topo", "gallina", "mucca", "maiale", "cavallo", "drago", "unicorno", "sirena",
  "pirata", "corona", "spada", "scudo", "arcobaleno", "nuvola", "pioggia", "fulmine", "neve", "vulcano", "isola", "deserto", "cactus", "fungo", "mela",
  "banana", "anguria", "carota", "pomodoro", "uovo", "panino", "hamburger", "spaghetti", "cappello", "scarpa", "calzino", "maglietta", "cravatta",
  "zaino", "valigia", "macchina", "autobus", "semaforo", "ambulanza", "trattore", "elicottero", "sottomarino", "faro", "tenda", "fuoco", "pallone",
  "racchetta", "bowling", "scacchi", "dado", "carta da gioco", "microfono", "batteria", "pianoforte", "violino", "pennello", "forbici", "matita",
  "libro", "occhio", "naso", "mano", "piede", "dente", "spazzolino", "doccia", "vasca", "lavatrice", "frigorifero", "portici", "due torri", "mortadella"];
function b64u(buf) { return btoa(String.fromCharCode.apply(null, new Uint8Array(buf))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, ""); }
function daB64u(s) { s = s.replace(/-/g, "+").replace(/_/g, "/"); while (s.length % 4) s += "="; return Uint8Array.from(atob(s), function (c) { return c.charCodeAt(0); }); }
function pyCifra(o) {
  var iv = crypto.getRandomValues(new Uint8Array(12));
  return crypto.subtle.encrypt({ name: "AES-GCM", iv: iv }, PY.chiave, new TextEncoder().encode(JSON.stringify(o))).then(function (c) {
    var t = new Uint8Array(12 + c.byteLength); t.set(iv); t.set(new Uint8Array(c), 12); return b64u(t);
  });
}
function pyDecifra(s) {
  var b = daB64u(s);
  return crypto.subtle.decrypt({ name: "AES-GCM", iv: b.slice(0, 12) }, PY.chiave, b.slice(12)).then(function (p) { return JSON.parse(new TextDecoder().decode(p)); });
}
function pyPubblica(o) { return pyCifra(o).then(function (c) { return fetch(NTFY + PY.stanza, { method: "POST", body: c }); }); }
function htmlPy(t) { return String(t).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }

function apriParty() {
  var grezza = crypto.getRandomValues(new Uint8Array(16));
  PY = { stanza: "h2l-" + b64u(crypto.getRandomValues(new Uint8Array(12))), giocatori: [], fase: "attesa", turno: -1, parola: "", fine: 0, indovinati: [], storico: [], usate: {} };
  crypto.subtle.importKey("raw", grezza, "AES-GCM", false, ["encrypt", "decrypt"]).then(function (k) {
    PY.chiave = k;
    PY.url = location.origin + location.pathname.replace(/[^/]*$/, "") + "ospite.html#s=" + PY.stanza + "&k=" + b64u(grezza);
    PY.es = new EventSource(NTFY + PY.stanza + "/sse");
    PY.es.onmessage = function (e) {
      var m; try { m = JSON.parse(e.data); } catch (er) { return; }
      if (!m.message) return;
      pyDecifra(m.message).then(pyMessaggio, function () {});
    };
    disegnaParty();
  });
  var box = $("party"); box.hidden = false;
  disegnaParty();
}
function chiudiParty() {
  if (!PY) return;
  if (PY.es) PY.es.close();
  PY.giocatori.forEach(function (g) { try { g.pc.close(); } catch (e) {} });
  PY = null; $("party").hidden = true; CN.scena = "menu"; suono(330, 80);
}
function pyMessaggio(m) {   // dagli ospiti, tramite ntfy: "ciao" (vuole entrare) e "risposta" (aggancio)
  if (!PY) return;
  if (m.tipo === "ciao" && m.id && !PY.giocatori.some(function (g) { return g.id === m.id; })) {
    if (PY.giocatori.length >= 10) return;
    var g = { id: m.id, nome: String(m.nome || "Ospite").slice(0, 16), punti: 0, colore: ["#ff8a3d", "#3de0d2", "#ff3b5c", "#ffd75e", "#9b7bff", "#7dff9a", "#ff7bd5", "#5db8ff", "#ffffff", "#c8a26b"][PY.giocatori.length], dc: null };
    PY.giocatori.push(g);
    var pc = new RTCPeerConnection({ iceServers: CONS.STUN }); g.pc = pc;
    var dc = pc.createDataChannel("party", { ordered: true }); g.dc = dc;
    dc.onopen = function () { suono(880, 90); suono(1320, 120); pyStato(g); disegnaParty(); };
    dc.onclose = function () { disegnaParty(); };
    dc.onmessage = function (e) { try { pyDaOspite(g, JSON.parse(e.data)); } catch (er) {} };
    pc.createOffer().then(function (o) { return pc.setLocalDescription(o); }).then(function () { return attendiIce(pc); })
      .then(function () { return pyPubblica({ tipo: "offerta", id: g.id, sdp: pc.localDescription.sdp }); });
    disegnaParty();
  } else if (m.tipo === "risposta") {
    var x = PY.giocatori.filter(function (g) { return g.id === m.id; })[0];
    if (x && x.pc.signalingState === "have-local-offer") x.pc.setRemoteDescription({ type: "answer", sdp: m.sdp }).catch(function () {});
  }
}
function pyAttivi() { return PY.giocatori.filter(function (g) { return g.dc && g.dc.readyState === "open"; }); }
function pyManda(g, o) { if (g.dc && g.dc.readyState === "open") try { g.dc.send(JSON.stringify(o)); } catch (e) {} }
function pyStato(g) {   // a ciascuno quello che deve vedere
  var d = PY.giocatori[PY.turno], disegno = d === g;
  pyManda(g, { t: "stato", fase: PY.fase, nome: g.nome, colore: g.colore, disegna: disegno && PY.fase === "turno",
               parola: disegno || PY.fase === "svela" ? PY.parola : "", lettere: PY.parola ? PY.parola.replace(/[^ ]/g, "_") : "",
               chi: d ? d.nome : "", fine: PY.fine, indovinato: PY.indovinati.indexOf(g.id) >= 0,
               classifica: PY.giocatori.map(function (x) { return { nome: x.nome, punti: x.punti, colore: x.colore }; }).sort(function (a, b) { return b.punti - a.punti; }) });
}
function pyTutti() { PY.giocatori.forEach(pyStato); }
function normale(t) { return String(t).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9 ]/g, "").replace(/\s+/g, " ").trim(); }
function distanza(a, b) {
  var d = []; for (var i = 0; i <= a.length; i++) { d[i] = [i]; for (var j = 1; j <= b.length; j++) d[i][j] = i ? Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)) : j; }
  return d[a.length][b.length];
}
function pyDaOspite(g, m) {
  var d = PY.giocatori[PY.turno];
  if (m.t === "tratto" && d === g && PY.fase === "turno") { pyTratto(m); PY.storico.push(m); return; }
  if (m.t === "pulisci" && d === g && PY.fase === "turno") { pyPulisci(); PY.storico = []; return; }
  if (m.t === "prova" && PY.fase === "turno" && d !== g && PY.indovinati.indexOf(g.id) < 0) {
    var a = normale(m.testo), p = normale(PY.parola), ok = a === p || a.replace(/^(il|lo|la|i|gli|le|un|uno|una|l) /, "") === p;
    if (ok) {
      var resto = Math.max(0, Math.round((PY.fine - Date.now()) / 1000));
      g.punti += 10 + Math.round(resto / 6); d.punti += 5; PY.indovinati.push(g.id);
      pyFeed(g.nome + " ha indovinato! 🎉", g.colore); suono(988, 100); suono(1319, 160);
      pyManda(g, { t: "esito", ok: true });
      if (PY.indovinati.length >= pyAttivi().length - 1) pyFineTurno(); else pyTutti();
    } else {
      pyFeed(g.nome + ": " + m.testo.slice(0, 30), g.colore);
      if (p.length > 3 && distanza(a, p) <= 1) pyManda(g, { t: "esito", quasi: true });
    }
    disegnaParty();
  }
}
function pyFeed(t, col) { PY.feed = (PY.feed || []).concat([{ t: t, col: col }]).slice(-7); disegnaParty(); }
function partyA() {   // A dal joypad (o il pulsante sul tablet): si comincia
  if (!PY || PY.fase === "turno" || PY.fase === "svela") return;
  if (pyAttivi().length < 2) { pyFeed("Servono almeno 2 giocatori collegati", "#ffd75e"); return; }
  PY.giocatori.forEach(function (g) { g.punti = 0; });
  PY.turno = -1; PY.giri = pyAttivi().length <= 3 ? 2 : 1; PY.fatti = 0; PY.feed = [];
  pyProssimo();
}
function pyProssimo() {
  var attivi = pyAttivi(); if (attivi.length < 2) { PY.fase = "attesa"; pyTutti(); disegnaParty(); return; }
  if (PY.fatti >= attivi.length * PY.giri) { PY.fase = "classifica"; suono(784, 160); suono(1175, 300); pyTutti(); disegnaParty(); return; }
  do { PY.turno = (PY.turno + 1) % PY.giocatori.length; } while (attivi.indexOf(PY.giocatori[PY.turno]) < 0);
  var libere = PAROLE.filter(function (w) { return !PY.usate[w]; }); if (!libere.length) { PY.usate = {}; libere = PAROLE; }
  PY.parola = libere[Math.floor(Math.random() * libere.length)]; PY.usate[PY.parola] = 1;
  PY.fase = "turno"; PY.fine = Date.now() + 80000; PY.indovinati = []; PY.storico = []; PY.fatti++;
  pyPulisci(); pyFeed("Disegna " + PY.giocatori[PY.turno].nome + "!", PY.giocatori[PY.turno].colore);
  pyTutti(); disegnaParty();
}
function pyFineTurno() {
  PY.fase = "svela"; pyFeed("Era: " + PY.parola.toUpperCase(), "#fff"); pyTutti(); disegnaParty();
  setTimeout(function () { if (PY && PY.fase === "svela") pyProssimo(); }, 5000);
}
function partyTempo() {
  if (!PY) return;
  if (PY.fase === "turno") {
    var s = Math.max(0, Math.ceil((PY.fine - Date.now()) / 1000)), e = $("party-tempo");
    if (e && e.textContent !== String(s)) { e.textContent = s; if (s <= 5 && s > 0) suono(440, 60); }
    if (s <= 0) pyFineTurno();
  }
}
function pyTela() { return $("party-tela"); }
function pyPulisci() { var c = pyTela(); if (c) c.getContext("2d").clearRect(0, 0, c.width, c.height); }
function pyTratto(m) {
  var c = pyTela(); if (!c || !m.p || m.p.length < 2) return;
  var g = c.getContext("2d"); g.strokeStyle = m.col || "#fff"; g.lineWidth = (m.w || .012) * c.width; g.lineCap = g.lineJoin = "round";
  g.beginPath(); g.moveTo(m.p[0][0] * c.width, m.p[0][1] * c.height);
  for (var i = 1; i < m.p.length; i++) g.lineTo(m.p[i][0] * c.width, m.p[i][1] * c.height);
  g.stroke();
}
function disegnaParty() {
  var box = $("party"); if (!box || !PY) return;
  var c = pyTela();
  if (!c) {
    box.innerHTML = '<div class="py-sx"><canvas id="party-tela"></canvas><div id="party-sopra"></div></div><div class="py-dx"><div class="py-testa"><b>DISEGNA E INDOVINA</b><span id="party-tempo"></span></div>' +
      '<div id="party-lista"></div><div id="party-feed"></div><div class="py-pulsanti"><button type="button" id="party-via">▶ Inizia</button><button type="button" id="party-esci">Esci</button></div></div>';
    c = pyTela(); var r = c.parentNode.getBoundingClientRect(); c.width = Math.round(r.width * 1.5); c.height = Math.round(r.height * 1.5);
    $("party-via").onclick = partyA; $("party-esci").onclick = chiudiParty;
  }
  var sopra = $("party-sopra"), d = PY.giocatori[PY.turno];
  if (PY.fase === "attesa" || PY.fase === "classifica") {
    var qr = "";
    if (PY.url && window.qrcode) { var q = qrcode(0, "L"); q.addData(PY.url); q.make(); qr = '<img alt="QR per entrare" src="' + q.createDataURL(6, 2) + '">'; }
    sopra.innerHTML = (PY.fase === "classifica" ? '<div class="py-titolo">🏆 Vince ' + htmlPy(pyClassifica()[0].nome) + '!</div>' : '<div class="py-titolo">Inquadrate il QR per giocare</div>') +
      qr + '<div class="py-nota">Serve il Wi‑Fi di casa · poi premete ▶ Inizia (o A sul joypad)</div>';
    sopra.hidden = false;
  } else if (PY.fase === "svela") { sopra.innerHTML = '<div class="py-titolo">Era: ' + htmlPy(PY.parola.toUpperCase()) + "</div>"; sopra.hidden = false; }
  else { sopra.hidden = true; }
  $("party-tempo").textContent = PY.fase === "turno" ? Math.max(0, Math.ceil((PY.fine - Date.now()) / 1000)) : "";
  $("party-lista").innerHTML = pyClassifica().map(function (g) {
    var on = g.dc && g.dc.readyState === "open";
    return '<div class="py-g' + (g === d && PY.fase === "turno" ? " disegna" : "") + (PY.indovinati.indexOf(g.id) >= 0 ? " ok" : "") + (on ? "" : " off") + '"><i style="background:' + g.colore + '"></i><span>' +
      htmlPy(g.nome) + (g === d && PY.fase === "turno" ? " ✏️" : "") + "</span><b>" + g.punti + "</b></div>";
  }).join("") || '<div class="py-nota">Nessuno ancora: inquadrate il QR!</div>';
  $("party-feed").innerHTML = (PY.feed || []).map(function (f) { return '<div style="color:' + f.col + '">' + htmlPy(f.t) + "</div>"; }).join("");
  $("party-via").hidden = PY.fase === "turno" || PY.fase === "svela";
  $("party-via").textContent = PY.fase === "classifica" ? "▶ Un'altra partita" : "▶ Inizia";
}
function pyClassifica() { return PY.giocatori.slice().sort(function (a, b) { return b.punti - a.punti; }); }

// le uniche cose visibili da fuori
window.consoleVisibile = consoleVisibile; window.collegaJoypad = collegaJoypad; window.avviaJoypad = avviaJoypad; window.chiudiJoypad = chiudiJoypad;
window.CONSOLE_DEBUG = { avvia: function (id) { CN.sel = GIOCHI_CONS.findIndex(function (g) { return g.id === id; }); avviaGioco(); }, giochi: function () { return { pong: PG, serpi: SP, sumo: SU }; }, py: function () { return PY; }, CN: CN, collegato: collegato, regLeggi: regLeggi, stato: function () { return { partita: PARTITA, tron: TR2, tank: TK }; } };
})();
