// Home2Love — sezione Giochi del telefono.
// Tris e Dama: partite a distanza tra voi due (stato in cfg.tris / cfg.dama, cifrato e sincronizzato come Forza 4);
// ognuno muove dal proprio telefono quando tocca a lui. 2048 e Snake: si gioca da soli, i record vanno in classifica.

var GIOCO = leggi("telefono_gioco", "tris");

function chiSono() { return window.io === null || window.io === undefined ? null : io; }
function scegliChi(box, poi) {   // la prima volta: chi usa questo telefono? (lo stesso della chat)
  var c = el("div", "chi-sei"), p = el("p"); p.textContent = "Chi usa questo telefono?"; c.appendChild(p);
  var r = el("div", "riga2");
  [0, 1].forEach(function (i) {
    var b = el("button", "btn pieno"); b.type = "button"; b.textContent = cfg.nomi[i];
    b.onclick = function () { io = i; salva("telefono_io", i); poi(); };
    r.appendChild(b);
  });
  c.appendChild(r); box.appendChild(c);
}
function infoPartita(box, s, rivincita) {   // "Tocca a…" / "Ha vinto…" + punteggio + rivincita
  var nomi = cfg.nomi, me = chiSono(), t = el("span", "f4-turno");
  if (s.vincitore === "pari") t.textContent = "Pareggio!";
  else if (s.vincitore !== null) { t.textContent = (s.vincitore === me ? "Hai vinto! 🎉" : "Ha vinto " + nomi[s.vincitore]); t.className += " p" + s.vincitore; }
  else { t.textContent = s.turno === me ? "Tocca a te" : "Tocca a " + nomi[s.turno]; t.className += " p" + s.turno; }
  var p = el("span", "f4-punti"); p.textContent = nomi[0] + " " + s.punti[0] + " – " + s.punti[1] + " " + nomi[1];
  box.appendChild(t); box.appendChild(p);
  if (s.vincitore !== null) {
    var b = el("button", "f4-rivincita"); b.type = "button"; b.textContent = "Rivincita";
    b.onclick = function () { rivincita(); disegnaGiochi(); };
    box.appendChild(b);
  }
}
function primoRivincita(s) { return s.vincitore === 0 ? 1 : s.vincitore === 1 ? 0 : 1 - s.primo; }   // inizia chi ha perso

// ================================================================ TRIS
var TRIS_LINEE = [[0, 1, 2], [3, 4, 5], [6, 7, 8], [0, 3, 6], [1, 4, 7], [2, 5, 8], [0, 4, 8], [2, 4, 6]];
function trisNuova(primo) {
  var p = cfg.tris && cfg.tris.punti || [0, 0];
  return { celle: ".........", turno: primo || 0, primo: primo || 0, vincitore: null, vincenti: [], punti: p, ultima: -1 };
}
// partita vuota solo da mostrare: si salva alla prima mossa, così non copre una mossa dell'altro non ancora arrivata
function trisStato() { return cfg.tris && typeof cfg.tris.celle === "string" && cfg.tris.celle.length === 9 ? cfg.tris : trisNuova(0); }
function trisMuovi(i) {
  var s = trisStato(); if (s.vincitore !== null || s.celle.charAt(i) !== "." || s.turno !== chiSono()) return;
  var n = JSON.parse(JSON.stringify(s));
  n.celle = s.celle.substr(0, i) + s.turno + s.celle.substr(i + 1); n.ultima = i;
  var l = TRIS_LINEE.filter(function (x) { return x.every(function (k) { return n.celle.charAt(k) === String(s.turno); }); })[0];
  if (l) { n.vincitore = s.turno; n.vincenti = l; n.punti[s.turno]++; }
  else if (n.celle.indexOf(".") < 0) n.vincitore = "pari";
  else n.turno = 1 - s.turno;
  cfg.tris = n; salvaCfg(); disegnaGiochi();
}
function disegnaTris(box) {
  var s = trisStato(), info = el("div", "f4-info"), g = el("div", "tris-griglia");
  infoPartita(info, s, function () { var v = trisStato(); cfg.tris = trisNuova(primoRivincita(v)); salvaCfg(); });
  for (var i = 0; i < 9; i++) (function (i) {
    var v = s.celle.charAt(i), c = el("button", "tris-c" + (v !== "." ? " p" + v : "") + (s.vincenti.indexOf(i) >= 0 ? " vince" : "") + (i === s.ultima ? " ultima" : ""));
    c.type = "button"; c.textContent = v === "0" ? "✕" : v === "1" ? "◯" : "";
    c.onclick = function () { trisMuovi(i); };
    g.appendChild(c);
  })(i);
  box.appendChild(info); box.appendChild(g);
  var n = el("p", "spiega"); n.textContent = cfg.nomi[0] + " gioca con ✕, " + cfg.nomi[1] + " con ◯.";
  box.appendChild(n);
}

