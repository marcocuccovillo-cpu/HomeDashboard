// HomeDashboard — parte comune a index.html (tablet) e telefono.html:
// dati (turni, nomi, promemoria, spesa), calcolo dei turni e sincronizzazione tra dispositivi.
// Ogni pagina può definire: ridisegna() dopo un aggiornamento arrivato da un altro dispositivo,
// occupato() per rimandarlo, mostraStatoSync() per mostrare lo stato del collegamento.

// ================= impostazioni base =================
var LAT = 44.4949, LON = 11.3426;      // Bologna
var NOTTE_DA = 22, NOTTE_A = 7;        // tema scuro in queste ore
var GIORNI = ["domenica","lunedì","martedì","mercoledì","giovedì","venerdì","sabato"];
var GIORNI_LUN = ["Lun","Mar","Mer","Gio","Ven","Sab","Dom"];
var GIORNI_LUN_LUNGHI = ["lunedì","martedì","mercoledì","giovedì","venerdì","sabato","domenica"];
var MESI = ["gennaio","febbraio","marzo","aprile","maggio","giugno","luglio","agosto","settembre","ottobre","novembre","dicembre"];
var COLORI = ["giallo", "rosa", "verde", "azzurro", "arancio", "lilla"];

function leggi(k, def) { try { var v = JSON.parse(localStorage.getItem(k)); return v == null ? def : v; } catch (e) { return def; } }
var CONDIVISI = { cucina_cfg: 1, cucina_note: 1, cucina_spesa: 1 };   // dati che si sincronizzano
function salva(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} if (CONDIVISI[k]) cambiato(); }
function nuovoId() { return Date.now() * 1000 + Math.floor(Math.random() * 1000); }
function $(id) { return document.getElementById(id); }
function el(tag, cls) { var e = document.createElement(tag); if (cls) e.className = cls; return e; }
function due(n) { return (n < 10 ? "0" : "") + n; }
function isNotte() { var h = new Date().getHours(); return h >= NOTTE_DA || h < NOTTE_A; }

function vuotaSett() { var s = []; for (var i = 0; i < 7; i++) s.push(["", ""]); return s; }
var cfg = leggi("cucina_cfg", {});
cfg.nomi = cfg.nomi || ["Marco", "Lei"];
cfg.fotoAttesa = cfg.fotoAttesa || 5; cfg.fotoOgni = cfg.fotoOgni || 12;
cfg.ancora = cfg.ancora || null;              // { lunedi: "YYYY-MM-DD", sett: "A" }
cfg.turni = cfg.turni || { A: vuotaSett(), B: vuotaSett() };
cfg.eccezioni = cfg.eccezioni || {};
// schermo sempre acceso: sì sul tablet, no di default sui telefoni (batteria)
if (cfg.schermoAcceso == null) cfg.schermoAcceso = Math.min(screen.width, screen.height) >= 600;
function salvaCfg() { salva("cucina_cfg", cfg); }

// ================= turni bisettimanali (calcolo) =================
function lunedi(d) { var x = new Date(d.getFullYear(), d.getMonth(), d.getDate()); x.setDate(x.getDate() - (x.getDay() + 6) % 7); return x; }
function iso(d) { return d.getFullYear() + "-" + due(d.getMonth() + 1) + "-" + due(d.getDate()); }
function daIso(s) { var p = s.split("-"); return new Date(+p[0], +p[1] - 1, +p[2]); }
function piuGiorni(d, n) { var x = new Date(d); x.setDate(x.getDate() + n); return x; }
function quale(d) {   // "A" o "B" per la data d
  if (!cfg.ancora) { cfg.ancora = { lunedi: iso(lunedi(new Date())), sett: "A" }; cfg.ancoraAuto = true; salvaCfg(); }
  var diff = Math.round((lunedi(d) - daIso(cfg.ancora.lunedi)) / (7 * 864e5));
  var pari = ((diff % 2) + 2) % 2 === 0;
  return pari ? cfg.ancora.sett : (cfg.ancora.sett === "A" ? "B" : "A");
}
function chiaveEcc(d, p) { return iso(d) + "|" + p; }
function haEccezione(d, p) { return Object.prototype.hasOwnProperty.call(cfg.eccezioni, chiaveEcc(d, p)); }
function turno(d, p) {
  if (haEccezione(d, p)) return cfg.eccezioni[chiaveEcc(d, p)];
  return cfg.turni[quale(d)][(d.getDay() + 6) % 7][p] || "";
}
function pulisciEccezioni() {   // toglie le eccezioni più vecchie di 2 settimane
  var limite = iso(piuGiorni(new Date(), -14));
  Object.keys(cfg.eccezioni).forEach(function (k) { if (k.slice(0, 10) < limite) delete cfg.eccezioni[k]; });
}

