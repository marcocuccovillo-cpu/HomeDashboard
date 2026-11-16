// HomeDashboard — riquadro "Rete" della seconda schermata del tablet.
// Una pagina web vede poco della rete: niente nome della rete, segnale o dispositivi connessi.
// Qui si misura quello che si può: stato, latenza, velocità di download, IP pubblico e operatore.

var RETE_PING = "https://1.1.1.1/cdn-cgi/trace";                        // risposta minuscola, server vicini
var RETE_FILE = "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";   // ~1,2 MB, per la velocità
var reteStorico = leggi("rete_storico", []);                            // ultime 60 latenze (ms, null = persa)
var reteVel = leggi("rete_velocita", null);                             // { mbps, quando }
var reteInfo = leggi("rete_info", null);                                // { ip, isp, zona, quando }
var reteMisuraInCorso = false;

function reteTesto(id, t) { var e = $(id); if (e) e.textContent = t; }
function fraQuanto(t) {
  var m = Math.round((Date.now() - t) / 60000);
  if (m < 1) return "adesso"; if (m < 60) return m + " min fa";
  var h = Math.round(m / 60); return h < 24 ? h + (h === 1 ? " ora fa" : " ore fa") : "più di un giorno fa";
}
function conTimeout(p, ms) { return Promise.race([p, new Promise(function (_, ko) { setTimeout(function () { ko(new Error("tempo scaduto")); }, ms); })]); }

function disegnaRete() {
  var c = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
  var online = navigator.onLine !== false;
  var tipi = { wifi: "Wi‑Fi", ethernet: "Cavo", cellular: "Rete mobile", bluetooth: "Bluetooth", none: "Nessuna", wimax: "WiMAX" };
  var tipo = c && tipi[c.type] ? tipi[c.type] : "";
  var st = $("rete-stato");
  st.textContent = online ? "Online" + (tipo ? " · " + tipo : "") : "Offline";
  st.className = "pillola " + (online ? "ok" : "no");
  reteTesto("rete-tipo", c ? (tipo || "Non indicata") + (c.effectiveType ? " · qualità " + c.effectiveType.toUpperCase() : "") : "Non disponibile su questo browser");
  reteTesto("rete-stima", c && c.downlink ? (c.downlink >= 10 ? "≥ 10" : c.downlink) + " Mbps" + (c.rtt ? " · " + c.rtt + " ms" : "") : "–");
  var ultimo = reteStorico.length ? reteStorico[reteStorico.length - 1] : undefined;
  reteTesto("rete-ping", ultimo == null ? "–" : String(ultimo));
  reteTesto("rete-down", reteVel ? (reteVel.mbps >= 100 ? Math.round(reteVel.mbps) : reteVel.mbps.toFixed(1)) : "–");
  reteTesto("rete-quando", reteMisuraInCorso ? "sto misurando…" : reteVel ? fraQuanto(reteVel.quando) : "mai");
  reteTesto("rete-ip", reteInfo ? reteInfo.ip : "–");
  reteTesto("rete-isp", reteInfo && reteInfo.isp ? reteInfo.isp : "–");
  reteTesto("rete-zona", reteInfo && reteInfo.zona ? reteInfo.zona : "–");
  // barre della latenza: più alte = più lenta
  var box = $("rete-barre"); box.innerHTML = "";
  var validi = reteStorico.filter(function (x) { return x != null; }), max = Math.max(100, Math.max.apply(null, validi.concat([0])));
  reteStorico.forEach(function (v) {
    var b = document.createElement("i");
    if (v == null) { b.className = "persa"; b.title = "nessuna risposta"; }
    else { b.style.height = Math.max(4, v / max * 100) + "%"; b.title = v + " ms"; }
    box.appendChild(b);
  });
  $("rete-misura").disabled = reteMisuraInCorso;
  $("rete-misura").textContent = reteMisuraInCorso ? "Misuro…" : "Misura velocità";
}

function misuraLatenza() {   // tre richieste piccolissime, tengo la più veloce
  function una() {
    var t0 = performance.now();
    return conTimeout(fetch(RETE_PING + "?t=" + Date.now() + Math.random(), { mode: "no-cors", cache: "no-store" }), 5000)
      .then(function () { return performance.now() - t0; });
  }
  var tempi = [];
  return [0, 1, 2].reduce(function (p) {
    return p.then(una).then(function (t) { tempi.push(t); }, function () {});
  }, Promise.resolve()).then(function () {
    reteStorico.push(tempi.length ? Math.round(Math.min.apply(null, tempi)) : null);
    if (reteStorico.length > 60) reteStorico = reteStorico.slice(-60);
    salva("rete_storico", reteStorico); disegnaRete();
  });
}