// ================================================================ DAMA (regole italiane, un po' semplificate)
// 64 caselle, riga per riga dall'alto: "." vuota, "a"/"A" pedina/dama di chi ha il colore 0 (parte dal basso),
// "b"/"B" di chi ha il colore 1 (parte dall'alto). Si gioca sulle caselle scure ((r + c) dispari).
// Mangiare è obbligatorio, le prese multiple continuano con la stessa pedina, la pedina non può mangiare la dama.
function damaNuova(primo) {
  var c = "";
  for (var r = 0; r < 8; r++) for (var k = 0; k < 8; k++) c += (r + k) % 2 ? (r < 3 ? "b" : r > 4 ? "a" : ".") : ".";
  var p = cfg.dama && cfg.dama.punti || [0, 0];
  return { celle: c, turno: primo || 0, primo: primo || 0, vincitore: null, punti: p, cattura: -1, ultima: [] };
}
function damaStato() { return cfg.dama && typeof cfg.dama.celle === "string" && cfg.dama.celle.length === 64 ? cfg.dama : damaNuova(0); }
function diChi(v) { return v === "a" || v === "A" ? 0 : v === "b" || v === "B" ? 1 : null; }
function eDama(v) { return v === "A" || v === "B"; }
function damaMosse(s, chi) {   // tutte le mosse valide per chi: le prese, se ce ne sono, sono obbligatorie
  var prese = [], passi = [], C = s.celle;
  for (var i = 0; i < 64; i++) {
    if (s.cattura >= 0 && i !== s.cattura) continue;
    var v = C.charAt(i); if (diChi(v) !== chi) continue;
    var r = Math.floor(i / 8), c = i % 8, avanti = chi === 0 ? -1 : 1;
    var dirs = eDama(v) ? [[-1, -1], [-1, 1], [1, -1], [1, 1]] : [[avanti, -1], [avanti, 1]];
    dirs.forEach(function (d) {
      var r1 = r + d[0], c1 = c + d[1], r2 = r + 2 * d[0], c2 = c + 2 * d[1];
      if (r1 < 0 || r1 > 7 || c1 < 0 || c1 > 7) return;
      var m = C.charAt(r1 * 8 + c1);
      if (m === "." && s.cattura < 0) passi.push({ da: i, a: r1 * 8 + c1, preso: -1 });
      else if (diChi(m) === 1 - chi && !(eDama(m) && !eDama(v)) && r2 >= 0 && r2 <= 7 && c2 >= 0 && c2 <= 7 && C.charAt(r2 * 8 + c2) === ".")
        prese.push({ da: i, a: r2 * 8 + c2, preso: r1 * 8 + c1 });
    });
  }
  return prese.length ? prese : passi;
}
function damaMuovi(m) {
  var s = damaStato(), n = JSON.parse(JSON.stringify(s)), C = s.celle.split(""), v = C[m.da], chi = s.turno;
  C[m.a] = v; C[m.da] = "."; if (m.preso >= 0) C[m.preso] = ".";
  var r = Math.floor(m.a / 8), promossa = !eDama(v) && ((chi === 0 && r === 0) || (chi === 1 && r === 7));
  if (promossa) C[m.a] = v.toUpperCase();
  n.celle = C.join(""); n.cattura = -1;
  n.ultima = s.cattura >= 0 && s.ultima && s.ultima.length ? s.ultima.concat([m.a]) : [m.da, m.a];
  if (m.preso >= 0 && !promossa) {   // presa multipla: se la stessa pedina può mangiare ancora, continua lei
    n.cattura = m.a;
    if (!damaMosse(n, chi).some(function (x) { return x.preso >= 0; })) n.cattura = -1;
  }
  if (n.cattura < 0) {
    n.turno = 1 - chi;
    if (!damaMosse(n, n.turno).length) { n.vincitore = chi; n.punti[chi]++; }   // l'altro non ha più pedine o mosse
  }
  cfg.dama = n; salvaCfg();
}
var damaSel = -1;
function disegnaDama(box) {
  var s = damaStato(), me = chiSono(), info = el("div", "f4-info");
  infoPartita(info, s, function () { var v = damaStato(); cfg.dama = damaNuova(primoRivincita(v)); salvaCfg(); damaSel = -1; });
  box.appendChild(info);
  var mosse = s.vincitore === null && s.turno === me ? damaMosse(s, me) : [];
  if (s.cattura >= 0) damaSel = s.cattura;
  var dest = mosse.filter(function (m) { return m.da === damaSel; });
  var g = el("div", "dama-griglia"), giro = me === 1;   // ognuno vede le sue pedine in basso
  for (var k = 0; k < 64; k++) (function (k) {
    var i = giro ? 63 - k : k, r = Math.floor(i / 8), c = i % 8, v = s.celle.charAt(i), scura = (r + c) % 2 === 1;
    var cl = "dama-c" + (scura ? " scura" : "") + (i === damaSel ? " sel" : "") + (s.ultima && s.ultima.indexOf(i) >= 0 ? " ultima" : "");
    var d = dest.filter(function (m) { return m.a === i; })[0];
    if (d) cl += " meta";
    if (mosse.some(function (m) { return m.da === i; }) && damaSel < 0) cl += " puo";
    var b = el("button", cl); b.type = "button";
    if (v !== ".") { var p = el("i", "pedina p" + diChi(v) + (eDama(v) ? " re" : "")); b.appendChild(p); }
    b.onclick = function () {
      if (d) { damaMuovi(d); damaSel = damaStato().cattura; disegnaGiochi(); return; }
      if (s.cattura >= 0) return;
      damaSel = mosse.some(function (m) { return m.da === i; }) ? (damaSel === i ? -1 : i) : -1; disegnaGiochi();
    };
    g.appendChild(b);
  })(k);
  box.appendChild(g);
  var n = el("p", "spiega");
  n.textContent = s.cattura >= 0 ? "Puoi mangiare ancora con la stessa pedina!" :
    mosse.length && mosse[0].preso >= 0 ? "Devi mangiare: le pedine che possono farlo sono evidenziate." :
    "Tocca una tua pedina e poi la casella dove spostarla. Mangiare è obbligatorio, la pedina non mangia la dama.";
  box.appendChild(n);
}