// ================= promemoria e spesa (dati) =================
var COLORI_HEX = { giallo: "#fbe38b", rosa: "#f7c4cf", verde: "#c9e5ad", azzurro: "#bcdcf0", arancio: "#fbcd9c", lilla: "#d9cbf0" };
var note = leggi("cucina_note", null);
if (!note) {   // recupera i vecchi promemoria a lista
  note = leggi("cucina_promemoria", []).filter(function (v) { return !v.fatto; }).map(function (v, i) {
    return { id: Date.now() + i, testo: v.testo, colore: COLORI[i % COLORI.length] };
  });
  salva("cucina_note", note);
}
var spesa = leggi("cucina_spesa", []);
spesa.forEach(function (v, i) { if (!v.id) v.id = Date.now() * 1000 + i; });

// ================= sincronizzazione tra dispositivi (file dati.json nel ramo "dati" del repository) =================
// Ogni dato è una voce separata con l'ora dell'ultima modifica: se due persone cambiano cose diverse
// nello stesso momento non si perde niente; se cambiano la stessa cosa vince l'ultima modifica.
var REPO = (function () {
  var h = location.hostname, seg = location.pathname.split("/")[1];
  return /\.github\.io$/.test(h) && seg ? h.split(".")[0] + "/" + seg : "marcocuccovillo-cpu/HomeDashboard";
})();
var API = "https://api.github.com/repos/" + REPO, RAMO = "dati", FILE = "dati.json";
var NOMI_DEF = ["Marco", "Lei"], MESE_MS = 30 * 864e5;
var token = leggi("cucina_token", "");
var reg = leggi("cucina_registro", null), base = null, regPronto = false;
var remoto = { etag: "", sha: null, reg: {} }, syncInCorso = false, syncAncora = false, tPush = null, daApplicare = false;

