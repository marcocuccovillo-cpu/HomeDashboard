// Home2Love — "a colpo d'occhio" in cima a Oggi sul telefono: meteo, bus sotto casa e prossimo appuntamento.
// Meteo: Open-Meteo, direttamente dal telefono. Bus: il telefono non può chiederli a TPER (passano dal lettore
// in Termux sul tablet), quindi scrive "bus.chiedi" nel registro cifrato; il tablet, finché qualcuno guarda
// (10 minuti), pubblica i passaggi in "bus.ora". Appuntamenti: cfg.eventi, gli stessi del calendario del tablet.

var OC = { meteo: null, meteoT: 0 };
(function () {
  var st = document.createElement("style");
  st.textContent = [
    "#occhiata{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:14px}",
    "#occhiata .oc{background:var(--card);border-radius:18px;box-shadow:var(--ombra);padding:12px 13px;border:0;text-align:left;color:var(--ink);min-width:0;display:flex;flex-direction:column;gap:3px}",
    "#occhiata .oc.largo{grid-column:1 / -1;flex-direction:row;align-items:center;gap:12px}",
    "#occhiata .oc .t{font-size:11.5px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--muted)}",
    "#occhiata .oc .grande{font-size:26px;font-weight:300;line-height:1.1;display:flex;align-items:center;gap:6px}",
    "#occhiata .oc .grande .em{font-size:26px}#occhiata .oc small{font-size:12.5px;color:var(--muted);line-height:1.35}",
    "#occhiata .oc .linee{display:flex;gap:6px;flex-wrap:wrap;margin-top:2px}",
    "#occhiata .oc .linee span{display:inline-flex;gap:5px;align-items:baseline;background:var(--soft);border-radius:10px;padding:4px 8px;font-size:13px}",
    "#occhiata .oc .linee b{font-size:14px}#occhiata .oc .linee .ora{background:var(--accent);color:#fff}",
    "#occhiata .oc.app .icona{font-size:26px}#occhiata .oc.app div{min-width:0}#occhiata .oc.app b{display:block;font-size:15px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}",
    ".ore-meteo{display:flex;gap:6px;overflow-x:auto;padding:4px 0 10px}.ore-meteo div{flex:none;width:58px;text-align:center;background:var(--soft);border-radius:14px;padding:8px 2px;font-size:13px}",
    ".ore-meteo div span{display:block;font-size:22px;margin:3px 0}.ore-meteo div small{display:block;color:#3b7dd8;font-size:11.5px;min-height:14px}"
  ].join("\n");
  document.head.appendChild(st);
  var f = document.createElement("div"); f.className = "velo"; f.id = "ed-occhiata";
  f.innerHTML = '<div class="foglio"><h3 id="oc-titolo"></h3><div id="oc-corpo"></div><div class="azioni"><button type="button" class="btn chiudi" style="margin-left:auto">Chiudi</button></div></div>';
  document.body.appendChild(f);
  f.addEventListener("click", function (e) { if (e.target === f || e.target.classList.contains("chiudi")) chiudi("ed-occhiata"); });
})();