// ================================================================ record (2048 e Snake)
function record(g) { cfg.record = cfg.record || {}; cfg.record[g] = cfg.record[g] || [0, 0]; return cfg.record[g]; }
function nuovoRecord(g, punti) {
  var me = chiSono(), r = record(g); if (me === null || punti <= r[me]) return false;
  r[me] = punti; salvaCfg(); return true;
}
function classifica(box, g) {
  var r = record(g), c = el("div", "classifica");
  [0, 1].forEach(function (p) {
    var s = el("span", "p" + p + (r[p] && r[p] >= r[1 - p] ? " primo" : ""));
    s.textContent = (r[p] && r[p] >= r[1 - p] && r[1 - p] !== r[p] ? "👑 " : "") + cfg.nomi[p] + " " + r[p];
    c.appendChild(s);
  });
  box.appendChild(c);
}
function scorrimento(el_, fn) {   // dito che scorre: su, giù, sinistra, destra
  var x0, y0;
  el_.addEventListener("touchstart", function (e) { x0 = e.touches[0].clientX; y0 = e.touches[0].clientY; }, { passive: true });
  el_.addEventListener("touchend", function (e) {
    if (x0 === undefined) return;
    var dx = e.changedTouches[0].clientX - x0, dy = e.changedTouches[0].clientY - y0; x0 = undefined;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 24) return;
    fn(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? "d" : "s") : (dy > 0 ? "g" : "su"));
  });
}
document.addEventListener("keydown", function (e) {   // anche con le frecce (per provarlo dal computer)
  var k = { ArrowUp: "su", ArrowDown: "g", ArrowLeft: "s", ArrowRight: "d" }[e.key];
  if (!k || scheda !== "giochi") return;
  e.preventDefault();
  if (GIOCO === "2048") g48Muovi(k); else if (GIOCO === "snake") SN.vuole = k;
});

