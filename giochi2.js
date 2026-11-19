// Home2Love — altri giochi del telefono: Battaglia navale (a turni, a distanza) e Parole (tipo Ruzzle, stessa griglia per tutti e due).
// Stato nel registro cifrato, con chiavi separate per persona (così non si pestano i piedi):
//   bn.p = { id, inizia, t }            partita di battaglia navale
//   bn.<id>.<p> = { navi, colpi, pronto, t }   le mie navi (celle 0..63) e i miei colpi nel mare dell'altro
//   bn.vinte.<p> = { n }                 partite vinte (la scrive solo chi vince)
//   pa.p = { id, t }                     partita di Parole (di solito una al giorno)
//   pa.<id>.<p> = { punti, parole, t }   risultato di ognuno
// Dizionario: parole.txt (da "an-array-of-italian-words", licenza MIT), solo lettere a–z, 3–12 lettere.

// ================================================================ utilità
function g2v(k) { var e = reg && reg[k]; return e && !e.d && e.v ? e.v : null; }
function g2scrivi(k, v) { var ora = Date.now(); reg[k] = { v: v, t: ora }; salva("cucina_registro", reg); sincronizza(); }
function g2pronto() { if (!token || !chiaveCripto || !reg) { alert("Sblocca prima con la password."); return false; } return true; }
function g2nome(p) { return (cfg.nomi[p] || "").split(" ")[0]; }
function g2rng(seme) {   // mulberry32: stessi numeri su tutti e due i telefoni
  var h = 1779033703 ^ seme.length; for (var i = 0; i < seme.length; i++) { h = Math.imul(h ^ seme.charCodeAt(i), 3432918353); h = h << 13 | h >>> 19; }
  return function () { h = Math.imul(h ^ h >>> 16, 2246822507); h = Math.imul(h ^ h >>> 13, 3266489909); h ^= h >>> 16; var t = (h += 0x6D2B79F5); t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}
(function () {
  var st = document.createElement("style");
  st.textContent = [
    ".bn-mare{display:grid;grid-template-columns:repeat(8,1fr);gap:3px;width:min(100%,340px);margin:6px auto;background:linear-gradient(160deg,#2b7bc0,#174b86);padding:6px;border-radius:16px;touch-action:manipulation}",
    ".bn-mare.mio{width:min(70%,230px);gap:2px;padding:4px;border-radius:12px}",
    ".bn-mare button{aspect-ratio:1;border:0;border-radius:6px;background:rgba(255,255,255,.12);padding:0;font-size:min(4.6vw,19px);line-height:1;color:#fff}",
    ".bn-mare.mio button{border-radius:4px;font-size:11px}",
    ".bn-mare .nave{background:#5d6b7a}.bn-mare .acqua{background:rgba(255,255,255,.05);color:rgba(255,255,255,.7)}",
    ".bn-mare .colpito{background:#e8553a}.bn-mare .affondato{background:#5a1d18}.bn-mare .ultimo{box-shadow:0 0 0 2px #ffd34d inset}",
    ".bn-mare.attivo button:not(.acqua):not(.colpito):not(.affondato):active{background:rgba(255,255,255,.35)}",
    ".bn-tit{text-align:center;font-size:13px;color:var(--muted);margin:10px 0 2px;font-weight:600}",
    ".g2-riga{display:flex;gap:8px;justify-content:center;margin:10px 0}",
    ".pa-griglia{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;width:min(100%,330px);margin:8px auto;touch-action:none;-webkit-user-select:none;user-select:none}",
    ".pa-griglia div{aspect-ratio:1;border-radius:16px;background:var(--card);box-shadow:var(--ombra);display:grid;place-items:center;font-size:34px;font-weight:700;text-transform:uppercase;color:var(--ink);position:relative}",
    ".pa-griglia div small{position:absolute;right:8px;bottom:5px;font-size:11px;font-weight:600;color:var(--muted)}",
    ".pa-griglia div.on{background:var(--accent);color:#fff}.pa-griglia div.on small{color:#fff}",
    ".pa-griglia.ok div.on{background:#3f8a4c}.pa-griglia.no div.on{background:#9a8e8e}.pa-griglia.gia div.on{background:#d9a62b}",
    ".pa-testa{display:flex;justify-content:space-between;align-items:baseline;width:min(100%,330px);margin:0 auto}",
    ".pa-tempo{font-size:28px;font-weight:300;font-variant-numeric:tabular-nums}.pa-tempo.poco{color:var(--accent)}",
    ".pa-parola{text-align:center;height:30px;font-size:22px;font-weight:700;letter-spacing:.08em;text-transform:uppercase}",
    ".pa-trovate{display:flex;flex-wrap:wrap;gap:5px;justify-content:center;max-width:340px;margin:6px auto}",
    ".pa-trovate span{background:var(--soft);border-radius:9px;padding:3px 8px;font-size:13px}.pa-trovate span.mia{background:var(--accent-soft);color:var(--accent);font-weight:600}",
    ".pa-ris{display:flex;gap:10px;margin:8px 0}.pa-ris div{flex:1;background:var(--card);border-radius:16px;box-shadow:var(--ombra);padding:12px;text-align:center}",
    ".pa-ris b{display:block;font-size:30px;font-weight:300}.pa-ris .vince{box-shadow:0 0 0 2px #ffcf4a,var(--ombra)}"
  ].join("\n");
  document.head.appendChild(st);
})();

// ================================================================ BATTAGLIA NAVALE (8×8, navi da 4, 3, 3, 2, 2)
var BN_FLOTTA = [4, 3, 3, 2, 2], BN_N = 8;
function bnPartita() { return g2v("bn.p"); }
function bnDi(p) { var pa = bnPartita(); return pa ? g2v("bn." + pa.id + "." + p) : null; }
function bnMischia() {   // navi a caso, che non si toccano
  for (var tent = 0; tent < 200; tent++) {
    var occ = {}, navi = [], ok = true;
    for (var i = 0; i < BN_FLOTTA.length && ok; i++) {
      var messa = false;
      for (var t = 0; t < 200 && !messa; t++) {
        var oriz = Math.random() < .5, L = BN_FLOTTA[i], r = Math.floor(Math.random() * (oriz ? BN_N : BN_N - L + 1)), c = Math.floor(Math.random() * (oriz ? BN_N - L + 1 : BN_N)), celle = [], libera = true;
        for (var k = 0; k < L; k++) celle.push((r + (oriz ? 0 : k)) * BN_N + c + (oriz ? k : 0));
        celle.forEach(function (x) { var rr = Math.floor(x / BN_N), cc = x % BN_N; for (var dr = -1; dr <= 1; dr++) for (var dc = -1; dc <= 1; dc++) { var y = (rr + dr) * BN_N + cc + dc; if (rr + dr >= 0 && rr + dr < BN_N && cc + dc >= 0 && cc + dc < BN_N && occ[y]) libera = false; } });
        if (libera) { celle.forEach(function (x) { occ[x] = 1; }); navi.push(celle); messa = true; }
      }
      if (!messa) ok = false;
    }
    if (ok) return navi;
  }
}
function bnTurno(pa, a, b) {   // chi spara adesso
  var n = [a && a.colpi ? a.colpi.length : 0, b && b.colpi ? b.colpi.length : 0], i = pa.inizia;
  return n[i] <= n[1 - i] ? i : 1 - i;
}
function bnFinita(navi, colpi) { var tutte = [].concat.apply([], navi || []); return tutte.length && tutte.every(function (x) { return colpi.indexOf(x) >= 0; }); }
function g2pulisci(prefisso, tieni) {   // toglie i dati delle partite vecchie (restano solo quelle per cui tieni() dice sì)
  var ora = Date.now();
  Object.keys(reg).forEach(function (k) { if (k.indexOf(prefisso) === 0 && !reg[k].d && !tieni(k)) reg[k] = { d: 1, t: ora }; });
}
function bnNuova(inizia) {
  if (!g2pronto()) return;
  g2pulisci("bn.", function (k) { return /^bn\.(p|vinte\.)/.test(k); });   // le navi e i colpi delle partite finite
  g2scrivi("bn.p", { id: String(nuovoId()), inizia: inizia === undefined ? Math.round(Math.random()) : inizia, t: Date.now() });
  disegnaGiochi();
}
function bnSpara(x) {
  var pa = bnPartita(), me = io, mio = bnDi(me), suo = bnDi(1 - me);
  if (!pa || !mio || !suo || !mio.pronto || !suo.pronto) return;
  if (bnTurno(pa, me === 0 ? mio : suo, me === 0 ? suo : mio) !== me) return;
  if (mio.colpi.indexOf(x) >= 0 || bnFinita(suo.navi, mio.colpi) || bnFinita(mio.navi, suo.colpi)) return;
  var n = { navi: mio.navi, colpi: mio.colpi.concat([x]), pronto: true, t: Date.now() };
  g2scrivi("bn." + pa.id + "." + me, n);
  var nave = suo.navi.filter(function (s) { return s.indexOf(x) >= 0; })[0];
  if (navigator.vibrate) navigator.vibrate(nave ? [40, 40, 90] : 25);
  if (nave && nave.every(function (y) { return n.colpi.indexOf(y) >= 0; })) bnAvviso("Affondata la nave da " + nave.length + "! 💥");
  if (bnFinita(suo.navi, n.colpi)) { var v = g2v("bn.vinte." + me) || { n: 0 }; g2scrivi("bn.vinte." + me, { n: v.n + 1, ultima: pa.id }); }
  disegnaGiochi();
}
function bnAvviso(t) { var a = $("bn-avviso"); if (a) { a.textContent = t; a.hidden = false; clearTimeout(bnAvviso.t); bnAvviso.t = setTimeout(function () { a.hidden = true; }, 2500); } }
function bnMare(navi, colpi, mio, ultimo) {   // la griglia: le mie navi con i colpi dell'altro, oppure il suo mare con i miei colpi
  var g = el("div", "bn-mare" + (mio ? " mio" : "")), tutte = [].concat.apply([], navi || []);
  for (var x = 0; x < BN_N * BN_N; x++) (function (x) {
    var b = el("button"), colpo = colpi.indexOf(x) >= 0, nave = navi.filter(function (s) { return s.indexOf(x) >= 0; })[0];
    b.type = "button";
    if (colpo && nave) { var aff = nave.every(function (y) { return colpi.indexOf(y) >= 0; }); b.className = aff ? "affondato" : "colpito"; b.textContent = aff ? "✕" : "🔥"; }
    else if (colpo) { b.className = "acqua"; b.textContent = "•"; }
    else if (mio && tutte.indexOf(x) >= 0) b.className = "nave";
    if (x === ultimo) b.className += " ultimo";
    b.dataset.x = x; g.appendChild(b);
  })(x);
  return g;
}
function disegnaNavale(box) {
  var pa = bnPartita(), info = el("div", "f4-info");
  if (!pa) {
    box.appendChild(info); var t = el("span", "f4-turno"); t.textContent = "Battaglia navale"; info.appendChild(t);
    var p = el("p", "spiega"); p.textContent = "Ognuno sistema le sue navi sul proprio telefono, poi si spara a turno nel mare dell'altro. Vince chi le affonda tutte."; box.appendChild(p);
    var r = el("div", "g2-riga"), b = el("button", "btn pieno"); b.type = "button"; b.textContent = "Nuova partita"; b.onclick = function () { bnNuova(); }; r.appendChild(b); box.appendChild(r);
    return;
  }
  var me = io, mio = bnDi(me), suo = bnDi(1 - me), vinte = [g2v("bn.vinte.0"), g2v("bn.vinte.1")].map(function (v) { return v ? v.n : 0; });
  var pt = el("span", "f4-punti"); pt.textContent = g2nome(0) + " " + vinte[0] + " – " + vinte[1] + " " + g2nome(1);
  if (!mio || !mio.pronto) {   // sistemo le navi
    var navi = mio && mio.navi ? mio.navi : bnMischia();
    if (!mio) g2scrivi("bn." + pa.id + "." + me, { navi: navi, colpi: [], pronto: false, t: Date.now() });
    var t2 = el("span", "f4-turno"); t2.textContent = "Sistema le tue navi"; info.appendChild(t2); info.appendChild(pt); box.appendChild(info);
    box.appendChild(bnMare(navi, [], true)); box.lastChild.classList.remove("mio");
    var r2 = el("div", "g2-riga");
    var m = el("button", "btn"); m.type = "button"; m.textContent = "🔀 Rimescola"; m.onclick = function () { g2scrivi("bn." + pa.id + "." + me, { navi: bnMischia(), colpi: [], pronto: false, t: Date.now() }); disegnaGiochi(); };
    var ok = el("button", "btn pieno"); ok.type = "button"; ok.textContent = "Sono pronto"; ok.onclick = function () { g2scrivi("bn." + pa.id + "." + me, { navi: (bnDi(me) || {}).navi || navi, colpi: [], pronto: true, t: Date.now() }); disegnaGiochi(); };
    r2.appendChild(m); r2.appendChild(ok); box.appendChild(r2);
    var sp = el("p", "spiega"); sp.textContent = "Una nave da 4, due da 3, due da 2. Rimescola finché ti piace come sono messe."; box.appendChild(sp);
    return;
  }
  if (!suo || !suo.pronto) {
    var t3 = el("span", "f4-turno"); t3.textContent = "Aspetto che " + g2nome(1 - me) + " sistemi le navi…"; info.appendChild(t3); info.appendChild(pt); box.appendChild(info);
    var tt = el("div", "bn-tit"); tt.textContent = "La tua flotta"; box.appendChild(tt); box.appendChild(bnMare(mio.navi, [], true));
    return;
  }
  var a = me === 0 ? mio : suo, b2 = me === 0 ? suo : mio, turno = bnTurno(pa, a, b2);
  var vinto = bnFinita(suo.navi, mio.colpi), perso = bnFinita(mio.navi, suo.colpi);
  var t4 = el("span", "f4-turno");
  if (vinto) { t4.textContent = "Hai vinto! 🎉"; t4.className += " p" + me; }
  else if (perso) { t4.textContent = "Ha vinto " + g2nome(1 - me); t4.className += " p" + (1 - me); }
  else { t4.textContent = turno === me ? "Tocca a te: spara!" : "Tocca a " + g2nome(1 - me); t4.className += " p" + turno; }
  info.appendChild(t4); info.appendChild(pt);
  if (vinto || perso) { var rv = el("button", "f4-rivincita"); rv.type = "button"; rv.textContent = "Rivincita"; rv.onclick = function () { bnNuova(vinto ? 1 - me : me); }; info.appendChild(rv); }
  box.appendChild(info);
  var av = el("div", "spiega"); av.id = "bn-avviso"; av.hidden = true; av.style.cssText = "text-align:center;font-weight:700;color:var(--accent)"; box.appendChild(av);
  var t5 = el("div", "bn-tit"); t5.textContent = "Il mare di " + g2nome(1 - me); box.appendChild(t5);
  var mare = bnMare(suo.navi, mio.colpi, false, mio.colpi[mio.colpi.length - 1]);
  if (vinto || perso) [].forEach.call(mare.children, function (c) { if (!c.className && [].concat.apply([], suo.navi).indexOf(+c.dataset.x) >= 0) c.className = "nave"; });   // a fine partita si vede dov'erano
  if (turno === me && !vinto && !perso) { mare.classList.add("attivo"); mare.onclick = function (e) { var c = e.target.closest("button"); if (c) bnSpara(+c.dataset.x); }; }
  box.appendChild(mare);
  var t6 = el("div", "bn-tit"); t6.textContent = "La tua flotta"; box.appendChild(t6);
  box.appendChild(bnMare(mio.navi, suo.colpi, true, suo.colpi[suo.colpi.length - 1]));
  var colpiti = function (navi, colpi) { return colpi.filter(function (x) { return [].concat.apply([], navi).indexOf(x) >= 0; }).length; };
  var s = el("p", "spiega"); s.style.textAlign = "center"; s.textContent = "Colpi a segno: tu " + colpiti(suo.navi, mio.colpi) + "/14 · " + g2nome(1 - me) + " " + colpiti(mio.navi, suo.colpi) + "/14"; box.appendChild(s);
  // vibra quando diventa il mio turno
  var firma = pa.id + ":" + suo.colpi.length;
  if (turno === me && !vinto && !perso && leggi("bn_turno_visto", "") !== firma) { salva("bn_turno_visto", firma); if (suo.colpi.length && navigator.vibrate) navigator.vibrate([30, 60, 30]); }
}

// ================================================================ PAROLE (4×4, due minuti)
var PA = { parole: null, carico: null, gioco: null };
var PA_LETTERE = "aaaaaaaaaaaeeeeeeeeeeeiiiiiiiiiiooooooooouuuurrrrrrrnnnnnnnttttttllllllsssssscccccddddmmmppppvvvggbbffhzzq";
var PA_VALORI = { a: 1, e: 1, i: 1, o: 1, u: 3, r: 1, n: 1, t: 1, l: 1, s: 1, c: 2, d: 4, m: 2, p: 3, v: 4, g: 4, b: 5, f: 4, h: 8, z: 8, q: 10 };
function paCaricaParole() {
  if (PA.parole) return Promise.resolve(PA.parole);
  if (!PA.carico) PA.carico = fetch("parole.txt").then(function (r) { if (!r.ok) throw new Error(r.status); return r.text(); })
    .then(function (t) { PA.parole = t.split("\n").filter(Boolean); return PA.parole; }, function (e) { PA.carico = null; throw e; });
  return PA.carico;
}
function paCerca(p) { var l = PA.parole, a = 0, b = l.length; while (a < b) { var m = (a + b) >> 1; if (l[m] < p) a = m + 1; else b = m; } return a; }   // prima posizione >= p
function paEParola(p) { var i = paCerca(p); return PA.parole[i] === p; }
function paPrefisso(p) { var i = paCerca(p); return i < PA.parole.length && PA.parole[i].indexOf(p) === 0; }
function paVicini(i) { var r = Math.floor(i / 4), c = i % 4, v = []; for (var dr = -1; dr <= 1; dr++) for (var dc = -1; dc <= 1; dc++) if ((dr || dc) && r + dr >= 0 && r + dr < 4 && c + dc >= 0 && c + dc < 4) v.push((r + dr) * 4 + c + dc); return v; }
function paRisolvi(g) {   // tutte le parole della griglia
  var trovate = {};
  function giro(i, usate, s) {
    s += g[i] === "q" ? "qu" : g[i];
    if (!paPrefisso(s)) return;
    if (s.length >= 3 && paEParola(s)) trovate[s] = 1;
    if (s.length >= 10) return;
    usate[i] = 1; paVicini(i).forEach(function (j) { if (!usate[j]) giro(j, usate, s); }); usate[i] = 0;
  }
  for (var i = 0; i < 16; i++) giro(i, {}, "");
  return Object.keys(trovate);
}
function paGriglia(id) {   // dal nome della partita: la stessa griglia su tutti e due i telefoni
  for (var t = 0; t < 40; t++) {
    var rnd = g2rng(id + "#" + t), g = [];
    for (var i = 0; i < 16; i++) g.push(PA_LETTERE.charAt(Math.floor(rnd() * PA_LETTERE.length)));
    var voc = g.filter(function (x) { return "aeiou".indexOf(x) >= 0; }).length;
    if (voc < 5 || voc > 8 || g.filter(function (x) { return x === "q"; }).length > 1) continue;
    var tutte = paRisolvi(g);
    if (tutte.length >= 40 || t === 39) return { g: g, tutte: tutte };
  }
}
function paPunti(p) { var base = p.split("").reduce(function (s, x) { return s + (PA_VALORI[x] || 1); }, 0), L = p.length; return base + (L >= 8 ? 15 : L === 7 ? 10 : L === 6 ? 6 : L === 5 ? 3 : 0); }
function paPartita() {   // quella in corso; se non c'è (o è di ieri e finita da tutti e due) si usa quella di oggi
  var p = g2v("pa.p"), oggi = iso(new Date());
  if (!p) return { id: oggi };
  var fatta = g2v("pa." + p.id + ".0") && g2v("pa." + p.id + ".1");
  if (fatta && p.id.slice(0, 10) !== oggi) return { id: oggi };
  return p;
}
function disegnaParole(box) {
  if (PA.gioco) { paDisegnaGioco(box); return; }
  var pa = paPartita(), mio = g2v("pa." + pa.id + "." + io), suo = g2v("pa." + pa.id + "." + (1 - io)), info = el("div", "f4-info");
  var t = el("span", "f4-turno"); info.appendChild(t); box.appendChild(info);
  if (!mio) {
    t.textContent = "Parole · " + (pa.id === iso(new Date()) ? "la sfida di oggi" : "nuova sfida");
    var p = el("p", "spiega"); p.textContent = "Due minuti per trovare più parole possibili trascinando il dito sulle lettere vicine (anche in diagonale). Almeno 3 lettere. " + (suo ? g2nome(1 - io) + " ha già giocato: tocca a te battere il suo punteggio!" : "Poi tocca a " + g2nome(1 - io) + " con la stessa griglia.");
    box.appendChild(p);
    var r = el("div", "g2-riga"), b = el("button", "btn pieno"); b.type = "button"; b.textContent = "▶ Gioca (2 minuti)"; b.onclick = function () { paInizia(pa); }; r.appendChild(b); box.appendChild(r);
    return;
  }
  t.textContent = suo ? (mio.punti === suo.punti ? "Pareggio!" : mio.punti > suo.punti ? "Hai vinto! 🎉" : "Ha vinto " + g2nome(1 - io)) : "Aspetto che giochi " + g2nome(1 - io) + "…";
  var ris = el("div", "pa-ris");
  [[io, mio], [1 - io, suo]].forEach(function (x) {
    var d = el("div"); d.innerHTML = "<span></span><b></b><small></small>";
    d.querySelector("span").textContent = x[0] === io ? "Tu" : g2nome(x[0]);
    d.querySelector("b").textContent = x[1] ? x[1].punti : "–";
    d.querySelector("small").textContent = x[1] ? x[1].parole.length + (x[1].parole.length === 1 ? " parola" : " parole") : "deve ancora giocare";
    if (x[1] && suo && x[1].punti > (x[0] === io ? suo.punti : mio.punti)) d.className = "vince";
    ris.appendChild(d);
  });
  box.appendChild(ris);
  var tr = el("div", "pa-trovate"), mie = {}; mio.parole.forEach(function (w) { mie[w] = 1; });
  var tutte = mio.parole.concat(suo ? suo.parole.filter(function (w) { return !mie[w]; }) : []);
  tutte.sort(function (a, b) { return b.length - a.length; }).forEach(function (w) { var s = el("span", mie[w] ? "mia" : ""); s.textContent = w; tr.appendChild(s); });
  var tt = el("div", "bn-tit"); tt.textContent = suo ? "Le vostre parole (in rosso le tue)" : "Le tue parole"; box.appendChild(tt); box.appendChild(tr);
  if (suo) {
    var r2 = el("div", "g2-riga"), n = el("button", "btn pieno"); n.type = "button"; n.textContent = "Nuova sfida";
    n.onclick = function () { if (!g2pronto()) return; g2scrivi("pa.p", { id: iso(new Date()) + "-" + String(nuovoId()).slice(-6), t: Date.now() }); disegnaGiochi(); };
    r2.appendChild(n); box.appendChild(r2);
    if (PA.parole) {
      var g = paGriglia(pa.id), perse = g.tutte.filter(function (w) { return !tutte.some(function (x) { return x === w; }); }).sort(function (a, b) { return b.length - a.length; }).slice(0, 12);
      if (perse.length) { var pp = el("p", "spiega"); pp.style.textAlign = "center"; pp.textContent = "C'erano anche: " + perse.join(", ") + " (in tutto " + g.tutte.length + " parole)."; box.appendChild(pp); }
    } else paCaricaParole().then(function () { if (GIOCO === "parole") disegnaGiochi(); }, function () {});
  }
}
function paInizia(pa) {
  if (!g2pronto()) return;
  var b = $("giochi-box"); b.innerHTML = '<p class="spiega" style="text-align:center">Preparo la griglia…</p>';
  paCaricaParole().then(function () {
    var g = paGriglia(pa.id);
    PA.gioco = { id: pa.id, g: g.g, fine: Date.now() + 120000, trovate: [], punti: 0, via: [], timer: null };
    if (!g2v("pa.p") || g2v("pa.p").id !== pa.id) g2scrivi("pa.p", { id: pa.id, t: Date.now() });
    PA.gioco.timer = setInterval(paTick, 250);
    disegnaGiochi();
  }, function () { b.innerHTML = '<p class="spiega" style="text-align:center">Non riesco a scaricare il dizionario: sei connesso?</p>'; });
}
function paTick() {
  var s = PA.gioco; if (!s) return;
  var resta = Math.max(0, s.fine - Date.now()), t = $("pa-tempo");
  if (t) { var sec = Math.ceil(resta / 1000); t.textContent = Math.floor(sec / 60) + ":" + due(sec % 60); t.classList.toggle("poco", sec <= 15); }
  if (!resta) paFine();
}
function paFine() {
  var s = PA.gioco; if (!s) return; clearInterval(s.timer); PA.gioco = null;
  if (navigator.vibrate) navigator.vibrate([80, 60, 200]);
  var limite = iso(piuGiorni(new Date(), -14));   // le sfide di più di due settimane fa
  g2pulisci("pa.", function (k) { return k === "pa.p" || k.slice(3, 13) >= limite; });
  g2scrivi("pa." + s.id + "." + io, { punti: s.punti, parole: s.trovate, t: Date.now() });
  if (window.inviaChat) inviaChat("🔤 A Parole ho fatto " + s.punti + " punti con " + s.trovate.length + " parole. Tocca a te!");
  disegnaGiochi();
}
function paDisegnaGioco(box) {
  var s = PA.gioco;
  var testa = el("div", "pa-testa"), tempo = el("span", "pa-tempo"), pt = el("span", "f4-punti"); tempo.id = "pa-tempo"; pt.id = "pa-punti";
  pt.textContent = s.punti + " punti · " + s.trovate.length + (s.trovate.length === 1 ? " parola" : " parole"); testa.appendChild(tempo); testa.appendChild(pt); box.appendChild(testa);
  var parola = el("div", "pa-parola"); parola.id = "pa-parola"; box.appendChild(parola);
  var g = el("div", "pa-griglia");
  s.g.forEach(function (x, i) { var c = el("div"); c.dataset.i = i; c.innerHTML = (x === "q" ? "Qu" : x) + "<small>" + (PA_VALORI[x] || 1) + "</small>"; g.appendChild(c); });
  box.appendChild(g);
  var tr = el("div", "pa-trovate"); tr.id = "pa-lista"; s.trovate.slice().reverse().forEach(function (w) { var x = el("span", "mia"); x.textContent = w; tr.appendChild(x); }); box.appendChild(tr);
  var r = el("div", "g2-riga"), f = el("button", "btn"); f.type = "button"; f.textContent = "Ho finito"; f.onclick = function () { if (confirm("Finire adesso?")) { s.fine = Date.now(); paTick(); } }; r.appendChild(f); box.appendChild(r);
  paTick();
  // il dito sulle lettere
  var via = [], celle = g.children;
  function cella(e) { var el2 = document.elementFromPoint(e.clientX, e.clientY), c = el2 && el2.closest(".pa-griglia div"); if (!c) return -1; var rc = c.getBoundingClientRect(), dx = e.clientX - (rc.left + rc.width / 2), dy = e.clientY - (rc.top + rc.height / 2); return Math.sqrt(dx * dx + dy * dy) < rc.width * .42 ? +c.dataset.i : -1; }   // solo vicino al centro: le diagonali si fanno bene
  function testo() { return via.map(function (i) { return s.g[i] === "q" ? "qu" : s.g[i]; }).join(""); }
  function mostra() { [].forEach.call(celle, function (c, i) { c.classList.toggle("on", via.indexOf(i) >= 0); }); parola.textContent = testo(); g.className = "pa-griglia"; }
  g.addEventListener("pointerdown", function (e) { e.preventDefault(); if (!PA.gioco) return; try { g.setPointerCapture(e.pointerId); } catch (x) {} var i = cella(e); via = i >= 0 ? [i] : []; mostra(); if (navigator.vibrate) navigator.vibrate(8); });
  g.addEventListener("pointermove", function (e) {
    if (!via.length) return; var i = cella(e); if (i < 0) return;
    if (via.length > 1 && i === via[via.length - 2]) { via.pop(); mostra(); return; }   // torna indietro
    if (via.indexOf(i) < 0 && paVicini(via[via.length - 1]).indexOf(i) >= 0) { via.push(i); mostra(); if (navigator.vibrate) navigator.vibrate(6); }
  });
  function lascia() {
    if (!via.length || !PA.gioco) return; var w = testo(), esito = "no";
    if (w.length >= 3 && s.trovate.indexOf(w) >= 0) esito = "gia";
    else if (w.length >= 3 && paEParola(w)) {
      esito = "ok"; s.trovate.push(w); s.punti += paPunti(w);
      $("pa-punti").textContent = s.punti + " punti · " + s.trovate.length + (s.trovate.length === 1 ? " parola" : " parole");
      var x = el("span", "mia"); x.textContent = w; $("pa-lista").insertBefore(x, $("pa-lista").firstChild);
      if (navigator.vibrate) navigator.vibrate(30);
    }
    g.className = "pa-griglia " + esito; parola.textContent = w.length >= 3 ? (esito === "ok" ? w + " +" + paPunti(w) : esito === "gia" ? w + " · già trovata" : w + " ✗") : "";
    via = [];
    setTimeout(function () { if (!via.length) { [].forEach.call(celle, function (c) { c.classList.remove("on"); }); g.className = "pa-griglia"; } }, 450);
  }
  g.addEventListener("pointerup", lascia); g.addEventListener("pointercancel", lascia);
}
