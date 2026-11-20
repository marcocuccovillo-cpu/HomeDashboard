// Home2Love — ritorno sicuro: mentre torni a casa ("Sto tornando" con la spunta 📍), il telefono condivide dove sei,
// solo per quel tragitto. L'altro ti vede avvicinarti (in Oggi, sulla mappetta e nella casetta di «Dove siete?»).
// Si spegne da solo quando arrivi a casa (a meno di 150 m), quando passa l'ora prevista + 20 minuti, o con "Ferma".
// Registro cifrato: "pos.<persona>" = { lat, lon, acc, t, d0 (metri da casa alla partenza), d (metri da casa adesso), fino }.
// Nota: con lo schermo spento il browser si ferma; quando lo riaccendi la posizione riparte subito.

var VS = { watch: null, ultimo: null, wl: null };
function vsDist(a, b) { var dx = (a.lon - b.lon) * 111320 * Math.cos(a.lat * Math.PI / 180), dy = (a.lat - b.lat) * 110540; return Math.sqrt(dx * dx + dy * dy); }
function vsAttivo() { var a = leggi("vs_attivo", null); return a && Date.now() < a.fino ? a : null; }
function vsAvvia(fino) {
  if (!navigator.geolocation || io === null) return;
  salva("vs_attivo", { fino: fino, d0: null });
  vsGuarda(); disegnaBandaVS();
}
function vsGuarda() {
  if (VS.watch !== null || !vsAttivo()) return;
  VS.watch = navigator.geolocation.watchPosition(vsPosizione, function () {}, { enableHighAccuracy: true, maximumAge: 15000, timeout: 30000 });
  if ("wakeLock" in navigator) navigator.wakeLock.request("screen").then(function (w) { VS.wl = w; }, function () {});   // schermo acceso: così la posizione continua
}
function vsPosizione(p) {
  var a = vsAttivo(); if (!a) { vsFerma(); return; }
  var r = rientroDi(io); if (!r) { vsFerma(); return; }   // "Sto tornando" annullato
  var q = { lat: Math.round(p.coords.latitude * 1e5) / 1e5, lon: Math.round(p.coords.longitude * 1e5) / 1e5 }, casa = trCfg().casa;
  var d = casa ? Math.round(vsDist(q, casa)) : null;
  if (a.d0 === null && d !== null) { a.d0 = d; salva("vs_attivo", a); }
  var ora = Date.now(), u = VS.ultimo;
  if (d !== null && d < 150) { vsFerma(true); return; }   // arrivato
  if (u && ora - u.t < 40000 && vsDist(q, u) < 250) { disegnaBandaVS(d); return; }   // non serve scrivere a ogni passo
  VS.ultimo = { lat: q.lat, lon: q.lon, t: ora };
  reg["pos." + io] = { v: { lat: q.lat, lon: q.lon, acc: Math.round(p.coords.accuracy || 0), t: ora, d0: a.d0, d: d, fino: a.fino }, t: ora };
  salva("cucina_registro", reg); sincronizza(); disegnaBandaVS(d);
}
function vsFerma(arrivato) {
  if (VS.watch !== null) { navigator.geolocation.clearWatch(VS.watch); VS.watch = null; }
  if (VS.wl) { VS.wl.release().catch(function () {}); VS.wl = null; }
  salva("vs_attivo", null); VS.ultimo = null;
  if (io !== null && reg && reg["pos." + io] && !reg["pos." + io].d) { var ora = Date.now(); reg["pos." + io] = { d: 1, t: ora }; salva("cucina_registro", reg); sincronizza(); }
  if (arrivato && window.segnaRientro && rientroDi(io)) { var r = rientroDi(io); r.arrivo = Math.min(r.arrivo, Date.now()); segnaRientro(io, r); }
  disegnaBandaVS(); if (window.disegnaOggi) disegnaOggi();
}
function disegnaBandaVS(d) {   // la banda in alto su chi sta condividendo
  var b = document.getElementById("vs-banda");
  if (!vsAttivo()) { if (b) b.remove(); return; }
  if (!b) {
    b = el("div"); b.id = "vs-banda";
    b.innerHTML = '<span></span><button type="button">Ferma</button>';
    b.querySelector("button").onclick = function () { vsFerma(); };
    document.body.appendChild(b);
  }
  b.querySelector("span").textContent = "📍 " + (cfg.nomi[1 - io] || "").split(" ")[0] + " ti vede mentre torni" + (d != null ? " · a " + vsKm(d) + " da casa" : "");
}
function vsKm(m) { return m >= 1000 ? (m / 1000).toFixed(1).replace(".", ",") + " km" : Math.round(m / 10) * 10 + " m"; }
// ---------------------------------------------------------------- per chi guarda
function posDi(p) {   // la posizione condivisa di p, se è fresca e il viaggio è in corso
  var e = window.reg && reg["pos." + p];
  if (!e || e.d || !e.v || !e.v.t) return null;
  if (Date.now() - e.v.t > 15 * 60000 || (e.v.fino && Date.now() > e.v.fino)) return null;
  return e.v;
}
function vsMappa(p) {   // la mappetta: il percorso (se c'è), casa e il puntino che si muove
  var pos = posDi(p), r = rientroDi(p), casa = trCfg().casa; if (!pos) return "";
  var punti = (r && r.punti ? r.punti.slice() : []).map(function (x) { return { lat: x[0], lon: x[1] }; });
  if (casa) punti.push(casa); punti.push(pos);
  var la = punti.map(function (x) { return x.lat; }), lo = punti.map(function (x) { return x.lon; });
  var k = Math.cos(la[0] * Math.PI / 180), x0 = Math.min.apply(null, lo), x1 = Math.max.apply(null, lo), y0 = Math.min.apply(null, la), y1 = Math.max.apply(null, la);
  var w = Math.max(1e-5, (x1 - x0) * k), h = Math.max(1e-5, y1 - y0), sc = Math.min(280 / w, 150 / h), ox = (300 - w * sc) / 2, oy = (170 - h * sc) / 2;
  var xy = function (q) { return [(ox + (q.lon - x0) * k * sc).toFixed(1), (oy + (y1 - q.lat) * sc).toFixed(1)]; };
  var col = p ? "#2a9d93" : "#e8763c", s = '<svg viewBox="0 0 300 170" class="vs-mappa">';
  if (r && r.punti && r.punti.length > 1) s += '<path d="M' + r.punti.map(function (x) { return xy({ lat: x[0], lon: x[1] }).join(" "); }).join(" L") + '" fill="none" stroke="' + col + '" stroke-opacity=".35" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>';
  if (casa) { var c = xy(casa); s += '<text x="' + c[0] + '" y="' + (+c[1] + 7) + '" text-anchor="middle" font-size="20">🏠</text>'; }
  var q = xy(pos); s += '<circle cx="' + q[0] + '" cy="' + q[1] + '" r="13" fill="' + col + '" fill-opacity=".2"/><circle cx="' + q[0] + '" cy="' + q[1] + '" r="7" fill="' + col + '" stroke="#fff" stroke-width="3"/>';
  return s + "</svg>";
}
function vsTesto(p) {   // "a 1,2 km da casa · 30 s fa"
  var pos = posDi(p); if (!pos) return "";
  var s = Math.round((Date.now() - pos.t) / 1000), quando = s < 60 ? "adesso" : Math.round(s / 60) + " min fa";
  return (pos.d != null ? "a " + vsKm(pos.d) + " da casa" : "posizione condivisa") + " · " + quando;
}
(function () {
  var st = document.createElement("style");
  st.textContent = "#vs-banda{position:fixed;z-index:30;left:10px;right:10px;top:calc(8px + env(safe-area-inset-top));display:flex;align-items:center;gap:10px;background:#1f6f68;color:#fff;border-radius:16px;padding:10px 12px 10px 14px;font-size:14px;box-shadow:0 8px 24px -10px rgba(0,0,0,.5)}" +
    "#vs-banda span{flex:1}#vs-banda button{border:0;border-radius:12px;background:rgba(255,255,255,.22);color:#fff;font-weight:600;padding:7px 12px}" +
    ".vs-mappa{display:block;width:100%;max-width:340px;margin:8px auto 4px;background:var(--soft,#f3eeee);border-radius:14px}" +
    ".rt-pos{display:flex;gap:10px;align-items:center;font-size:14.5px;margin:12px 2px 2px;color:var(--ink)}.rt-pos input{width:20px;height:20px;accent-color:var(--accent)}";
  document.head.appendChild(st);
  document.addEventListener("visibilitychange", function () { if (document.visibilityState === "visible" && vsAttivo()) { VS.ultimo = null; if (VS.watch === null) vsGuarda(); } });
  setTimeout(function () { if (vsAttivo()) { vsGuarda(); disegnaBandaVS(); } }, 3000);   // se l'app si è riaperta a metà strada
})();