// ================================================================ 2048
var G48 = leggi("gioco_2048", null);
function g48Nuova() { G48 = { c: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], punti: 0, fine: false }; g48Aggiungi(); g48Aggiungi(); salva("gioco_2048", G48); }
function g48Aggiungi() {
  var vuote = []; G48.c.forEach(function (v, i) { if (!v) vuote.push(i); });
  if (vuote.length) G48.c[vuote[Math.floor(Math.random() * vuote.length)]] = Math.random() < .9 ? 2 : 4;
}
function g48Muovi(dir) {
  if (!G48 || G48.fine) return;
  var prima = G48.c.join(","), nuove = [];
  for (var l = 0; l < 4; l++) {
    var idx = [0, 1, 2, 3].map(function (k) {
      return dir === "s" ? l * 4 + k : dir === "d" ? l * 4 + 3 - k : dir === "su" ? k * 4 + l : (3 - k) * 4 + l;
    });
    var v = idx.map(function (i) { return G48.c[i]; }).filter(Boolean), out = [];
    for (var j = 0; j < v.length; j++) {
      if (v[j] === v[j + 1]) { out.push(v[j] * 2); G48.punti += v[j] * 2; nuove.push(idx[out.length - 1]); j++; } else out.push(v[j]);
    }
    idx.forEach(function (i, k) { G48.c[i] = out[k] || 0; });
  }
  if (G48.c.join(",") === prima) return;
  g48Aggiungi(); G48.unite = nuove;
  var bloccato = G48.c.every(function (v, i) {
    return v && !(i % 4 < 3 && G48.c[i + 1] === v) && !(i < 12 && G48.c[i + 4] === v);
  });
  if (bloccato) { G48.fine = true; G48.record = nuovoRecord("2048", G48.punti); }
  salva("gioco_2048", G48); disegnaGiochi();
}
function disegna2048(box) {
  if (!G48) g48Nuova();
  var testa = el("div", "f4-info"), p = el("span", "f4-turno"); p.textContent = G48.punti + " punti";
  var b = el("button", "f4-rivincita"); b.type = "button"; b.textContent = "Nuova partita";
  b.onclick = function () { if (!G48.fine && G48.punti) nuovoRecord("2048", G48.punti); g48Nuova(); disegnaGiochi(); };
  testa.appendChild(p); testa.appendChild(b); box.appendChild(testa);
  classifica(box, "2048");
  var g = el("div", "g48-griglia");
  G48.c.forEach(function (v, i) {
    var c = el("div", "g48-c" + (v ? " v" + Math.min(v, 4096) : "") + (G48.unite && G48.unite.indexOf(i) >= 0 ? " unita" : ""));
    c.textContent = v || ""; g.appendChild(c);
  });
  if (G48.fine) { var f = el("div", "fine-gioco"); f.textContent = G48.record ? "Nuovo record! 🎉" : "Partita finita"; g.appendChild(f); }
  scorrimento(g, g48Muovi);
  box.appendChild(g);
  var n = el("p", "spiega"); n.textContent = "Scorri con il dito: le tessere uguali si uniscono. Arrivi a 2048?"; box.appendChild(n);
}

