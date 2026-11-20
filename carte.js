// Home2Love — "Ultima!": gioco di carte a distanza, a turni (si scartano le carte abbinando colore o numero).
// Gioco nostro, con nomi e grafica nostri. Mazzo da 108: per ognuno dei 4 colori lo 0, due volte 1–9, due Salta e due +2;
// più 4 Jolly (cambia colore) e 4 Jolly +4. In due, "Salta" e "+2/+4" fanno ripartire chi le gioca.
// Stato nel registro cifrato, chiave "ca.p" (la scrive solo chi è di turno, come gli scacchi):
//   { id, mazzo: [...], pila: [...], mani: [[...], [...]], turno, colore, pescato, detta: [b, b], vincitore, punti, primo, ultimo: testo }
// Carta = stringa: colore (r v b g) + valore ("0".."9", "s" salta, "p" +2), oppure "J" jolly, "Q" jolly +4.
// Le carte dell'altro non si vedono: sono nello stato cifrato, ma il telefono mostra solo le tue.

var CA_COL = { r: "#e5484d", v: "#2f9e5f", b: "#3e6fe0", g: "#f2b01e" }, CA_NOMI_COL = { r: "rosso", v: "verde", b: "blu", g: "giallo" };
var CA = { scegliColore: null, ultimaDetta: false };
function caEl(tag, cls, testo) { var e = el(tag, cls); if (testo != null) e.textContent = testo; return e; }
(function () {
  var st = document.createElement("style");
  st.textContent = [
    ".ca-tav{position:relative;max-width:420px;margin:0 auto;padding:4px 0 6px;touch-action:manipulation}",
    ".ca-sua{display:flex;justify-content:center;align-items:center;min-height:62px}",
    ".ca-sua .dorso{width:34px;height:52px;margin:0 -9px;border-radius:7px;background:repeating-linear-gradient(45deg,#d7263d 0 6px,#b81f33 6px 12px);border:2px solid #fff;box-shadow:0 2px 5px rgba(0,0,0,.25)}",
    ".ca-sua b{margin-left:20px;font-size:14px;color:var(--muted);font-weight:600}",
    ".ca-centro{display:flex;justify-content:center;align-items:center;gap:22px;margin:12px 0}",
    ".ca-carta{position:relative;width:64px;height:96px;border-radius:12px;border:3px solid #fff;box-shadow:0 4px 10px rgba(0,0,0,.28);color:#fff;font-weight:800;flex:none;display:grid;place-items:center;overflow:hidden;padding:0}",
    ".ca-carta .v,.ca-carta .a,.ca-carta .z{position:relative;z-index:1}.ca-carta .a,.ca-carta .z{position:absolute}.ca-carta .v{font-size:34px;line-height:1;text-shadow:0 2px 0 rgba(0,0,0,.18)}",
    ".ca-carta .a{position:absolute;left:5px;top:3px;font-size:12px}.ca-carta .z{position:absolute;right:5px;bottom:3px;font-size:12px;transform:rotate(180deg)}",
    ".ca-carta::before{content:'';position:absolute;inset:14px 8px;border-radius:40px 8px;background:rgba(255,255,255,.16)}",
    ".ca-carta.jolly{background:conic-gradient(#e5484d 0 25%,#3e6fe0 0 50%,#2f9e5f 0 75%,#f2b01e 0)}",
    ".ca-carta.jolly .v{background:#222;border-radius:50%;width:44px;height:44px;display:grid;place-items:center;font-size:22px;z-index:1}",
    ".ca-carta.grande{width:84px;height:126px}.ca-carta.grande .v{font-size:46px}",
    ".ca-mazzo{width:84px;height:126px;border-radius:12px;border:3px solid #fff;background:repeating-linear-gradient(45deg,#d7263d 0 8px,#b81f33 8px 16px);box-shadow:0 4px 10px rgba(0,0,0,.28);color:#fff;font-weight:700;font-size:13px;display:grid;place-items:center;text-align:center;padding:0}",
    ".ca-mazzo:disabled{opacity:.45}",
    ".ca-colore{width:22px;height:22px;border-radius:50%;display:inline-block;vertical-align:-5px;margin-right:6px;border:2px solid #fff;box-shadow:0 1px 3px rgba(0,0,0,.3)}",
    ".ca-mano{display:flex;overflow-x:auto;padding:10px 6px 14px;scrollbar-width:none;justify-content:safe center}",
    ".ca-mano::-webkit-scrollbar{display:none}",
    ".ca-mano .ca-carta{margin:0 -8px;transition:transform .15s}.ca-mano .ca-carta.ok{transform:translateY(-10px)}.ca-mano .ca-carta.no{filter:saturate(.35) brightness(.85)}",
    ".ca-scelta{display:flex;justify-content:center;gap:10px;margin:8px 0}.ca-scelta button{width:54px;height:54px;border-radius:50%;border:3px solid #fff;box-shadow:var(--ombra)}",
    ".ca-msg{text-align:center;font-size:13.5px;color:var(--muted);min-height:18px;margin:2px 0}",
    ".ca-ultima{background:#f2b01e !important;color:#2a1d18 !important;font-weight:800 !important}.ca-ultima.detta{background:#2f9e5f !important;color:#fff !important}"
  ].join("\n");
  document.head.appendChild(st);
})();

