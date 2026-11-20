// Home2Love — "Stato dell'app": ogni dispositivo dice ogni tanto "ci sono" (nel registro cifrato, chiave "disp.<id>"
// = { nome, tipo, versione, visto }), e il telefono mostra in una pagina sola: ultima sincronizzazione, versione di ogni
// dispositivo (e se ne esiste una più nuova), chi è acceso, il tablet (radio, timer) e quando si è aggiornato il palinsesto TV.
// Il "ci sono" si scrive al massimo una volta l'ora per dispositivo, così non si riempie GitHub di salvataggi.

var STATO_OGNI = 60 * 60000;
function versioneQui() {
  var s = [].filter.call(document.scripts, function (x) { return /comune\.js\?v=\d+/.test(x.src); })[0];
  var m = s && /\?v=(\d+)/.exec(s.src); return m ? +m[1] : 0;
}
function idDispositivo() {
  var id = leggi("dispositivo_id", ""); if (!id) { id = String(nuovoId()).slice(-9); salva("dispositivo_id", id); }
  return id;
}
function tipoQui() {
  var p = location.pathname.split("/").pop() || "index.html";
  return /telefono/.test(p) ? "telefono" : /comodino/.test(p) ? "comodino" : /dove/.test(p) ? "dove" : /gatto/.test(p) ? "gatto" : /index|^$/.test(p) ? (/completa/.test(location.search) ? "completa" : "tablet") : p.replace(".html", "");
}
var STATO_NOMI = { telefono: "📱 Telefono", tablet: "🖥️ Tablet", completa: "🖥️ Dashboard su telefono", comodino: "🌙 Comodino", dove: "🏠 Dove siete?", gatto: "🐱 Stanza del gatto" };
function nomeQui() {
  var t = tipoQui(), chi = window.io === 0 || window.io === 1 ? (cfg.nomi[io] || "").split(" ")[0] : "";
  return (STATO_NOMI[t] || t) + (chi && (t === "telefono" || t === "comodino") ? " di " + chi : "");
}
function sonoQui(forza) {   // "ci sono": solo dai dispositivi collegati, non dalle pagine dentro un'altra (iframe)
  if (window.parent !== window || !window.token || !window.chiaveCripto || !window.reg) return;
  var k = "disp." + idDispositivo(), e = reg[k], ora = Date.now();
  if (!forza && e && e.v && e.v.versione === versioneQui() && e.v.nome === nomeQui() && ora - e.v.visto < STATO_OGNI) return;
  reg[k] = { v: { nome: nomeQui(), tipo: tipoQui(), versione: versioneQui(), visto: ora, schermo: Math.round(screen.width) + "×" + Math.round(screen.height) }, t: ora };
  salva("cucina_registro", reg); sincronizza();
}
setTimeout(function () { sonoQui(); setInterval(function () { if (document.visibilityState === "visible") sonoQui(); }, 5 * 60000); }, 20000);