// ================================================================ SNAKE
var SN = { N: 15, timer: null, vuole: null };
function snNuova() {
  SN.corpo = [[7, 7], [6, 7], [5, 7]]; SN.dir = "d"; SN.vuole = null; SN.punti = 0; SN.fine = false; SN.via = false; SN.record = false; snCibo();
}
function snCibo() {
  do { SN.cibo = [Math.floor(Math.random() * SN.N), Math.floor(Math.random() * SN.N)]; }
  while (SN.corpo.some(function (p) { return p[0] === SN.cibo[0] && p[1] === SN.cibo[1]; }));
}
function snPasso() {
  var opposto = { su: "g", g: "su", s: "d", d: "s" };
  if (SN.vuole && SN.vuole !== opposto[SN.dir]) SN.dir = SN.vuole;
  SN.vuole = null;
  var t = SN.corpo[0], d = { su: [0, -1], g: [0, 1], s: [-1, 0], d: [1, 0] }[SN.dir], n = [t[0] + d[0], t[1] + d[1]];
  var muro = n[0] < 0 || n[1] < 0 || n[0] >= SN.N || n[1] >= SN.N;
  var morso = SN.corpo.some(function (p, i) { return i < SN.corpo.length - 1 && p[0] === n[0] && p[1] === n[1]; });
  if (muro || morso) { SN.fine = true; SN.record = nuovoRecord("snake", SN.punti); snFerma(); disegnaGiochi(); return; }
  SN.corpo.unshift(n);
  if (n[0] === SN.cibo[0] && n[1] === SN.cibo[1]) { SN.punti++; snCibo(); if (navigator.vibrate) navigator.vibrate(15); snVia(); }
  else SN.corpo.pop();
  snDisegnaCanvas();
}
function snVia() { clearInterval(SN.timer); SN.via = true; SN.timer = setInterval(snPasso, Math.max(80, 190 - SN.punti * 5)); }   // più mangia, più corre
function snFerma() { clearInterval(SN.timer); SN.timer = null; }
function snDisegnaCanvas() {
  var cv = $("sn-canvas"); if (!cv) return;
  var g = cv.getContext("2d"), L = cv.width / SN.N, st = getComputedStyle(document.documentElement);
  g.fillStyle = st.getPropertyValue("--soft"); g.fillRect(0, 0, cv.width, cv.height);
  g.fillStyle = "#d7263d"; g.beginPath(); g.arc((SN.cibo[0] + .5) * L, (SN.cibo[1] + .5) * L, L * .38, 0, 7); g.fill();
  SN.corpo.forEach(function (p, i) {
    g.fillStyle = i ? st.getPropertyValue("--p1") : st.getPropertyValue("--p0");
    g.beginPath(); g.roundRect ? g.roundRect(p[0] * L + 1, p[1] * L + 1, L - 2, L - 2, L * .3) : g.rect(p[0] * L + 1, p[1] * L + 1, L - 2, L - 2); g.fill();
  });
  var pt = $("sn-punti"); if (pt) pt.textContent = SN.punti + " punti";
}
function disegnaSnake(box) {
  if (!SN.corpo) snNuova();
  var testa = el("div", "f4-info"), p = el("span", "f4-turno"); p.id = "sn-punti";
  var b = el("button", "f4-rivincita"); b.type = "button"; b.textContent = SN.via && !SN.fine ? "Pausa" : SN.fine ? "Rigioca" : "Gioca";
  b.onclick = function () {
    if (SN.fine) snNuova();
    if (SN.timer) snFerma(); else snVia();
    disegnaGiochi();
  };
  testa.appendChild(p); testa.appendChild(b); box.appendChild(testa);
  classifica(box, "snake");
  var w = el("div", "sn-box"), cv = el("canvas"); cv.id = "sn-canvas"; cv.width = cv.height = 300;
  w.appendChild(cv);
  if (SN.fine) { var f = el("div", "fine-gioco"); f.textContent = (SN.record ? "Nuovo record! 🎉 " : "Game over · ") + SN.punti + " punti"; w.appendChild(f); }
  else if (!SN.timer) { var f2 = el("div", "fine-gioco"); f2.textContent = SN.via ? "In pausa" : "Tocca Gioca"; w.appendChild(f2); }
  scorrimento(w, function (d) { SN.vuole = d; if (!SN.timer && !SN.fine) { snVia(); disegnaGiochi(); } });
  box.appendChild(w);
  var n = el("p", "spiega"); n.textContent = "Scorri per girare. Mangia i pallini rossi senza toccare i bordi né la coda."; box.appendChild(n);
  setTimeout(snDisegnaCanvas, 0);
}

