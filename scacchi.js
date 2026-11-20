// Home2Love — Scacchi a distanza sul telefono, a turni come la dama.
// Stato nel registro cifrato, chiave "scacchi.p": { id, b (64 caratteri), t ("w"/"b"), arr ("KQkq"), ep, bianco (0/1),
// ultima: [da, a], fine: null|"matto"|"stallo"|"abbandono"|"patta", vincitore, punti: [p0, p1], mosse: n }.
// Scacchiera: indice r*8+c, r=0 è la riga 8 (in alto per il bianco). Pezzi "PNBRQK" bianchi, minuscoli neri, "." vuota.

var SC_INIZIO = "rnbqkbnrpppppppp................................PPPPPPPPRNBQKBNR";
var SC_GLIFI = { k: "♚", q: "♛", r: "♜", b: "♝", n: "♞", p: "♟" };
var SC = { sel: -1, promo: null };
(function () {
  var st = document.createElement("style");
  st.textContent = [
    ".sc-tav{display:grid;grid-template-columns:repeat(8,1fr);width:min(100%,360px);margin:8px auto;border-radius:12px;overflow:hidden;box-shadow:var(--ombra);touch-action:manipulation}",
    ".sc-tav button{aspect-ratio:1;border:0;padding:0;font-size:min(8.6vw,36px);line-height:1;position:relative;display:grid;place-items:center;font-family:'Segoe UI Symbol','Noto Sans Symbols 2','DejaVu Sans',serif}",
    ".sc-tav .ch{background:#f0dfc2}.sc-tav .sc{background:#b88762}",
    ".sc-tav .w{color:#fff;text-shadow:0 0 1px #000,0 0 1px #000,0 1px 2px rgba(0,0,0,.6)}.sc-tav .bk{color:#1c1410;text-shadow:0 1px 1px rgba(255,255,255,.25)}",
    ".sc-tav .ult{box-shadow:inset 0 0 0 100px rgba(255,214,77,.35)}.sc-tav .sel{box-shadow:inset 0 0 0 100px rgba(80,170,90,.55)}",
    ".sc-tav .scacco{box-shadow:inset 0 0 0 100px rgba(230,60,50,.6)}",
    ".sc-tav .meta::after{content:'';width:30%;height:30%;border-radius:50%;background:rgba(40,90,40,.45);position:absolute}",
    ".sc-tav .meta.pieno::after{width:86%;height:86%;background:none;border:4px solid rgba(40,90,40,.45);box-sizing:border-box}",
    ".sc-tav i{position:absolute;font-style:normal;font-size:9px;font-weight:700;opacity:.55;color:#5a3b22}.sc-tav i.l{left:3px;bottom:1px}.sc-tav i.n{right:3px;top:1px}",
    ".sc-presi{text-align:center;font-size:20px;min-height:24px;letter-spacing:1px;color:var(--muted)}",
    ".sc-promo{display:flex;gap:8px;justify-content:center;margin:6px 0}.sc-promo button{width:56px;height:56px;border-radius:14px;border:1px solid var(--line);background:var(--card);font-size:34px}"
  ].join("\n");
  document.head.appendChild(st);
})();