// ---------------------------------------------------------------- meteo
function ocIcona(c) {
  return c === 0 ? "☀️" : c <= 2 ? "🌤️" : c === 3 ? "☁️" : c === 45 || c === 48 ? "🌫️" : (c >= 51 && c <= 67) || (c >= 80 && c <= 82) ? "🌧️" : (c >= 71 && c <= 77) || c === 85 || c === 86 ? "🌨️" : c >= 95 ? "⛈️" : "☁️";
}
function ocDescr(c) {
  return c === 0 ? "sereno" : c <= 2 ? "poco nuvoloso" : c === 3 ? "coperto" : c === 45 || c === 48 ? "nebbia" : c >= 95 ? "temporale" : (c >= 71 && c <= 77) || c === 85 || c === 86 ? "neve" : c >= 80 ? "rovesci" : c >= 61 ? "pioggia" : c >= 51 ? "pioggerella" : "";
}
function ocLeggiMeteo() {
  if (Date.now() - OC.meteoT < 15 * 60000) return;
  OC.meteoT = Date.now();
  fetch("https://api.open-meteo.com/v1/forecast?latitude=" + LAT + "&longitude=" + LON + "&current=temperature_2m,weather_code,precipitation" +
    "&hourly=temperature_2m,weather_code,precipitation_probability,precipitation&daily=temperature_2m_max,temperature_2m_min&timezone=Europe%2FRome&forecast_days=2")
    .then(function (r) { return r.json(); }).then(function (j) { OC.meteo = j; disegnaOcchiata(); }, function () { OC.meteoT = 0; });
}
function ocIndiceOra(h) { var d = new Date(), k = iso(d) + "T" + due(d.getHours()) + ":00"; return h.time.indexOf(k); }
function ocVerso(o) { return o === 0 ? "verso mezzanotte" : o === 1 ? "verso l'una" : "verso le " + o; }
function ocPioggia() {   // "piove verso le 19" / "smette verso le 16" / "niente pioggia oggi"
  var j = OC.meteo; if (!j || !j.hourly) return "";
  var h = j.hourly, i0 = ocIndiceOra(h); if (i0 < 0) return "";
  var bagnato = function (i) { return h.precipitation[i] >= .2 || h.precipitation_probability[i] >= 55; };
  var ora = bagnato(i0) || (j.current && j.current.precipitation >= .1);
  for (var i = i0 + 1; i < Math.min(h.time.length, i0 + 18); i++) {
    var o = new Date(h.time[i]).getHours(), dom = new Date(h.time[i]).getDate() !== new Date().getDate();
    if (ora && !bagnato(i)) return "smette " + ocVerso(o) + (dom && o > 5 ? " (domani)" : "");
    if (!ora && bagnato(i)) return (dom ? (o < 6 ? "stanotte " : "domani ") : "") + "piove " + ocVerso(o);
  }
  return ora ? "piove per ore" : "niente pioggia in vista";
}
function ocApriMeteo() {
  var j = OC.meteo; if (!j) return;
  $("oc-titolo").textContent = "Meteo a Bologna";
  var c = $("oc-corpo"); c.innerHTML = "";
  var h = j.hourly, i0 = Math.max(0, ocIndiceOra(h)), r = el("div", "ore-meteo");
  for (var i = i0; i < Math.min(h.time.length, i0 + 16); i++) {
    var d = el("div"); d.innerHTML = "<b></b><span></span><em></em><small></small>";
    d.querySelector("b").textContent = i === i0 ? "ora" : new Date(h.time[i]).getHours() + ":00";
    d.querySelector("span").textContent = ocIcona(h.weather_code[i]);
    d.querySelector("em").textContent = Math.round(h.temperature_2m[i]) + "°"; d.querySelector("em").style.fontStyle = "normal";
    d.querySelector("small").textContent = h.precipitation_probability[i] >= 20 ? h.precipitation_probability[i] + "%" : "";
    r.appendChild(d);
  }
  c.appendChild(r);
  var p = el("p", "spiega"); p.textContent = "Massima " + Math.round(j.daily.temperature_2m_max[0]) + "°, minima " + Math.round(j.daily.temperature_2m_min[0]) + "° · " + ocPioggia() + ". In azzurro la probabilità di pioggia.";
  c.appendChild(p);
  apri("ed-occhiata");
}

// ---------------------------------------------------------------- bus (dal tablet)
function ocBus() { var e = reg && reg["bus.ora"]; return e && !e.d && e.v ? e.v : null; }
function ocChiediBus(forza) {   // "tablet, mandami i bus": al massimo ogni 4 minuti
  if (!reg || !token || !chiaveCripto || !(cfg.bus && cfg.bus.fermate && cfg.bus.fermate.length)) return;
  var e = reg["bus.chiedi"], ora = Date.now();
  if (!forza && e && e.v && ora - e.v.t < 4 * 60000) return;
  reg["bus.chiedi"] = { v: { t: ora, da: io }, t: ora }; salva("cucina_registro", reg); sincronizza();
}
function ocMinuti(hhmm, rif) { var p = hhmm.split(":"), d = new Date(), m = (+p[0]) * 60 + (+p[1]) - (d.getHours() * 60 + d.getMinutes()); if (m < -60) m += 1440; return m; }
function ocPassaggi(f) {
  return (f.passaggi || []).map(function (x) { return { linea: x.linea, min: ocMinuti(x.ora), ora: x.ora }; })
    .filter(function (x) { return x.min >= 0; }).sort(function (a, b) { return a.min - b.min; });
}
function ocApriBus() {
  ocChiediBus(true);
  var b = ocBus(); $("oc-titolo").textContent = "Bus sotto casa";
  var c = $("oc-corpo"); c.innerHTML = "";
  if (!b) { var v = el("p", "spiega"); v.textContent = "Chiedo gli orari al tablet… tra qualche secondo compaiono qui."; c.appendChild(v); }
  else b.fermate.forEach(function (f) {
    var t = el("p"); t.style.cssText = "margin:10px 0 6px;font-weight:700;font-size:14px"; t.textContent = (f.nome || "Fermata") + " · " + f.codice; c.appendChild(t);
    var r = el("div", "linee"); r.style.cssText = "display:flex;gap:6px;flex-wrap:wrap";
    var pp = ocPassaggi(f);
    if (!pp.length) { var n = el("span", "spiega"); n.textContent = "nessun bus nei prossimi minuti"; r.appendChild(n); }
    pp.slice(0, 6).forEach(function (x) { var s = el("span"); s.style.cssText = "background:var(--soft);border-radius:10px;padding:6px 10px;font-size:14px"; s.innerHTML = "<b></b> "; s.querySelector("b").textContent = x.linea; s.appendChild(document.createTextNode(x.min <= 0 ? "adesso" : x.min > 90 ? "alle " + x.ora : x.min + " min")); r.appendChild(s); });
    c.appendChild(r);
  });
  if (b) { var q = el("p", "spiega"); q.textContent = "Orari mandati dal tablet alle " + oraHM(b.t) + "."; c.appendChild(q); }
  apri("ed-occhiata");
}