function stabile(v) {   // JSON con le chiavi in ordine, per confrontare
  if (v === undefined) return "";
  if (v === null || typeof v !== "object") return JSON.stringify(v);
  if (Array.isArray(v)) return "[" + v.map(stabile).join(",") + "]";
  return "{" + Object.keys(v).sort().map(function (k) { return JSON.stringify(k) + ":" + stabile(v[k]); }).join(",") + "}";
}
function piatto() {   // tutti i dati condivisi come elenco chiave → valore
  var f = { "nomi.0": cfg.nomi[0], "nomi.1": cfg.nomi[1] };
  if (cfg.ancora && !cfg.ancoraAuto) f.ancora = cfg.ancora;
  ["A", "B"].forEach(function (s) { cfg.turni[s].forEach(function (g, gi) { g.forEach(function (v, p) { f["turni." + s + "." + gi + "." + p] = v || ""; }); }); });
  Object.keys(cfg.eccezioni).forEach(function (k) { f["ecc." + k] = cfg.eccezioni[k]; });
  note.forEach(function (n, i) { f["nota." + n.id] = { testo: n.testo, colore: n.colore, pos: i }; });
  spesa.forEach(function (v, i) { f["spesa." + v.id] = { testo: v.testo, fatto: !!v.fatto, pos: i }; });
  return f;
}
function predefinito(k, v) { return (k === "nomi.0" && v === NOMI_DEF[0]) || (k === "nomi.1" && v === NOMI_DEF[1]) || (k.indexOf("turni.") === 0 && v === ""); }
function avviaRegistro() {
  base = piatto();
  if (!reg) {   // primo avvio: i dati già presenti valgono come "vecchissimi", così non sovrascrivono quelli condivisi
    reg = {};
    Object.keys(base).forEach(function (k) { if (!predefinito(k, base[k])) reg[k] = { v: base[k], t: 1 }; });
    salva("cucina_registro", reg);
  } else {
    var vecchia = leggi("cucina_base", null);
    if (vecchia) { var ora = base; base = vecchia; regPronto = true; registra(); base = ora; }
  }
  salva("cucina_base", base); regPronto = true;
}
function registra() {   // confronta lo stato attuale con l'ultimo noto e annota cosa è cambiato
  if (!regPronto) return false;
  var ora = piatto(), t = Date.now(), cambi = false, chiavi = {};
  Object.keys(ora).concat(Object.keys(base)).forEach(function (k) { chiavi[k] = 1; });
  Object.keys(chiavi).forEach(function (k) {
    if (stabile(ora[k]) === stabile(base[k])) return;
    reg[k] = (k in ora) ? { v: ora[k], t: t } : { d: 1, t: t }; cambi = true;
  });
  base = ora;
  if (cambi) { salva("cucina_registro", reg); salva("cucina_base", base); }
  return cambi;
}
function cambiato() {
  if (!regPronto) return;
  registra();
  if (token) { clearTimeout(tPush); tPush = setTimeout(sincronizza, 1200); }
}
function unisci(a, b) {
  var r = {}, limite = Date.now() - MESE_MS;
  [a, b].forEach(function (x) {
    Object.keys(x).forEach(function (k) {
      var e = x[k], c = r[k];
      if (!c || e.t > c.t || (e.t === c.t && stabile(e) > stabile(c))) r[k] = e;
    });
  });
  Object.keys(r).forEach(function (k) { if (r[k].d && r[k].t < limite) delete r[k]; });
  return r;
}
function applica() {   // ricostruisce turni, nomi, note e spesa dal registro
  daApplicare = false;
  registra();
  function val(k) { var e = reg[k]; return e && !e.d ? e : null; }
  cfg.nomi = [0, 1].map(function (p) { var e = val("nomi." + p); return e ? e.v : NOMI_DEF[p]; });
  if (val("ancora")) { cfg.ancora = val("ancora").v; cfg.ancoraAuto = false; }
  ["A", "B"].forEach(function (s) { for (var g = 0; g < 7; g++) for (var p = 0; p < 2; p++) { var e = val("turni." + s + "." + g + "." + p); cfg.turni[s][g][p] = e ? e.v : ""; } });
  cfg.eccezioni = {};
  var nn = [], ss = [];
  Object.keys(reg).forEach(function (k) {
    var e = val(k); if (!e) return;
    if (k.indexOf("ecc.") === 0) cfg.eccezioni[k.slice(4)] = e.v;
    else if (k.indexOf("nota.") === 0) nn.push({ id: +k.slice(5), testo: e.v.testo, colore: e.v.colore, pos: e.v.pos });
    else if (k.indexOf("spesa.") === 0) ss.push({ id: +k.slice(6), testo: e.v.testo, fatto: e.v.fatto, pos: e.v.pos });
  });
  function ordina(a, b) { return a.pos - b.pos || a.id - b.id; }
  note = nn.sort(ordina).map(function (n) { return { id: n.id, testo: n.testo, colore: n.colore }; });
  spesa = ss.sort(ordina).map(function (v) { return { id: v.id, testo: v.testo, fatto: v.fatto }; });
  regPronto = false;   // salvataggi senza registrare: sono già nel registro
  salvaCfg(); salva("cucina_note", note); salva("cucina_spesa", spesa);
  base = piatto(); salva("cucina_base", base); regPronto = true;
  if (window.ridisegna) ridisegna();
}
function puoApplicare() {
  var tag = document.activeElement ? document.activeElement.tagName : "";
  return !(window.occupato && occupato()) && !document.querySelector(".scuro.on") && tag !== "INPUT" && tag !== "TEXTAREA";
}
function b64(s) { return btoa(unescape(encodeURIComponent(s))); }
function da64(s) { return decodeURIComponent(escape(atob(s.replace(/\s/g, "")))); }
function gh(metodo, percorso, corpo, extra) {
  var h = { Authorization: "Bearer " + token, Accept: "application/vnd.github+json" };
  for (var k in extra || {}) h[k] = extra[k];
  return fetch(API + percorso, { method: metodo, headers: h, cache: "no-store", body: corpo ? JSON.stringify(corpo) : undefined });
}
function errore(r) { var e = new Error("HTTP " + r.status); e.status = r.status; return e; }
function leggiRemoto() {
  return gh("GET", "/contents/" + FILE + "?ref=" + RAMO, null, remoto.etag ? { "If-None-Match": remoto.etag } : null).then(function (r) {
    if (r.status === 304) return;
    if (r.status === 404) { remoto = { etag: "", sha: null, reg: {} }; return; }
    if (!r.ok) throw errore(r);
    remoto.etag = r.headers.get("ETag") || "";
    return r.json().then(function (j) {
      remoto.sha = j.sha;
      try { remoto.reg = JSON.parse(da64(j.content)).registro || {}; } catch (e) { remoto.reg = {}; }
    });
  });
}
function scriviRemoto(dati) {
  var testo = JSON.stringify({ app: "cucina", versione: 1, aggiornato: new Date().toISOString(), registro: dati }, null, 1);
  if (remoto.sha) {
    return gh("PUT", "/contents/" + FILE, { message: "Aggiorna dati", content: b64(testo), sha: remoto.sha, branch: RAMO }).then(function (r) {
      if (!r.ok) throw errore(r);
      return r.json().then(function (j) { remoto.sha = j.content.sha; remoto.etag = ""; remoto.reg = dati; });
    });
  }
  // il ramo "dati" non esiste ancora: lo creo con un primo commit che contiene solo dati.json
  return gh("POST", "/git/trees", { tree: [{ path: FILE, mode: "100644", type: "blob", content: testo }] }).then(function (r) {
    if (!r.ok) throw errore(r); return r.json();
  }).then(function (t) {
    return gh("POST", "/git/commits", { message: "Dati della dashboard", tree: t.sha, parents: [] });
  }).then(function (r) {
    if (!r.ok) throw errore(r); return r.json();
  }).then(function (c) {
    return gh("POST", "/git/refs", { ref: "refs/heads/" + RAMO, sha: c.sha });
  }).then(function (r) {
    if (r.status === 422) { var e = new Error("conflitto"); e.status = 409; throw e; }   // creato nel frattempo da un altro dispositivo
    if (!r.ok) throw errore(r);
    remoto.etag = ""; remoto.reg = dati;
    return leggiRemoto();
  });
}
var ultimaSync = 0, erroreSync = "";
function sincronizza(tentativo) {
  if (!token) return Promise.resolve();
  if (syncInCorso) { syncAncora = true; return Promise.resolve(); }
  syncInCorso = true; tentativo = tentativo || 0;
  registra();
  return leggiRemoto().then(function () {
    var prima = stabile(reg), unito = unisci(reg, remoto.reg);
    var dalRemoto = stabile(unito) !== prima;
    reg = unito; salva("cucina_registro", reg);
    if (dalRemoto) { if (puoApplicare()) applica(); else daApplicare = true; }
    if (stabile(unito) !== stabile(remoto.reg)) return scriviRemoto(unito);
  }).then(function () {
    ultimaSync = Date.now(); erroreSync = "";
  }).catch(function (e) {
    if ((e.status === 409 || e.status === 422) && tentativo < 3) { syncInCorso = false; remoto.etag = ""; return sincronizza(tentativo + 1); }
    erroreSync = e.status === 401 ? "Il codice non è valido o è scaduto: ricollega il dispositivo."
      : e.status === 403 || e.status === 404 ? "Il codice non ha il permesso \"Contents: Read and write\" su HomeDashboard."
      : navigator.onLine === false ? "Nessuna connessione, riprovo tra poco." : "Non riesco a sincronizzare (" + (e.message || "errore") + "), riprovo tra poco.";
  }).then(function () {
    syncInCorso = false; mostraStato();
    if (syncAncora) { syncAncora = false; sincronizza(); }
  });
}
function mostraStato() { if (window.mostraStatoSync) mostraStatoSync(); }
function collega(t) {
  t = (t || "").trim(); if (!t) return;
  token = t; salva("cucina_token", token); remoto = { etag: "", sha: null, reg: {} }; erroreSync = "";
  mostraStato(); sincronizza();
}
function scollega() { token = ""; salva("cucina_token", ""); erroreSync = ""; ultimaSync = 0; mostraStato(); }
function cartella() { return location.origin + location.pathname.replace(/[^/]*$/, ""); }
function linkTelefono() { return cartella() + "telefono.html#collega=" + encodeURIComponent(token); }
(function () {   // link "Collega un altro telefono": il codice arriva nell'indirizzo dopo #collega=
  var m = location.hash.match(/^#collega=(.+)$/);
  if (m) { salva("cucina_token", decodeURIComponent(m[1])); token = leggi("cucina_token", ""); history.replaceState(null, "", location.pathname + location.search); }
})();

function avviaSync() {   // da chiamare dopo aver disegnato la pagina
  salva("cucina_spesa", spesa);
  avviaRegistro();
  pulisciEccezioni(); salvaCfg();
  mostraStato(); sincronizza();
  setInterval(function () { if (document.visibilityState === "visible") sincronizza(); }, 10 * 1000);   // ogni 10 secondi
  document.addEventListener("visibilitychange", function () { if (document.visibilityState === "visible") sincronizza(); });
  setInterval(function () { if (daApplicare && puoApplicare()) applica(); }, 1000);
}

// ================= foto condivise (cartella foto/ nel ramo "dati") =================
// Il telefono le carica, il tablet le scarica e le mostra a rotazione.
function rimpicciolisci(file) {   // max 1600px, jpeg: occupa poco spazio
  return new Promise(function (ok) {
    var img = new Image(), url = URL.createObjectURL(file);
    img.onload = function () {
      var k = Math.min(1, 1600 / Math.max(img.width, img.height));
      var c = document.createElement("canvas"); c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
      c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url); c.toBlob(ok, "image/jpeg", 0.85);
    };
    img.onerror = function () { URL.revokeObjectURL(url); ok(null); };
    img.src = url;
  });
}
function blobA64(blob) {
  return new Promise(function (ok, ko) {
    var r = new FileReader();
    r.onload = function () { ok(String(r.result).split(",")[1]); }; r.onerror = function () { ko(r.error); };
    r.readAsDataURL(blob);
  });
}
function b64ABlob(b64, tipo) {
  var bin = atob(b64.replace(/\s/g, "")), a = new Uint8Array(bin.length);
  for (var i = 0; i < bin.length; i++) a[i] = bin.charCodeAt(i);
  return new Blob([a], { type: tipo || "image/jpeg" });
}
function listaFotoRemote() {   // [{name, sha, path, download_url}]
  if (!token) return Promise.resolve([]);
  return gh("GET", "/contents/foto?ref=" + RAMO).then(function (r) {
    if (r.status === 404) return [];
    if (!r.ok) throw errore(r);
    return r.json().then(function (l) { return l.filter(function (x) { return x.type === "file" && /\.jpe?g$/i.test(x.name); }); });
  });
}
function caricaFotoRemota(blob) {   // resolve con {name, sha}
  var nome = nuovoId() + ".jpg";
  var ramo = remoto.sha ? Promise.resolve() : sincronizza();   // al primo uso crea il ramo "dati"
  return ramo.then(function () { return blobA64(blob); }).then(function (b) {
    return gh("PUT", "/contents/foto/" + nome, { message: "Aggiungi foto", content: b, branch: RAMO });
  }).then(function (r) {
    if (!r.ok) throw errore(r);
    return r.json().then(function (j) { return { name: nome, sha: j.content.sha }; });
  });
}
function scaricaFotoRemota(f) {
  return gh("GET", "/git/blobs/" + f.sha).then(function (r) {
    if (!r.ok) throw errore(r);
    return r.json().then(function (j) { return b64ABlob(j.content); });
  });
}
function eliminaFotoRemota(f) {
  return gh("DELETE", "/contents/foto/" + f.name, { message: "Togli foto", sha: f.sha, branch: RAMO }).then(function (r) {
    if (!r.ok && r.status !== 404) throw errore(r);
  });
}