// ---------------------------------------------------------------- regole
function scBianco(x) { return x !== "." && x === x.toUpperCase(); }
function scDi(x) { return x === "." ? null : scBianco(x) ? "w" : "b"; }
function scAttaccata(b, i, da) {   // la casa i è attaccata dai pezzi del colore "da"?
  var r = i >> 3, c = i & 7, k, rr, cc, x;
  var su = da === "w" ? 1 : -1;   // i pedoni bianchi attaccano verso l'alto: stanno sotto (r+1)
  for (k = -1; k <= 1; k += 2) { rr = r + su; cc = c + k; if (rr >= 0 && rr < 8 && cc >= 0 && cc < 8) { x = b[rr * 8 + cc]; if (x === (da === "w" ? "P" : "p")) return true; } }
  var cav = [[1, 2], [2, 1], [-1, 2], [-2, 1], [1, -2], [2, -1], [-1, -2], [-2, -1]];
  for (k = 0; k < 8; k++) { rr = r + cav[k][0]; cc = c + cav[k][1]; if (rr >= 0 && rr < 8 && cc >= 0 && cc < 8) { x = b[rr * 8 + cc]; if (x === (da === "w" ? "N" : "n")) return true; } }
  for (rr = -1; rr <= 1; rr++) for (cc = -1; cc <= 1; cc++) if (rr || cc) { var r2 = r + rr, c2 = c + cc; if (r2 >= 0 && r2 < 8 && c2 >= 0 && c2 < 8 && b[r2 * 8 + c2] === (da === "w" ? "K" : "k")) return true; }
  var dirs = [[1, 0, "rq"], [-1, 0, "rq"], [0, 1, "rq"], [0, -1, "rq"], [1, 1, "bq"], [1, -1, "bq"], [-1, 1, "bq"], [-1, -1, "bq"]];
  for (k = 0; k < 8; k++) {
    rr = r + dirs[k][0]; cc = c + dirs[k][1];
    while (rr >= 0 && rr < 8 && cc >= 0 && cc < 8) {
      x = b[rr * 8 + cc];
      if (x !== ".") { if (scDi(x) === da && dirs[k][2].indexOf(x.toLowerCase()) >= 0) return true; break; }
      rr += dirs[k][0]; cc += dirs[k][1];
    }
  }
  return false;
}
function scRe(b, col) { return b.indexOf(col === "w" ? "K" : "k"); }
function scInScacco(s, col) { return scAttaccata(s.b, scRe(s.b, col), col === "w" ? "b" : "w"); }
function scPseudo(s) {   // mosse senza controllare lo scacco: [{da, a, promo, arrocco, ep}]
  var b = s.b, t = s.t, m = [], i, r, c, x, k;
  function metti(da, a, extra) { var o = { da: da, a: a }; for (var q in extra || {}) o[q] = extra[q]; m.push(o); }
  for (i = 0; i < 64; i++) {
    x = b[i]; if (scDi(x) !== t) continue; r = i >> 3; c = i & 7; var p = x.toLowerCase();
    if (p === "p") {
      var dir = t === "w" ? -1 : 1, iniz = t === "w" ? 6 : 1, ultima = t === "w" ? 0 : 7, a1 = (r + dir) * 8 + c;
      if (r + dir >= 0 && r + dir < 8 && b[a1] === ".") {
        if (r + dir === ultima) "qrbn".split("").forEach(function (q) { metti(i, a1, { promo: q }); }); else metti(i, a1);
        var a2 = (r + 2 * dir) * 8 + c; if (r === iniz && b[a2] === ".") metti(i, a2, { doppio: true });
      }
      for (k = -1; k <= 1; k += 2) {
        var cc = c + k, rr = r + dir; if (cc < 0 || cc > 7 || rr < 0 || rr > 7) continue; var a3 = rr * 8 + cc;
        if (b[a3] !== "." && scDi(b[a3]) !== t) { if (rr === ultima) "qrbn".split("").forEach(function (q) { metti(i, a3, { promo: q }); }); else metti(i, a3); }
        else if (a3 === s.ep) metti(i, a3, { ep: true });
      }
    } else if (p === "n" || p === "k") {
      var salti = p === "n" ? [[1, 2], [2, 1], [-1, 2], [-2, 1], [1, -2], [2, -1], [-1, -2], [-2, -1]] : [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];
      salti.forEach(function (d) { var r2 = r + d[0], c2 = c + d[1]; if (r2 >= 0 && r2 < 8 && c2 >= 0 && c2 < 8 && scDi(b[r2 * 8 + c2]) !== t) metti(i, r2 * 8 + c2); });
      if (p === "k") {   // arrocco: re e torre mai mossi, case libere e non attaccate
        var avv = t === "w" ? "b" : "w", base = t === "w" ? 56 : 0, K = t === "w" ? "K" : "k", Q = t === "w" ? "Q" : "q";
        if (i === base + 4 && !scAttaccata(b, i, avv)) {
          if (s.arr.indexOf(K) >= 0 && b[base + 5] === "." && b[base + 6] === "." && !scAttaccata(b, base + 5, avv) && !scAttaccata(b, base + 6, avv)) metti(i, base + 6, { arrocco: "corto" });
          if (s.arr.indexOf(Q) >= 0 && b[base + 3] === "." && b[base + 2] === "." && b[base + 1] === "." && !scAttaccata(b, base + 3, avv) && !scAttaccata(b, base + 2, avv)) metti(i, base + 2, { arrocco: "lungo" });
        }
      }
    } else {
      var dd = p === "r" ? [[1, 0], [-1, 0], [0, 1], [0, -1]] : p === "b" ? [[1, 1], [1, -1], [-1, 1], [-1, -1]] : [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];
      dd.forEach(function (d) {
        var r2 = r + d[0], c2 = c + d[1];
        while (r2 >= 0 && r2 < 8 && c2 >= 0 && c2 < 8) { var y = b[r2 * 8 + c2]; if (y === ".") metti(i, r2 * 8 + c2); else { if (scDi(y) !== t) metti(i, r2 * 8 + c2); break; } r2 += d[0]; c2 += d[1]; }
      });
    }
  }
  return m;
}
function scApplica(s, m) {   // nuovo stato dopo la mossa m
  var b = s.b.split(""), x = b[m.da], t = s.t, n = JSON.parse(JSON.stringify(s));
  b[m.a] = m.promo ? (t === "w" ? m.promo.toUpperCase() : m.promo) : x; b[m.da] = ".";
  if (m.ep) b[m.a + (t === "w" ? 8 : -8)] = ".";
  if (m.arrocco) { var base = t === "w" ? 56 : 0; if (m.arrocco === "corto") { b[base + 5] = b[base + 7]; b[base + 7] = "."; } else { b[base + 3] = b[base]; b[base] = "."; } }
  var arr = s.arr;
  if (x === "K") arr = arr.replace(/[KQ]/g, ""); if (x === "k") arr = arr.replace(/[kq]/g, "");
  [[63, "K"], [56, "Q"], [7, "k"], [0, "q"]].forEach(function (z) { if (m.da === z[0] || m.a === z[0]) arr = arr.replace(z[1], ""); });
  n.b = b.join(""); n.arr = arr; n.ep = m.doppio ? (m.da + m.a) / 2 : -1; n.t = t === "w" ? "b" : "w"; n.ultima = [m.da, m.a]; n.mosse = (s.mosse || 0) + 1;
  return n;
}
function scLegali(s) { return scPseudo(s).filter(function (m) { var n = scApplica(s, m); return !scInScacco(n, s.t); }); }