// ---------------------------------------------------------------- prossimo appuntamento
function ocProssimoApp() {
  var ora = new Date(), k = iso(ora), hm = due(ora.getHours()) + ":" + due(ora.getMinutes());
  return (cfg.eventi || []).filter(function (e) { return e.data > k || (e.data === k && (!e.ora || e.ora >= hm)); })
    .sort(function (a, b) { return (a.data + (a.ora || "99")).localeCompare(b.data + (b.ora || "99")); })[0] || null;
}
function ocQuando(e) {
  var d = daIso(e.data), oggi = new Date(), n = Math.round((new Date(d.getFullYear(), d.getMonth(), d.getDate()) - new Date(oggi.getFullYear(), oggi.getMonth(), oggi.getDate())) / 864e5);
  return (n === 0 ? "Oggi" : n === 1 ? "Domani" : n < 7 ? GIORNI[d.getDay()].charAt(0).toUpperCase() + GIORNI[d.getDay()].slice(1) : d.getDate() + " " + MESI[d.getMonth()]) + (e.ora ? " alle " + e.ora : "");
}

// ---------------------------------------------------------------- disegno
function disegnaOcchiata() {
  var box = $("occhiata"); if (!box) return;
  box.innerHTML = "";
  // meteo
  var m = el("button", "oc"); m.type = "button"; m.onclick = ocApriMeteo;
  var j = OC.meteo;
  m.innerHTML = '<span class="t">Meteo</span><span class="grande"><span class="em"></span><span class="v"></span></span><small></small>';
  if (j && j.current) {
    m.querySelector(".em").textContent = ocIcona(j.current.weather_code);
    m.querySelector(".v").textContent = Math.round(j.current.temperature_2m) + "°";
    m.querySelector("small").textContent = ocDescr(j.current.weather_code) + " · " + ocPioggia();
  } else { m.querySelector(".v").textContent = "…"; m.querySelector("small").textContent = "carico il meteo"; }
  box.appendChild(m);
  // bus
  var bc = cfg.bus && cfg.bus.fermate && cfg.bus.fermate.length, b = el("button", "oc"); b.type = "button"; b.onclick = ocApriBus;
  b.innerHTML = '<span class="t">Bus</span><div class="linee"></div><small></small>';
  var dati = ocBus(), fresco = dati && Date.now() - dati.t < 15 * 60000;
  if (!bc) b.querySelector("small").textContent = "imposta le fermate dal tablet";
  else if (!fresco) b.querySelector("small").textContent = "tocca per chiedere gli orari al tablet";
  else {
    var tutti = []; dati.fermate.forEach(function (f) { tutti = tutti.concat(ocPassaggi(f)); });
    tutti.sort(function (a, c) { return a.min - c.min; });
    var l = b.querySelector(".linee");
    tutti.slice(0, 3).forEach(function (x) { var s = el("span", x.min <= 3 ? "ora" : ""); s.innerHTML = "<b></b>"; s.querySelector("b").textContent = x.linea; s.appendChild(document.createTextNode(x.min <= 0 ? "ora" : x.min > 90 ? x.ora : x.min + "′")); l.appendChild(s); });
    b.querySelector("small").textContent = tutti.length ? (dati.fermate[0].nome || "") + " · alle " + oraHM(dati.t) : "nessun bus a breve";
  }
  box.appendChild(b);
  // appuntamento
  var e = ocProssimoApp(), a = el("button", "oc largo app"); a.type = "button";
  a.innerHTML = '<span class="icona">📅</span><div><span class="t"></span><b></b></div>';
  a.querySelector(".t").textContent = e ? ocQuando(e) : "Appuntamenti";
  a.querySelector("b").textContent = e ? e.testo : "Nessun appuntamento in arrivo";
  a.onclick = function () { var c = $("card-app"); if (c) c.scrollIntoView({ behavior: "smooth", block: "start" }); };
  box.appendChild(a);
}
function avviaOcchiata() {
  ocLeggiMeteo(); disegnaOcchiata();
  setTimeout(function () { if (scheda === "oggi") ocChiediBus(); }, 4000);
  setInterval(function () { if (document.visibilityState === "visible" && scheda === "oggi") { ocLeggiMeteo(); ocChiediBus(); disegnaOcchiata(); } }, 60000);
  document.addEventListener("visibilitychange", function () { if (document.visibilityState === "visible") { ocLeggiMeteo(); ocChiediBus(); } });
}