function caMazzo() {
  var m = [];
  "rvbg".split("").forEach(function (c) {
    m.push(c + "0");
    for (var k = 0; k < 2; k++) { for (var n = 1; n <= 9; n++) m.push(c + n); m.push(c + "s"); m.push(c + "p"); }
  });
  for (var j = 0; j < 4; j++) { m.push("J"); m.push("Q"); }
  for (var i = m.length - 1; i > 0; i--) { var r = Math.floor(Math.random() * (i + 1)), t = m[i]; m[i] = m[r]; m[r] = t; }
  return m;
}
function caStato() { var e = reg && reg["ca.p"]; return e && !e.d && e.v && e.v.mani ? e.v : null; }
function caSalva(s) { var ora = Date.now(); reg["ca.p"] = { v: s, t: ora }; salva("cucina_registro", reg); sincronizza(); }
function caNuova(primo, punti) {
  var m = caMazzo(), mani = [m.splice(0, 7), m.splice(0, 7)], i = 0;
  while (!/^[rvbg][0-9]$/.test(m[i])) i++;   // la prima carta scoperta è un numero
  var su = m.splice(i, 1)[0];
  return { id: String(nuovoId()), mazzo: m, pila: [su], mani: mani, turno: primo, primo: primo, colore: su.charAt(0), pescato: false, detta: [false, false], vincitore: null, punti: punti || [0, 0], ultimo: "" };
}
function caJolly(c) { return c === "J" || c === "Q"; }
function caVal(c) { return caJolly(c) ? c : c.charAt(1); }
function caSi(s, c) { var su = s.pila[s.pila.length - 1]; return caJolly(c) || c.charAt(0) === s.colore || (!caJolly(su) && caVal(c) === caVal(su)); }
function caPesca(s, chi, n) {   // pesca n carte; se il mazzo finisce, si rimescolano gli scarti
  for (var k = 0; k < n; k++) {
    if (!s.mazzo.length) {
      var su = s.pila.pop(), resto = s.pila; s.pila = [su];
      for (var i = resto.length - 1; i > 0; i--) { var r = Math.floor(Math.random() * (i + 1)), t = resto[i]; resto[i] = resto[r]; resto[r] = t; }
      s.mazzo = resto;
      if (!s.mazzo.length) return;
    }
    s.mani[chi].push(s.mazzo.pop());
  }
}
function caNomeCarta(c) {
  if (c === "J") return "Jolly"; if (c === "Q") return "Jolly +4";
  var v = c.charAt(1); return (v === "s" ? "Salta" : v === "p" ? "+2" : v) + " " + CA_NOMI_COL[c.charAt(0)];
}
function caGioca(idx, colore) {
  var s0 = caStato(); if (!s0 || s0.vincitore !== null || s0.turno !== io) return;
  var s = JSON.parse(JSON.stringify(s0)), c = s.mani[io][idx], altro = 1 - io;
  if (!caSi(s, c)) return;
  if (caJolly(c) && !colore) { CA.scegliColore = idx; disegnaGiochi(); return; }
  s.mani[io].splice(idx, 1); s.pila.push(c); s.colore = caJolly(c) ? colore : c.charAt(0); s.pescato = false;
  var v = caVal(c), testo = g2nome(io) + " gioca " + caNomeCarta(c) + (caJolly(c) ? " (" + CA_NOMI_COL[colore] + ")" : "");
  if (s.mani[io].length === 1 && !CA.ultimaDetta) { caPesca(s, io, 2); testo += " · non ha detto \"Ultima!\": pesca 2"; }
  else if (s.mani[io].length === 1) testo += " · Ultima!";
  CA.ultimaDetta = false; CA.scegliColore = null;
  if (!s.mani[io].length) { s.vincitore = io; s.punti[io]++; s.ultimo = testo + " · ha finito le carte!"; caSalva(s); if (navigator.vibrate) navigator.vibrate([40, 60, 40, 60, 120]); disegnaGiochi(); return; }
  if (v === "p") { caPesca(s, altro, 2); testo += ": " + g2nome(altro) + " pesca 2 e salta il turno"; }
  else if (v === "Q") { caPesca(s, altro, 4); testo += ": " + g2nome(altro) + " pesca 4 e salta il turno"; }
  else if (v === "s") testo += ": " + g2nome(altro) + " salta il turno";
  else s.turno = altro;   // Salta, +2 e +4: in due si rigioca subito
  s.ultimo = testo; caSalva(s);
  if (navigator.vibrate) navigator.vibrate(25);
  disegnaGiochi();
}
function caPescaUna() {
  var s0 = caStato(); if (!s0 || s0.vincitore !== null || s0.turno !== io || s0.pescato) return;
  var s = JSON.parse(JSON.stringify(s0)); caPesca(s, io, 1); s.pescato = true; s.ultimo = g2nome(io) + " pesca una carta";
  caSalva(s); disegnaGiochi();
}
function caPassa() {
  var s0 = caStato(); if (!s0 || s0.turno !== io || !s0.pescato) return;
  var s = JSON.parse(JSON.stringify(s0)); s.pescato = false; s.turno = 1 - io; s.ultimo = g2nome(io) + " passa";
  caSalva(s); disegnaGiochi();
}
function caDisegnaCarta(c, grande) {
  var b = el("button", "ca-carta" + (caJolly(c) ? " jolly" : "") + (grande ? " grande" : "")); b.type = "button";
  if (!caJolly(c)) b.style.background = CA_COL[c.charAt(0)];
  var v = caVal(c), t = v === "s" ? "⊘" : v === "p" ? "+2" : v === "J" ? "★" : v === "Q" ? "+4" : v;
  b.appendChild(caEl("span", "v", t));
  if (!caJolly(c)) { b.appendChild(caEl("span", "a", t)); b.appendChild(caEl("span", "z", t)); }
  return b;
}
function disegnaCarte(box) {
  var s = caStato(), info = el("div", "f4-info"), nomi = cfg.nomi;
  if (!s) {
    box.appendChild(caEl("p", "spiega", "Ultima! — scartate tutte le carte abbinando colore o numero. Salta, +2 e i Jolly cambiano la partita. Quando ti resta una carta, ricordati di dire \"Ultima!\"."));
    var r0 = el("div", "g2-riga"), b0 = el("button", "btn pieno"); b0.type = "button"; b0.textContent = "Nuova partita";
    b0.onclick = function () { if (!g2pronto()) return; caSalva(caNuova(Math.round(Math.random()))); disegnaGiochi(); };
    r0.appendChild(b0); box.appendChild(r0); return;
  }
  var mia = s.turno === io && s.vincitore === null, mano = s.mani[io] || [], suo = s.mani[1 - io] || [];
  var t = el("span", "f4-turno");
  if (s.vincitore !== null) { t.textContent = s.vincitore === io ? "Hai vinto! 🎉" : "Ha vinto " + g2nome(s.vincitore); t.className += " p" + s.vincitore; }
  else { t.textContent = mia ? "Tocca a te" : "Tocca a " + g2nome(s.turno); t.className += " p" + s.turno; }
  var p = el("span", "f4-punti"); p.textContent = g2nome(0) + " " + s.punti[0] + " – " + s.punti[1] + " " + g2nome(1);
  info.appendChild(t); info.appendChild(p);
  if (s.vincitore !== null) {
    var rv = el("button", "f4-rivincita"); rv.type = "button"; rv.textContent = "Rivincita";
    rv.onclick = function () { caSalva(caNuova(1 - s.vincitore, s.punti)); disegnaGiochi(); }; info.appendChild(rv);
  }
  box.appendChild(info);
  var tav = el("div", "ca-tav");
  // le carte dell'altro, coperte
  var sua = el("div", "ca-sua");
  for (var k = 0; k < Math.min(suo.length, 12); k++) sua.appendChild(el("div", "dorso"));
  sua.appendChild(caEl("b", null, g2nome(1 - io) + ": " + suo.length + (suo.length === 1 ? " carta" : " carte")));
  tav.appendChild(sua);
  // centro: mazzo e carta scoperta
  var centro = el("div", "ca-centro"), mz = el("button", "ca-mazzo"); mz.type = "button";
  mz.innerHTML = mia && !s.pescato ? "Pesca<br>una carta" : s.mazzo.length + "<br>carte";
  mz.disabled = !mia || s.pescato; mz.onclick = caPescaUna;
  centro.appendChild(mz);
  var su = caDisegnaCarta(s.pila[s.pila.length - 1], true); su.disabled = true; centro.appendChild(su);
  tav.appendChild(centro);
  var col = el("div", "ca-msg"); var pal = el("span", "ca-colore"); pal.style.background = CA_COL[s.colore]; col.appendChild(pal);
  col.appendChild(document.createTextNode("Colore: " + CA_NOMI_COL[s.colore])); tav.appendChild(col);
  tav.appendChild(caEl("div", "ca-msg", s.ultimo || ""));
  // scelta del colore dopo un Jolly
  if (CA.scegliColore !== null && mia) {
    tav.appendChild(caEl("div", "bn-tit", "Scegli il colore"));
    var sc = el("div", "ca-scelta");
    "rvbg".split("").forEach(function (c) { var b = el("button"); b.type = "button"; b.style.background = CA_COL[c]; b.setAttribute("aria-label", CA_NOMI_COL[c]); b.onclick = function () { caGioca(CA.scegliColore, c); }; sc.appendChild(b); });
    tav.appendChild(sc);
  }
  // la mia mano
  var mn = el("div", "ca-mano");
  mano.forEach(function (c, i) {
    var b = caDisegnaCarta(c), si = mia && caSi(s, c) && (!s.pescato || i === mano.length - 1);   // dopo aver pescato si può giocare solo la carta pescata
    if (mia) b.className += si ? " ok" : " no";
    b.onclick = function () { if (si) caGioca(i); };
    mn.appendChild(b);
  });
  tav.appendChild(mn);
  box.appendChild(tav);
  // pulsanti
  var r1 = el("div", "g2-riga");
  if (mia && mano.length === 2) {
    var u = el("button", "btn ca-ultima" + (CA.ultimaDetta ? " detta" : "")); u.type = "button"; u.textContent = CA.ultimaDetta ? "Ultima! ✓" : "Di' \"Ultima!\"";
    u.onclick = function () { CA.ultimaDetta = !CA.ultimaDetta; if (navigator.vibrate) navigator.vibrate(15); disegnaGiochi(); }; r1.appendChild(u);
  }
  if (mia && s.pescato) { var pa = el("button", "btn"); pa.type = "button"; pa.textContent = "Passa"; pa.onclick = caPassa; r1.appendChild(pa); }
  if (r1.children.length) box.appendChild(r1);
  var sp = el("p", "spiega"); sp.style.textAlign = "center";
  sp.textContent = s.vincitore !== null ? "" : mia ? (s.pescato ? "Puoi giocare la carta pescata, oppure passare." : "Gioca una carta dello stesso colore o numero, oppure pesca.") : "Aspetta la mossa di " + g2nome(s.turno) + ".";
  box.appendChild(sp);
  var firma = s.id + ":" + s.pila.length + ":" + s.turno;   // un tocco quando tocca a te
  if (mia && leggi("carte_visto", "") !== firma) { salva("carte_visto", firma); if (navigator.vibrate) navigator.vibrate([30, 60, 30]); }
}