function leggiInfoRete() {   // IP pubblico, operatore e zona (ipinfo.io, se non risponde ipapi.co)
  function da(url, conv) { return conTimeout(fetch(url, { cache: "no-store" }), 8000).then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); }).then(conv); }
  function pulisci(org) { return (org || "").replace(/^AS\d+\s+/, ""); }
  return da("https://ipinfo.io/json", function (j) { return { ip: j.ip, isp: pulisci(j.org), zona: [j.city, j.region].filter(Boolean).join(", ") }; })
    .catch(function () { return da("https://ipapi.co/json/", function (j) { return { ip: j.ip, isp: pulisci(j.org), zona: [j.city, j.region].filter(Boolean).join(", ") }; }); })
    .then(function (i) { i.quando = Date.now(); reteInfo = i; salva("rete_info", i); }, function () {})
    .then(disegnaRete);
}

function misuraVelocita() {   // scarica ~4 MB (tre copie in parallelo) e calcola i Mbps
  if (reteMisuraInCorso) return;
  reteMisuraInCorso = true; disegnaRete();
  var t0 = performance.now(), byte = 0;
  function scarica(i) {
    return fetch(RETE_FILE + "?v=" + Date.now() + "-" + i, { cache: "no-store" }).then(function (r) {
      if (!r.ok) throw new Error(r.status);
      return r.arrayBuffer();
    }).then(function (b) { byte += b.byteLength; });
  }
  conTimeout(Promise.all([scarica(0), scarica(1), scarica(2)]), 30000).then(function () {
    var s = (performance.now() - t0) / 1000;
    reteVel = { mbps: byte * 8 / s / 1e6, quando: Date.now() }; salva("rete_velocita", reteVel);
  }, function () {}).then(function () { reteMisuraInCorso = false; disegnaRete(); });
}

function reteVisibile() {   // quando si apre la schermata: misura da sola se l'ultima volta è di più di un'ora fa
  disegnaRete(); leggiDispositivi();
  if (!reteVel || Date.now() - reteVel.quando > 60 * 60 * 1000) misuraVelocita();
}