// ---------------------------------------------------------------- partita
function scStato() { var e = reg && reg["scacchi.p"]; return e && !e.d && e.v && e.v.b ? e.v : null; }
function scNuova(bianco, punti) { return { id: String(nuovoId()), b: SC_INIZIO, t: "w", arr: "KQkq", ep: -1, bianco: bianco, ultima: null, fine: null, vincitore: null, punti: punti || [0, 0], mosse: 0 }; }
function scSalva(s) { var ora = Date.now(); reg["scacchi.p"] = { v: s, t: ora }; salva("cucina_registro", reg); sincronizza(); }
function scColore(s, p) { return s.bianco === p ? "w" : "b"; }
function scMuovi(m) {
  var s = scStato(); if (!s || s.fine || scColore(s, io) !== s.t) return;
  var n = scApplica(s, m), dopo = scLegali(n);
  if (!dopo.length) {
    if (scInScacco(n, n.t)) { n.fine = "matto"; n.vincitore = io; n.punti[io]++; }
    else { n.fine = "stallo"; n.vincitore = "pari"; }
  } else if (n.b.replace(/[.kK]/g, "") === "") { n.fine = "patta"; n.vincitore = "pari"; }   // restano solo i re
  SC.sel = -1; SC.promo = null; scSalva(n);
  if (navigator.vibrate) navigator.vibrate(s.b[m.a] !== "." || m.ep ? [30, 40, 60] : 25);
  disegnaGiochi();
}
function scPresi(b, col) {   // pezzi mangiati di quel colore
  var tutti = { p: 8, n: 2, b: 2, r: 2, q: 1 }, s = "";
  "qrbnp".split("").forEach(function (p) {
    var ci = b.split("").filter(function (x) { return x === (col === "w" ? p.toUpperCase() : p); }).length, manca = Math.max(0, tutti[p] - ci);
    for (var k = 0; k < manca; k++) s += SC_GLIFI[p];
  });
  return s;
}
function disegnaScacchi(box) {
  var s = scStato(), info = el("div", "f4-info"), nomi = cfg.nomi;
  if (!s) {
    var t0 = el("span", "f4-turno"); t0.textContent = "Scacchi"; info.appendChild(t0); box.appendChild(info);
    var p0 = el("p", "spiega"); p0.textContent = "Partita a distanza: ognuno muove dal suo telefono quando tocca a lui. Il bianco si tira a sorte."; box.appendChild(p0);
    var r0 = el("div", "g2-riga"), b0 = el("button", "btn pieno"); b0.type = "button"; b0.textContent = "Nuova partita";
    b0.onclick = function () { if (!token || !chiaveCripto) { alert("Sblocca prima con la password."); return; } scSalva(scNuova(Math.round(Math.random()))); disegnaGiochi(); };
    r0.appendChild(b0); box.appendChild(r0); return;
  }
  var mio = scColore(s, io), tocca = s.t === mio && !s.fine, chi = s.t === "w" ? s.bianco : 1 - s.bianco, legali = s.fine ? [] : scLegali(s);
  var t = el("span", "f4-turno");
  if (s.fine === "matto") { t.textContent = s.vincitore === io ? "Scacco matto! Hai vinto 🎉" : "Scacco matto: ha vinto " + nomi[s.vincitore]; t.className += " p" + s.vincitore; }
  else if (s.fine === "abbandono") { t.textContent = s.vincitore === io ? nomi[1 - io] + " si è arreso: hai vinto 🎉" : "Ti sei arreso: ha vinto " + nomi[s.vincitore]; t.className += " p" + s.vincitore; }
  else if (s.fine) t.textContent = s.fine === "stallo" ? "Stallo: pareggio" : "Patta";
  else { var sc = scInScacco(s, s.t); t.textContent = (tocca ? "Tocca a te" : "Tocca a " + nomi[chi]) + (sc ? " · scacco!" : ""); t.className += " p" + chi; }
  var pt = el("span", "f4-punti"); pt.textContent = nomi[0] + " " + s.punti[0] + " – " + s.punti[1] + " " + nomi[1];
  info.appendChild(t); info.appendChild(pt);
  if (s.fine) { var rv = el("button", "f4-rivincita"); rv.type = "button"; rv.textContent = "Rivincita"; rv.onclick = function () { scSalva(scNuova(1 - s.bianco, s.punti)); disegnaGiochi(); }; info.appendChild(rv); }
  box.appendChild(info);
  var presiSu = el("div", "sc-presi"); presiSu.textContent = scPresi(s.b, mio); box.appendChild(presiSu);   // i miei pezzi che ha mangiato l'altro
  var tav = el("div", "sc-tav"), mete = SC.sel >= 0 ? legali.filter(function (m) { return m.da === SC.sel; }) : [], reScacco = !s.fine && scInScacco(s, s.t) ? scRe(s.b, s.t) : -1;
  for (var k = 0; k < 64; k++) (function (k) {
    var i = mio === "w" ? k : 63 - k, x = s.b[i], r = i >> 3, c = i & 7, b = el("button", ((r + c) % 2 ? "sc" : "ch"));
    b.type = "button";
    if (x !== ".") { b.textContent = SC_GLIFI[x.toLowerCase()]; b.classList.add(scBianco(x) ? "w" : "bk"); }
    if (s.ultima && s.ultima.indexOf(i) >= 0) b.classList.add("ult");
    if (i === SC.sel) b.classList.add("sel");
    if (i === reScacco) b.classList.add("scacco");
    var meta = mete.filter(function (m) { return m.a === i; });
    if (meta.length) { b.classList.add("meta"); if (x !== "." || meta[0].ep) b.classList.add("pieno"); }
    if (k % 8 === 0) { var n = el("i", "n"); n.textContent = 8 - r; b.appendChild(n); }
    if (k >= 56) { var l = el("i", "l"); l.textContent = "abcdefgh"[c]; b.appendChild(l); }
    b.onclick = function () {
      if (!tocca) return;
      if (meta.length) { if (meta[0].promo) { SC.promo = meta; disegnaGiochi(); } else scMuovi(meta[0]); return; }
      SC.sel = scDi(x) === mio && legali.some(function (m) { return m.da === i; }) ? (SC.sel === i ? -1 : i) : -1; SC.promo = null; disegnaGiochi();
    };
    tav.appendChild(b);
  })(k);
  box.appendChild(tav);
  if (SC.promo) {   // promozione: scegli il pezzo
    var pr = el("div", "sc-promo");
    SC.promo.forEach(function (m) { var b = el("button"); b.type = "button"; b.textContent = SC_GLIFI[m.promo]; b.onclick = function () { scMuovi(m); }; pr.appendChild(b); });
    var tp = el("div", "bn-tit"); tp.textContent = "Il pedone diventa…"; box.appendChild(tp); box.appendChild(pr);
  }
  var presiGiu = el("div", "sc-presi"); presiGiu.textContent = scPresi(s.b, mio === "w" ? "b" : "w"); box.appendChild(presiGiu);
  var sp = el("p", "spiega"); sp.style.textAlign = "center";
  sp.textContent = "Tu hai il " + (mio === "w" ? "bianco" : "nero") + ". Tocca un tuo pezzo, poi la casa dove vuoi muoverlo." + (s.mosse ? " Mossa " + Math.ceil(s.mosse / 2) + "." : "");
  box.appendChild(sp);
  if (!s.fine) box.appendChild(bottoneArrenditi(function () {
    var n2 = JSON.parse(JSON.stringify(scStato())); if (n2.fine) return;
    n2.fine = "abbandono"; n2.vincitore = 1 - io; n2.punti[1 - io]++; scSalva(n2); disegnaGiochi();
  }));
  var firma = s.id + ":" + s.mosse;   // un tocco quando l'altro ha mosso
  if (tocca && s.mosse && leggi("scacchi_visto", "") !== firma) { salva("scacchi_visto", firma); if (navigator.vibrate) navigator.vibrate([30, 60, 30]); }
}