// ================================================================ console: il telefono diventa un joypad
function disegnaConsoleTel(box) {
  var c = el("div", "card jp-card");
  c.innerHTML = '<div class="grande">🎮</div><h3 style="justify-content:center">Console di casa</h3>' +
    '<p>Apri la <b>pagina 3</b> del tablet (scorri a destra due volte), poi collega il tuo telefono come joypad. Dovete essere sul Wi‑Fi di casa.</p>';
  var chi = el("p"); chi.innerHTML = "Questo telefono è di <b></b> · "; chi.querySelector("b").textContent = cfg.nomi[io];
  var cambia = el("a"); cambia.href = "#"; cambia.textContent = "cambia"; cambia.style.color = "var(--accent)";
  cambia.onclick = function (e) { e.preventDefault(); io = 1 - io; salva("telefono_io", io); if (window.chiudiJoypad) chiudiJoypad(); disegnaGiochi(); };
  chi.appendChild(cambia); c.appendChild(chi);
  var b = el("button", "btn pieno"); b.type = "button"; b.textContent = "Collega il joypad"; b.onclick = collegaJoypad;
  var st = el("p"); st.id = "jp-stato"; st.textContent = JP.stato || "";
  c.appendChild(b); c.appendChild(st); box.appendChild(c);
  var r = el("div", "card");
  r.innerHTML = "<h3>Giochi della console</h3>";
  [["tron", "Tron a due"], ["tank", "Carri armati"], ["pong", "Pong a due"], ["serpi", "Serpenti"], ["sumo", "Sumo"]].forEach(function (x) { var d = el("div", "titolo"); d.style.margin = "6px 0"; var n = el("span"); n.textContent = x[1]; d.appendChild(n); r.appendChild(d); classifica(r, x[0]); });
  box.appendChild(r);
}

// ================================================================ scheda
function disegnaGiochi() {
  var box = $("giochi-box"); if (!box) return;
  [].forEach.call($("giochi-scelta").children, function (b) { b.classList.toggle("sel", b.getAttribute("data-v") === GIOCO); });
  box.innerHTML = "";
  if (GIOCO !== "snake") snFerma();
  if (chiSono() === null) { scegliChi(box, disegnaGiochi); return; }
  if (GIOCO === "tris") disegnaTris(box);
  else if (GIOCO === "dama") disegnaDama(box);
  else if (GIOCO === "2048") disegna2048(box);
  else if (GIOCO === "console") disegnaConsoleTel(box);
  else disegnaSnake(box);
}
function avviaGiochi() {
  $("giochi-scelta").onclick = function (e) {
    var b = e.target.closest("button"); if (!b) return;
    GIOCO = b.getAttribute("data-v"); salva("telefono_gioco", GIOCO); disegnaGiochi();
  };
  disegnaGiochi();
}