// ---------------------------------------------------------------- dispositivi connessi
// La lista la scrive strumenti/dispositivi.py (gira sul tablet in Termux) in dispositivi.json nel ramo "dati".
var ICONE_DISP = {
  wifi: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M2.5 9a14 14 0 0 1 19 0M5.5 12.5a9.5 9.5 0 0 1 13 0M8.6 16a5 5 0 0 1 6.8 0"/><circle cx="12" cy="19.3" r="1.2" fill="currentColor" stroke="none"/></svg>',
  cavo: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="3" width="12" height="9" rx="1.5"/><path d="M9 3v3M12 3v3M15 3v3M12 12v4M8 21h8M12 16v5"/></svg>'
};
var dispDati = null, dispEtag = "", dispTutti = false, dispStato = "";
var GUIDA_DISP = "https://github.com/marcocuccovillo-cpu/HomeDashboard/blob/main/strumenti/LEGGIMI.md";
function leggiDispositivi() {
  if (!token || !chiaveCripto) { dispStato = "scollegato"; disegnaDispositivi(); return; }
  gh("GET", "/contents/dispositivi.json?ref=" + RAMO, null, dispEtag ? { "If-None-Match": dispEtag } : null).then(function (r) {
    if (r.status === 304) return;
    if (r.status === 404) { dispStato = "manca"; dispDati = null; return; }
    if (!r.ok) throw new Error(r.status);
    dispEtag = r.headers.get("ETag") || "";
    return r.json().then(function (j) {
      var f = JSON.parse(da64(j.content));
      return decifraTesto(f.dati).then(function (t) { dispDati = JSON.parse(t); dispStato = "ok"; });
    });
  }).catch(function () { if (!dispDati) dispStato = "errore"; }).then(disegnaDispositivi);
}
function disegnaOspiti() {   // rete Wi-Fi di casa letta dal lettore in Termux, con il QR già pronto
  var o = dispDati && (dispDati.wifi || dispDati.ospiti), box = $("ospiti"); if (!box) return;
  if (!o || !o.ssid) { box.hidden = true; return; }
  box.hidden = false; box.classList.toggle("spenta", !o.attivo);
  if (o.qr) $("ospiti-qr").src = "data:image/png;base64," + o.qr;
  $("ospiti-qr").hidden = !o.qr;
  $("ospiti-ssid").textContent = o.ssid; $("ospiti-pw").textContent = o.password || "(non letta)";
  $("ospiti-5-riga").hidden = !o.ssid5; $("ospiti-ssid5").textContent = o.ssid5 || "";
  $("ospiti-stato").textContent = o.attivo ? "accesa" : "spenta"; $("ospiti-stato").className = "pillola" + (o.attivo ? " ok" : "");
}
function disegnaDispositivi() {
  disegnaTablet(); disegnaOspiti();
  var ul = $("disp-lista"), st = $("disp-stato"), conta = $("disp-conta"), altri = $("disp-altri");
  ul.innerHTML = ""; altri.hidden = true; st.innerHTML = "";
  if (!dispDati) {
    conta.textContent = "–"; conta.className = "pillola";
    var testo = dispStato === "scollegato" ? "Sblocca prima la dashboard con la password, poi installa il lettore della Vodafone Station."
      : dispStato === "errore" ? "Non riesco a leggere la lista, riprovo tra un minuto."
      : "Per vedere qui i dispositivi della Vodafone Station installa il lettore sul tablet con Termux (10 minuti, una volta sola).";
    st.textContent = testo + " ";
    var a = document.createElement("a"); a.href = GUIDA_DISP; a.target = "_blank"; a.rel = "noopener"; a.textContent = "Istruzioni";
    st.appendChild(a);
    return;
  }
  var lista = dispDati.dispositivi || [], attivi = lista.filter(function (d) { return d.attivo; });
  conta.textContent = attivi.length + " connessi"; conta.className = "pillola ok";
  (dispTutti ? lista : attivi).forEach(function (d) {
    var li = document.createElement("li"); if (!d.attivo) li.className = "spento";
    li.innerHTML = ICONE_DISP[d.via === "cavo" ? "cavo" : "wifi"] + '<span class="nome"></span><span class="banda"></span><span class="ip"></span>';
    li.querySelector(".nome").textContent = d.nome + (d.via === "ospiti" ? " (ospiti)" : "");
    var banda = li.querySelector(".banda"); if (d.banda) banda.textContent = d.banda; else banda.remove();
    li.querySelector(".ip").textContent = d.ip;
    li.title = d.via === "cavo" ? "Collegato via cavo" : "Wi‑Fi";
    ul.appendChild(li);
  });
  var spenti = lista.length - attivi.length;
  if (spenti) { altri.hidden = false; altri.textContent = dispTutti ? "Solo i connessi" : "Mostra anche " + spenti + (spenti === 1 ? " non connesso" : " non connessi"); }
  var quando = Date.parse(dispDati.aggiornato), vecchio = Date.now() - quando > Math.max(3 * (dispDati.ogni || 300) * 1000, 40 * 60 * 1000);
  if (dispDati.errore) { st.textContent = "Il lettore sul tablet segnala: " + dispDati.errore; conta.className = "pillola no"; }
  else if (vecchio) { st.textContent = "Il lettore sul tablet non aggiorna da " + fraQuanto(quando).replace(" fa", "") + ": controlla che Termux sia aperto."; conta.className = "pillola no"; }
  else st.textContent = "Dalla Vodafone Station · controllato " + fraQuanto(quando);
}