// ---------------------------------------------------------------- la pagina (nel telefono)
function faStato(t) {   // "adesso", "3 min fa", "2 h fa", "ieri", "5 giorni fa"
  var s = Math.round((Date.now() - t) / 1000);
  return s < 45 ? "adesso" : s < 3600 ? Math.round(s / 60) + " min fa" : s < 86400 ? Math.round(s / 3600) + " h fa" : s < 172800 ? "ieri" : Math.round(s / 86400) + " giorni fa";
}
var STATO_ONLINE = { ultima: null, palinsesto: null };
function controllaOnline(poi) {   // la versione più nuova pubblicata e l'ora del palinsesto
  fetch("sw.js?t=" + Date.now(), { cache: "no-store" }).then(function (r) { return r.text(); }).then(function (t) {
    var m = /homedashboard-v(\d+)/.exec(t); STATO_ONLINE.ultima = m ? +m[1] : null; poi();
  }, function () {});
  fetch("https://raw.githubusercontent.com/marcocuccovillo-cpu/HomeDashboard/palinsesto/palinsesto.json?t=" + Math.floor(Date.now() / 600000), { cache: "no-store" })
    .then(function (r) { return r.json(); }).then(function (j) { STATO_ONLINE.palinsesto = j.aggiornato || null; poi(); }, function () { STATO_ONLINE.palinsesto = 0; poi(); });
}
function disegnaStatoApp(box) {
  var v = versioneQui(), ult = STATO_ONLINE.ultima, h = "";
  function riga(pal, titolo, dett, destra) {
    return '<div class="st-riga"><span class="st-pal" style="background:' + pal + '"></span><div class="st-tx"><b>' + titolo + '</b><small>' + dett + '</small></div>' + (destra ? '<span class="st-dx">' + destra + '</span>' : "") + "</div>";
  }
  var verde = "#2f9e5f", giallo = "#e0a91e", rosso = "#d7263d", grigio = "#b9aeae";
  // questo telefono
  h += '<div class="imp-sez">Questo telefono</div>';
  var collegato = !!(window.token && window.chiaveCripto);
  h += riga(!collegato ? rosso : erroreSync ? giallo : verde, !collegato ? "Non collegato" : erroreSync ? "Problema di sincronizzazione" : "Sincronizzato",
    !collegato ? "Serve la password di casa" : erroreSync ? testoSicuroStato(erroreSync) : ultimaSync ? "ultima sincronizzazione " + faStato(ultimaSync) : "in attesa della prima sincronizzazione…",
    navigator.onLine === false ? "offline" : "");
  h += riga(ult && ult > v ? giallo : verde, "Versione " + v, ult === null ? "controllo se ce n'è una più nuova…" : ult > v ? "è disponibile la " + ult + ": tocca \"Scarica di nuovo tutto\"" : "è la più recente", "");
  var dimensione = (JSON.stringify(window.reg || {}).length / 1024).toFixed(0);
  h += riga(grigio, "Dati di casa", Object.keys(window.reg || {}).length + " voci · " + dimensione + " KB cifrati", "");
  // gli altri dispositivi
  h += '<div class="imp-sez">Dispositivi</div>';
  var mio = "disp." + idDispositivo(), lista = Object.keys(window.reg || {}).filter(function (k) { return k.indexOf("disp.") === 0 && reg[k].v && !reg[k].d; })
    .map(function (k) { return { k: k, d: reg[k].v }; }).filter(function (x) { return Date.now() - x.d.visto < 30 * 864e5; })
    .sort(function (a, b) { return b.d.visto - a.d.visto; });
  if (!lista.length) h += '<p class="nota-txt">Ancora nessuno: ogni dispositivo collegato compare qui entro qualche minuto da quando lo apri.</p>';
  lista.forEach(function (x) {
    var acceso = Date.now() - x.d.visto < STATO_OGNI * 1.3, vecchia = ult && x.d.versione < ult;
    h += riga(acceso ? verde : grigio, testoSicuroStato(x.d.nome) + (x.k === mio ? " (questo)" : ""),
      (acceso ? "acceso · " : "visto ") + faStato(x.d.visto) + " · versione " + x.d.versione + (vecchia ? " ⚠️ da aggiornare" : ""), "");
  });
  // il tablet
  var st = cfg.statoTablet;
  if (st) h += '<div class="imp-sez">Tablet</div>' + riga(grigio, st.radio ? "📻 Radio accesa · " + testoSicuroStato(st.stazione || "") : "Radio spenta", (st.timer ? st.timer + " timer in corso · " : "") + "aggiornato " + faStato(st.quando), "");
  // il palinsesto
  var pal = STATO_ONLINE.palinsesto;
  h += '<div class="imp-sez">Guida TV</div>' + riga(pal ? (Date.now() - pal < 8 * 3600e3 ? verde : giallo) : pal === 0 ? rosso : grigio, "Palinsesto",
    pal ? "scaricato " + faStato(pal) + " (si aggiorna da solo ogni 6 ore)" : pal === 0 ? "non riesco a leggerlo" : "controllo…", "");
  box.innerHTML = h;
}
function testoSicuroStato(t) { var x = document.createElement("div"); x.textContent = t == null ? "" : String(t); return x.innerHTML; }
(function () {
  var st = document.createElement("style");
  st.textContent = ".st-riga{display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid var(--line)}.st-pal{width:10px;height:10px;border-radius:50%;flex:none}" +
    ".st-tx{flex:1;min-width:0}.st-tx b{display:block;font-size:15px;font-weight:600}.st-tx small{display:block;color:var(--muted);font-size:12.5px;line-height:1.35}.st-dx{font-size:12px;color:var(--muted)}";
  document.head.appendChild(st);
})();