// ---------------------------------------------------------------- salute del tablet
// Dal lettore in Termux (con Termux:API): batteria, temperatura, salute, RAM, spazio, da quanto è acceso.
// Senza Termux:API resta la batteria vista dal browser (percentuale e carica, senza temperatura).
var battBrowser = null;
var STATI_BATT = { CHARGING: "in carica", DISCHARGING: "a batteria", FULL: "carica completa", NOT_CHARGING: "collegato, non carica" };
var SALUTE_BATT = { GOOD: "buona", OVERHEAT: "surriscaldata", DEAD: "esaurita", OVER_VOLTAGE: "sovratensione", COLD: "troppo fredda", UNSPECIFIED_FAILURE: "guasto", UNKNOWN: "sconosciuta" };
function durata(s) {
  var g = Math.floor(s / 86400), h = Math.floor(s % 86400 / 3600), m = Math.floor(s % 3600 / 60);
  return g ? g + (g === 1 ? " giorno " : " giorni ") + h + " h" : h ? h + " h " + m + " min" : m + " min";
}
function disegnaTablet() {
  if (!$("card-tablet")) return;   // riquadro tolto dalla dashboard
  var t = dispDati && dispDati.tablet && dispDati.tablet.batteria != null ? dispDati.tablet : null;
  var extra = dispDati && dispDati.tablet ? dispDati.tablet : {};
  var batt = t ? t.batteria : battBrowser ? Math.round(battBrowser.level * 100) : null;
  var inCarica = t ? t.presa && t.presa !== "UNPLUGGED" : battBrowser ? battBrowser.charging : null;
  reteTesto("tab-batt", batt == null ? "–" : String(batt));
  reteTesto("tab-carica", t ? (STATI_BATT[t.stato] || "batteria") : inCarica == null ? "batteria" : inCarica ? "in carica" : "a batteria");
  var temp = t && typeof t.temperatura === "number" ? t.temperatura : null;
  reteTesto("tab-temp", temp == null ? "–" : temp.toFixed(1));
  $("tab-temp").className = "n" + (temp != null && temp >= 40 ? " caldo" : "");
  var righe = [];
  if (t && t.salute) righe.push(["Salute batteria", SALUTE_BATT[t.salute] || t.salute.toLowerCase()]);
  if (extra.acceso_da) righe.push(["Acceso da", durata(extra.acceso_da)]);
  if (extra.ram_totale) righe.push(["RAM libera", (extra.ram_libera / 1024).toFixed(1) + " di " + (extra.ram_totale / 1024).toFixed(1) + " GB"]);
  if (extra.disco_totale) righe.push(["Spazio libero", extra.disco_libero + " di " + extra.disco_totale + " GB"]);
  var dl = $("tab-dati"); dl.innerHTML = "";
  righe.forEach(function (r) { var dt = el("dt"), dd = el("dd"); dt.textContent = r[0]; dd.textContent = r[1]; dl.appendChild(dt); dl.appendChild(dd); });
  // avvisi
  var st = $("tab-stato"), nota = "", livello = "ok", testo = "tutto ok";
  if (temp != null && temp >= 42) { livello = "no"; testo = "caldo"; nota = "Si sta scaldando parecchio: allontanalo da fornelli, forno e sole diretto."; }
  else if (t && t.salute && t.salute !== "GOOD") { livello = "no"; testo = "batteria"; nota = "Android segnala la batteria come \"" + (SALUTE_BATT[t.salute] || t.salute) + "\"."; }
  else if (extra.pieno_da && Date.now() / 1000 - extra.pieno_da > 24 * 3600) {
    livello = "no"; testo = "sempre al 100%";
    nota = "In carica al 100% da " + durata(Date.now() / 1000 - extra.pieno_da) + ": se nelle impostazioni c'è \"Proteggi batteria\" o un limite di carica (85%), attivalo.";
  } else if (batt != null && !inCarica && batt < 20) { livello = "no"; testo = "batteria bassa"; nota = "Il tablet non è in carica e la batteria è sotto il 20%."; }
  if (!t) nota = (nota ? nota + " " : "") + "Per temperatura e salute della batteria installa l'app Termux:API da F-Droid.";
  if (batt == null && !extra.acceso_da) { livello = ""; testo = "–"; }
  st.textContent = testo; st.className = "pillola" + (livello ? " " + livello : "");
  $("tab-nota").textContent = nota;
}

function avviaRete() {
  if (navigator.getBattery) navigator.getBattery().then(function (b) {
    battBrowser = b; disegnaTablet();
    ["levelchange", "chargingchange"].forEach(function (e) { b.addEventListener(e, disegnaTablet); });
  }).catch(function () {});
  disegnaTablet();
  $("disp-altri").onclick = function () { dispTutti = !dispTutti; disegnaDispositivi(); };
  leggiDispositivi(); setInterval(function () { if (document.visibilityState === "visible") leggiDispositivi(); }, 60 * 1000);
  $("rete-misura").onclick = misuraVelocita;
  window.addEventListener("online", function () { disegnaRete(); misuraLatenza(); });
  window.addEventListener("offline", disegnaRete);
  var c = navigator.connection; if (c && c.addEventListener) c.addEventListener("change", disegnaRete);
  disegnaRete();
  misuraLatenza(); setInterval(misuraLatenza, 60 * 1000);
  if (!reteInfo || Date.now() - reteInfo.quando > 30 * 60 * 1000) leggiInfoRete();
  setInterval(leggiInfoRete, 30 * 60 * 1000);
  setInterval(disegnaRete, 30 * 1000);   // aggiorna "x min fa"
}
