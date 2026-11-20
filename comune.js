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
var CONDIVISI = { cucina_cfg: 1, cucina_note: 1, cucina_spesa: 1, cucina_viaggi: 1 };   // dati che si sincronizzano
function salva(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} if (CONDIVISI[k]) cambiato(); }
try { ["cam_comodino", "cam_tablet", "cam_server", "cam_nome", "cam_turn"].forEach(function (k) { localStorage.removeItem(k); }); } catch (e) {}   // telecamere tolte: via anche le password salvate
function nuovoId() { return Date.now() * 1000 + Math.floor(Math.random() * 1000); }
function $(id) { return document.getElementById(id); }
function el(tag, cls) { var e = document.createElement(tag); if (cls) e.className = cls; return e; }
function due(n) { return (n < 10 ? "0" : "") + n; }
function isNotte() { var h = new Date().getHours(); return h >= NOTTE_DA || h < NOTTE_A; }

function vuotaSett() { var s = []; for (var i = 0; i < 7; i++) s.push(["", ""]); return s; }
var cfg = leggi("cucina_cfg", {});
cfg.nomi = cfg.nomi || ["Marco", "Lei"];
cfg.fotoOgni = cfg.fotoOgni || 12;
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

// ================= orari dei turni: lettura e "Adesso" =================
var ORA_RE = /(\d{1,2})(?:[:.](\d{2}))?\s*[-–]\s*(\d{1,2})(?:[:.](\d{2}))?/g;
function hhmm(h, m) { return (h.length < 2 ? "0" : "") + h + ":" + (m || "00"); }
function leggiFasce(v) {   // "8:30-14.30 / 18:30 - 22:30" → [["08:30","14:30"],["18:30","22:30"]]
  var f = [], m; ORA_RE.lastIndex = 0;
  while ((m = ORA_RE.exec(v || ""))) f.push([hhmm(m[1], m[2]), hhmm(m[3], m[4])]);
  return f;
}
function scriviFasce(f) {
  function corta(t) { return t.replace(/^0/, ""); }
  return f.filter(function (x) { return x[0] && x[1]; }).map(function (x) { return corta(x[0]) + "–" + corta(x[1]); }).join(" / ");
}
function ordinato(v) {   // "8:30 -14.30\n18:30 - 22:30" → "8:30–14:30 / 18:30–22:30" (se non si legge, resta com'è)
  return scriviFasce(leggiFasce(v)) || v || "";
}
function minuti(t) { var p = t.split(":"); return +p[0] * 60 + +p[1]; }
function oraDa(m) { m = ((m % 1440) + 1440) % 1440; return Math.floor(m / 60) + ":" + due(m % 60); }
function fasceGiorno(d, p) {   // fasce del giorno in minuti; un turno che passa la mezzanotte finisce oltre 1440
  return leggiFasce(turno(d, p)).map(function (f) { var a = minuti(f[0]), b = minuti(f[1]); if (b <= a) b += 1440; return [a, b]; })
    .sort(function (x, y) { return x[0] - y[0]; });
}
// Cosa sta facendo adesso la persona p: { stato: "lavoro" | "dopo" | "riposo" | "altro", cosa: "al lavoro fino alle 14:30" }
function statoAdesso(p, ora) {
  ora = ora || new Date();
  var oggi = new Date(ora.getFullYear(), ora.getMonth(), ora.getDate()), m = ora.getHours() * 60 + ora.getMinutes();
  var notte = fasceGiorno(piuGiorni(oggi, -1), p).filter(function (f) { return f[1] > 1440 && m < f[1] - 1440; });
  if (notte.length) return { stato: "lavoro", cosa: "al lavoro fino alle " + oraDa(notte[0][1]) };
  var v = turno(oggi, p), fo = fasceGiorno(oggi, p);
  if (v && !fo.length) return { stato: "altro", cosa: "oggi: " + v.replace(/\s*\n\s*/g, " ") };
  for (var i = 0; i < fo.length; i++) {
    var f = fo[i];
    if (m >= f[0] && m < f[1]) {
      var poi = fo[i + 1];
      return { stato: "lavoro", cosa: "al lavoro fino alle " + oraDa(f[1]) + (poi ? " · poi dalle " + oraDa(poi[0]) : "") };
    }
    if (m < f[0]) return { stato: "dopo", cosa: (i ? "in pausa · riattacca alle " : "attacca alle ") + oraDa(f[0]) };
  }
  var pre = fo.length ? "ha finito" : "a riposo";
  for (var g = 1; g <= 7; g++) {
    var d = piuGiorni(oggi, g), fd = fasceGiorno(d, p), vd = turno(d, p);
    if (!vd) continue;
    var quando = g === 1 ? "domani" : GIORNI[d.getDay()];
    return { stato: "riposo", cosa: pre + " · " + quando + (fd.length ? " alle " + oraDa(fd[0][0]) : ": " + vd.replace(/\s*\n\s*/g, " ")) };
  }
  return { stato: "riposo", cosa: pre };
}

// ================= tempo per noi: giorni e serate libere per tutti e due =================
var SERA_DA = 19 * 60 + 30, SERA_A = 23 * 60;   // "sera libera" = nessun turno tra le 19:30 e le 23
function seraOccupata(d, p) {
  var v = turno(d, p); if (!v) return false;
  var f = fasceGiorno(d, p);
  if (!f.length) return true;   // orario scritto a mano che non si legge: meglio non promettere la serata
  return f.some(function (x) { return x[1] > SERA_DA && x[0] < SERA_A; });
}
function insieme(d) {   // "giorno" se liberi tutto il giorno, "sera" se liberi la sera, altrimenti ""
  if (!turno(d, 0) && !turno(d, 1)) return "giorno";
  return !seraOccupata(d, 0) && !seraOccupata(d, 1) ? "sera" : "";
}
function prossimoGiornoInsieme(da) {   // fino a 8 settimane avanti (i turni si ripetono ogni 2)
  for (var i = 0; i < 56; i++) { var d = piuGiorni(da, i); if (insieme(d) === "giorno") return d; }
  return null;
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
var viaggi = leggi("cucina_viaggi", []);   // [{id, nome, paese, lat, lon, stato: "fatto"|"sogno", data: "YYYY-MM-DD"|""}]

// ================= sincronizzazione tra dispositivi (dati.json cifrato nel ramo "cassaforte" del repository) =================
// Ogni dato è una voce separata con l'ora dell'ultima modifica: se due persone cambiano cose diverse
// nello stesso momento non si perde niente; se cambiano la stessa cosa vince l'ultima modifica.
var REPO = (function () {
  var h = location.hostname, seg = location.pathname.split("/")[1];
  return /\.github\.io$/.test(h) && seg ? h.split(".")[0] + "/" + seg : "marcocuccovillo-cpu/HomeDashboard";
})();
var API = "https://api.github.com/repos/" + REPO, FILE = "dati.json", CHIAVE = "chiave.json";
var RAMO = "cassaforte", RAMO_VECCHIO = "dati";   // "dati" era il ramo in chiaro, sostituito da quello cifrato
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
  note.forEach(function (n, i) {
    var v = { testo: n.testo, colore: n.colore, pos: i };
    if (typeof n.x === "number") { v.x = n.x; v.y = n.y; }   // dove è attaccato sul tablet
    f["nota." + n.id] = v;
  });
  spesa.forEach(function (v, i) { var x = { testo: v.testo, fatto: !!v.fatto, pos: i }; if (v.negozio) x.negozio = v.negozio; f["spesa." + v.id] = x; });   // il negozio va con il prodotto
  viaggi.forEach(function (v) { f["viaggio." + v.id] = { nome: v.nome, paese: v.paese || "", lat: v.lat, lon: v.lon, stato: v.stato, data: v.data || "" }; });
  if (cfg.forza4) f["gioco.forza4"] = cfg.forza4;
  if (cfg.tris) f["gioco.tris"] = cfg.tris;
  if (cfg.reteCasa) f["rete.casa"] = cfg.reteCasa;
  (cfg.eventi || []).forEach(function (e) { f["evento." + e.id] = { data: e.data, ora: e.ora || "", testo: e.testo }; });   // appuntamenti del calendario
  if (cfg.statoTablet) f["tablet.stato"] = cfg.statoTablet;
  if (cfg.dama) f["gioco.dama"] = cfg.dama;
  if (cfg.record) Object.keys(cfg.record).forEach(function (g) {   // record di ognuno su una chiave sua: due telefoni non si pestano
    [0, 1].forEach(function (p) { if (cfg.record[g][p]) f["gioco.record." + g + "." + p] = cfg.record[g][p]; });
  });
  if (cfg.tragitti) {   // casa, lavori, mezzi e chiave TomTom: ognuno per conto suo, così due modifiche non si pestano
    var tr = cfg.tragitti;
    if (tr.casa) f["tragitto.casa"] = tr.casa;
    [0, 1].forEach(function (p) { if (tr.lavoro && tr.lavoro[p]) f["tragitto.lavoro." + p] = tr.lavoro[p]; if (tr.mezzo) f["tragitto.mezzo." + p] = tr.mezzo[p]; });
    if (tr.chiave) f["tragitto.chiave"] = tr.chiave;
  }
  if (cfg.bus) { if (cfg.bus.fermate && cfg.bus.fermate.length) f["bus.fermate"] = cfg.bus.fermate; if (cfg.bus.linee) f["bus.linee"] = cfg.bus.linee; }
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
  if (token && chiaveCripto) { clearTimeout(tPush); tPush = setTimeout(sincronizza, 1200); }
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
  var nn = [], ss = [], vv = [];
  if (val("gioco.forza4")) cfg.forza4 = val("gioco.forza4").v;
  if (val("gioco.tris")) cfg.tris = val("gioco.tris").v;
  if (val("rete.casa")) cfg.reteCasa = val("rete.casa").v;
  cfg.eventi = Object.keys(reg).filter(function (k) { return k.indexOf("evento.") === 0 && val(k); })
    .map(function (k) { var v = val(k).v; return { id: +k.slice(7), data: v.data, ora: v.ora || "", testo: v.testo }; });
  if (val("tablet.stato")) cfg.statoTablet = val("tablet.stato").v;
  if (val("gioco.dama")) cfg.dama = val("gioco.dama").v;
  cfg.record = {};   // record di qualsiasi gioco: "gioco.record.<gioco>.<persona>"
  Object.keys(reg).forEach(function (k) {
    var m = /^gioco\.record\.(.+)\.([01])$/.exec(k), e = m && val(k); if (!e) return;
    cfg.record[m[1]] = cfg.record[m[1]] || [0, 0]; cfg.record[m[1]][+m[2]] = e.v;
  });
  var tv = function (k) { var e = val("tragitto." + k); return e ? e.v : null; };
  cfg.bus = { fermate: val("bus.fermate") ? val("bus.fermate").v : [], linee: val("bus.linee") ? val("bus.linee").v : "" };
  cfg.tragitti = { casa: tv("casa"), lavoro: [tv("lavoro.0"), tv("lavoro.1")], mezzo: [tv("mezzo.0") || "auto", tv("mezzo.1") || "auto"], chiave: tv("chiave") || "" };
  Object.keys(reg).forEach(function (k) {
    var e = val(k); if (!e) return;
    if (k.indexOf("ecc.") === 0) cfg.eccezioni[k.slice(4)] = e.v;
    else if (k.indexOf("nota.") === 0) nn.push({ id: +k.slice(5), testo: e.v.testo, colore: e.v.colore, pos: e.v.pos, x: e.v.x, y: e.v.y });
    else if (k.indexOf("spesa.") === 0) ss.push({ id: +k.slice(6), testo: e.v.testo, fatto: e.v.fatto, pos: e.v.pos, negozio: e.v.negozio });
    else if (k.indexOf("viaggio.") === 0) { var v = e.v; v.id = +k.slice(8); vv.push(v); }
  });
  function ordina(a, b) { return a.pos - b.pos || a.id - b.id; }
  note = nn.sort(ordina).map(function (n) { var o = { id: n.id, testo: n.testo, colore: n.colore }; if (typeof n.x === "number") { o.x = n.x; o.y = n.y; } return o; });
  spesa = ss.sort(ordina).map(function (v) { var o = { id: v.id, testo: v.testo, fatto: v.fatto }; if (v.negozio) o.negozio = v.negozio; return o; });
  regPronto = false;   // salvataggi senza registrare: sono già nel registro
  viaggi = vv.sort(function (a, b) { return a.id - b.id; });
  salvaCfg(); salva("cucina_note", note); salva("cucina_spesa", spesa); salva("cucina_viaggi", viaggi);
  base = piatto(); salva("cucina_base", base); regPronto = true;
  if (window.ridisegna) ridisegna();
}
function puoApplicare() {
  var a = document.activeElement, tag = a ? a.tagName : "";
  if (a && a.classList && a.classList.contains("sp-input")) tag = "";   // il campo della spesa non viene toccato dagli aggiornamenti
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

// ================= cifratura (AES-GCM, chiave ricavata dalla password con PBKDF2) =================
// Formato di ogni dato cifrato: 12 byte di IV + testo cifrato con il suo tag, il tutto in base64.
// Lo stesso formato lo usa strumenti/dispositivi.py.
var GIRI = 600000;                       // PBKDF2-SHA256: rende lento provare password a caso
var chiaveCripto = null;                 // CryptoKey AES-GCM, ricordata su questo dispositivo
function b64DaByte(buf) {
  var b = buf instanceof Uint8Array ? buf : new Uint8Array(buf), s = "", PEZZO = 0x8000;
  for (var i = 0; i < b.length; i += PEZZO) s += String.fromCharCode.apply(null, b.subarray(i, i + PEZZO));
  return btoa(s);
}
function byteDaB64(s) {
  var bin = atob(s.replace(/\s/g, "")), a = new Uint8Array(bin.length);
  for (var i = 0; i < bin.length; i++) a[i] = bin.charCodeAt(i);
  return a;
}
function derivaChiave(password, sale, giri) {
  return crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveKey"]).then(function (k) {
    return crypto.subtle.deriveKey({ name: "PBKDF2", salt: sale, iterations: giri, hash: "SHA-256" }, k,
      { name: "AES-GCM", length: 256 }, true, ["encrypt", "decrypt"]);
  });
}
function cifraByte(dati, chiave) {
  var iv = crypto.getRandomValues(new Uint8Array(12));
  return crypto.subtle.encrypt({ name: "AES-GCM", iv: iv }, chiave || chiaveCripto, dati).then(function (c) {
    var out = new Uint8Array(12 + c.byteLength); out.set(iv); out.set(new Uint8Array(c), 12); return out;
  });
}
function decifraByte(dati, chiave) {
  return crypto.subtle.decrypt({ name: "AES-GCM", iv: dati.subarray(0, 12) }, chiave || chiaveCripto, dati.subarray(12))
    .then(function (b) { return new Uint8Array(b); });
}
function cifraTesto(t, chiave) { return cifraByte(new TextEncoder().encode(t), chiave).then(b64DaByte); }
function decifraTesto(s, chiave) { return decifraByte(byteDaB64(s), chiave).then(function (b) { return new TextDecoder().decode(b); }); }
function caricaChiaveSalvata() {
  var s = leggi("cucina_chiave", "");
  if (!s) return Promise.resolve(null);
  return crypto.subtle.importKey("raw", byteDaB64(s), { name: "AES-GCM" }, true, ["encrypt", "decrypt"])
    .then(function (k) { chiaveCripto = k; return k; }, function () { return null; });
}
function ricordaChiave(k) {
  return crypto.subtle.exportKey("raw", k).then(function (raw) { salva("cucina_chiave", b64DaByte(raw)); chiaveCripto = k; });
}
function errCifra() { var e = new Error("chiave"); e.chiave = true; return e; }

// ================= dati condivisi (cifrati) =================
function leggiRemoto() {
  return gh("GET", "/contents/" + FILE + "?ref=" + RAMO, null, remoto.etag ? { "If-None-Match": remoto.etag } : null).then(function (r) {
    if (r.status === 304) return;
    if (r.status === 404) { remoto = { etag: "", sha: null, reg: {} }; return; }
    if (!r.ok) throw errore(r);
    var etag = r.headers.get("ETag") || "";
    return r.json().then(function (j) {
      var f = JSON.parse(da64(j.content));
      if (!f.dati) { remoto.sha = j.sha; remoto.reg = {}; remoto.etag = etag; return; }
      return decifraTesto(f.dati).then(function (t) {
        remoto.sha = j.sha; remoto.reg = JSON.parse(t).registro || {}; remoto.etag = etag;
      }, function () { throw errCifra(); });
    });
  });
}
function scriviRemoto(dati) {
  var testo = JSON.stringify({ app: "homedashboard", versione: 2, aggiornato: new Date().toISOString(), registro: dati });
  return cifraTesto(testo).then(function (c) {
    var corpo = { message: "Aggiorna dati", content: b64(JSON.stringify({ v: 2, dati: c })), branch: RAMO };
    if (remoto.sha) corpo.sha = remoto.sha;
    return gh("PUT", "/contents/" + FILE, corpo);
  }).then(function (r) {
    if (!r.ok) throw errore(r);
    return r.json().then(function (j) { remoto.sha = j.content.sha; remoto.etag = ""; remoto.reg = dati; });
  });
}
var ultimaSync = 0, erroreSync = "";
function sincronizza(tentativo) {
  if (!token || !chiaveCripto) return Promise.resolve();
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
    erroreSync = e.chiave ? "La password è stata cambiata: esci da questo dispositivo e rientra con quella nuova."
      : e.status === 401 ? "Il codice GitHub non è più valido (rigenerato o scaduto): in ⚙ premi \"Nuovo codice GitHub\" e incolla quello nuovo."
      : e.status === 403 ? "Il codice GitHub non ha il permesso \"Contents: Read and write\" su HomeDashboard."
      : navigator.onLine === false ? "Nessuna connessione, riprovo tra poco." : "Non riesco a sincronizzare (" + (e.message || "errore") + "), riprovo tra poco.";
  }).then(function () {
    syncInCorso = false; mostraStato();
    if (syncAncora) { syncAncora = false; sincronizza(); }
  });
}
function mostraStato() { if (window.mostraStatoSync) mostraStatoSync(); }
function esci() {   // dimentica password e codice su questo dispositivo
  try { localStorage.removeItem("cucina_chiave"); localStorage.removeItem("cucina_token"); } catch (e) {}
  location.reload();
}
function cartella() { return location.origin + location.pathname.replace(/[^/]*$/, ""); }
if (/^#collega=/.test(location.hash)) history.replaceState(null, "", location.pathname + location.search);   // vecchi link: non servono più

function avviaSync() {   // da chiamare dopo aver disegnato la pagina
  // browser troppo vecchio per la cifratura (es. iPad con iOS 9): la pagina gira da sola, senza i dati di casa
  if (!(window.crypto && crypto.subtle && window.TextEncoder)) { window.senzaCifratura = true; return; }
  salva("cucina_spesa", spesa);
  avviaRegistro();
  pulisciEccezioni(); salvaCfg();
  mostraStato();
  setInterval(function () { if (document.visibilityState === "visible") sincronizza(); }, 10 * 1000);   // ogni 10 secondi
  document.addEventListener("visibilitychange", function () { if (document.visibilityState === "visible") sincronizza(); });
  setInterval(function () { if (daApplicare && puoApplicare()) applica(); }, 1000);
  caricaChiaveSalvata().then(function (k) {
    if (k && token) { sbloccato(); return; }
    mostraLucchetto();
  });
}
function sbloccato() {
  var l = document.getElementById("lucchetto"); if (l) l.remove();
  remoto = { etag: "", sha: null, reg: {} };
  mostraStato(); sincronizza();
  if (window.dopoSblocco) dopoSblocco();
}

// ================= lucchetto: password di casa =================
// chiave.json (nel ramo "cassaforte", leggibile da tutti) contiene il sale e il codice GitHub cifrato:
// chi conosce la password ricava la chiave, decifra il codice e da lì legge e scrive tutto il resto.
function leggiCassaforte() {   // senza codice: basta che il repository sia pubblico
  return fetch(API + "/contents/" + CHIAVE + "?ref=" + RAMO, { cache: "no-store", headers: { Accept: "application/vnd.github+json" } }).then(function (r) {
    if (r.status === 404) return null;
    if (!r.ok) throw errore(r);
    return r.json().then(function (j) { return JSON.parse(da64(j.content)); });
  }).catch(function (e) {   // limite di richieste senza codice: provo la copia di raw.githubusercontent.com
    if (e && e.status === undefined) throw e;
    return fetch("https://raw.githubusercontent.com/" + REPO + "/" + RAMO + "/" + CHIAVE + "?t=" + Date.now(), { cache: "no-store" }).then(function (r) {
      if (r.status === 404) return null;
      if (!r.ok) throw errore(r);
      return r.json();
    });
  });
}
function entra(password, cassa) {
  return derivaChiave(password, byteDaB64(cassa.sale), cassa.giri).then(function (k) {
    return decifraTesto(cassa.token, k).then(function (t) {
      token = t; salva("cucina_token", t);
      return ricordaChiave(k);
    }, function () { throw new Error("Password sbagliata."); });
  });
}
var PASSI_CODICE = '<ol><li>Apri <a href="https://github.com/settings/personal-access-tokens/new" target="_blank" rel="noopener">questa pagina di GitHub</a></li>' +
  "<li>Repository access: <b>Only select repositories → HomeDashboard</b></li><li>Permissions: <b>Contents → Read and write</b></li>" +
  "<li>Scadenza la più lunga possibile, poi <b>Generate token</b> e incolla qui il codice</li></ol>";
function provaCodice(t) {   // resolve se il codice funziona, altrimenti errore con messaggio chiaro
  return fetch(API, { cache: "no-store", headers: { Authorization: "Bearer " + t, Accept: "application/vnd.github+json" } }).then(function (r) {
    if (r.status === 401) throw new Error("Questo codice GitHub non è valido (forse è stato rigenerato o è scaduto).");
    if (!r.ok) throw new Error("Il codice GitHub non vede il repository HomeDashboard: controlla \"Only select repositories\".");
  });
}
// Codice rigenerato o scaduto: salva quello nuovo (cifrato) in chiave.json. Serve la chiave già sbloccata.
function sostituisciCodice(nuovo) {
  nuovo = (nuovo || "").trim();
  if (!nuovo) return Promise.reject(new Error("Incolla il nuovo codice GitHub."));
  return provaCodice(nuovo).then(function () {
    token = nuovo;
    return gh("GET", "/contents/" + CHIAVE + "?ref=" + RAMO);
  }).then(function (r) { if (!r.ok) throw errore(r); return r.json(); }).then(function (j) {
    var cassa = JSON.parse(da64(j.content));
    return cifraTesto(nuovo).then(function (c) {
      cassa.token = c;
      return gh("PUT", "/contents/" + CHIAVE, { message: "Nuovo codice GitHub", content: b64(JSON.stringify(cassa, null, 1)), sha: j.sha, branch: RAMO });
    });
  }).then(function (r) {
    if (!r.ok) throw errore(r);
    salva("cucina_token", token); erroreSync = ""; remoto.etag = "";
  });
}
// Prima volta: crea la cassaforte, porta dentro (cifrati) i dati e le foto del vecchio ramo "dati" e poi lo elimina.
function creaCassaforte(password, avanza) {
  var sale = crypto.getRandomValues(new Uint8Array(16)), chiave;
  avanza("Preparo la chiave…");
  return provaCodice(token).then(function () {
    return derivaChiave(password, sale, GIRI);
  }).then(function (k) {
    chiave = k; chiaveCripto = k;
    avanza("Recupero i dati già condivisi…");
    return gh("GET", "/contents/" + FILE + "?ref=" + RAMO_VECCHIO).then(function (r) {
      if (!r.ok) return {};
      return r.json().then(function (j) { try { return JSON.parse(da64(j.content)).registro || {}; } catch (e) { return {}; } });
    });
  }).then(function (vecchio) {
    registra(); reg = unisci(reg, vecchio); salva("cucina_registro", reg); applica();   // mostra subito i dati recuperati
    return Promise.all([
      cifraTesto(token, chiave),
      cifraTesto(JSON.stringify({ app: "homedashboard", versione: 2, aggiornato: new Date().toISOString(), registro: reg }), chiave)
    ]);
  }).then(function (c) {
    avanza("Creo lo spazio cifrato…");
    var cassa = { v: 1, sale: b64DaByte(sale), giri: GIRI, token: c[0] };
    return gh("POST", "/git/trees", { tree: [
      { path: CHIAVE, mode: "100644", type: "blob", content: JSON.stringify(cassa, null, 1) },
      { path: FILE, mode: "100644", type: "blob", content: JSON.stringify({ v: 2, dati: c[1] }) }
    ] }).then(function (r) { if (!r.ok) throw errore(r); return r.json(); })
      .then(function (t) { return gh("POST", "/git/commits", { message: "Dati cifrati della dashboard", tree: t.sha, parents: [] }); })
      .then(function (r) { if (!r.ok) throw errore(r); return r.json(); })
      .then(function (cm) { return gh("POST", "/git/refs", { ref: "refs/heads/" + RAMO, sha: cm.sha }); })
      .then(function (r) {
        if (r.status === 422) throw new Error("Nel frattempo un altro dispositivo ha già creato la password: ricarica la pagina e inseriscila.");
        if (!r.ok) throw errore(r);
      });
  }).then(function () {
    return gh("GET", "/contents/foto?ref=" + RAMO_VECCHIO).then(function (r) { return r.ok ? r.json() : []; });
  }).then(function (foto) {
    foto = foto.filter(function (x) { return x.type === "file" && /\.jpe?g$/i.test(x.name); });
    return foto.reduce(function (p, x, i) {
      return p.then(function () {
        avanza("Cifro le foto: " + (i + 1) + " di " + foto.length + "…");
        return gh("GET", "/git/blobs/" + x.sha).then(function (r) { if (!r.ok) throw errore(r); return r.json(); })
          .then(function (j) { return cifraByte(byteDaB64(j.content)); })
          .then(function (b) { return gh("PUT", "/contents/foto/" + x.name.replace(/\.jpe?g$/i, ".bin"), { message: "Foto cifrata", content: b64DaByte(b), branch: RAMO }); });
      });
    }, Promise.resolve());
  }).then(function () {
    avanza("Elimino i vecchi dati non cifrati…");
    return gh("DELETE", "/git/refs/heads/" + RAMO_VECCHIO);   // se non c'era, pazienza
  }).then(function () { return ricordaChiave(chiave); });
}
function mostraLucchetto() {
  if (document.getElementById("lucchetto")) return;
  var st = document.createElement("style");
  st.textContent = "#lucchetto{position:fixed;inset:0;z-index:100;background:var(--bg);color:var(--ink);display:flex;align-items:center;justify-content:center;padding:20px;overflow-y:auto}" +
    "#lucchetto .box{width:min(460px,100%);background:var(--card);border:1px solid var(--line);border-radius:20px;padding:26px 24px;font-size:16px;line-height:1.45}" +
    "#lucchetto h1{margin:0 0 8px;font-size:24px;font-weight:500}#lucchetto p{margin:0 0 14px;color:var(--muted);font-size:14.5px}" +
    "#lucchetto ol{margin:0 0 14px;padding-left:20px;color:var(--muted);font-size:14px}#lucchetto ol b{color:var(--ink);font-weight:500}#lucchetto a{color:var(--accent)}" +
    "#lucchetto input{width:100%;box-sizing:border-box;padding:13px 14px;margin:0 0 10px;border-radius:12px;border:1px solid var(--line);background:var(--bg);color:var(--ink);font-size:17px;outline:none;-webkit-user-select:text;user-select:text}" +
    "#lucchetto button{width:100%;border:0;border-radius:12px;background:var(--accent);color:#fff;font-size:17px;font-weight:500;padding:13px;margin-top:4px;cursor:pointer}" +
    "#lucchetto button:disabled{opacity:.6}#lucchetto .msg{min-height:20px;margin-top:10px;font-size:14px;color:var(--accent)}#lucchetto .msg.ok{color:var(--muted)}";
  var l = document.createElement("div"); l.id = "lucchetto";
  l.innerHTML = '<div class="box"><h1>Home2Love</h1><p>Controllo…</p></div>';
  document.head.appendChild(st); document.body.appendChild(l);
  var box = l.firstChild;
  function campo(tipo, ph, auto) { var i = document.createElement("input"); i.type = tipo; i.placeholder = ph; i.autocomplete = auto; return i; }
  function sezioneCodice(f, aperta, nota) {   // campo per il codice GitHub, nascosto dietro un link se non serve
    var wrap = document.createElement("div"), cod = campo("text", "github_pat_…", "off");
    wrap.innerHTML = (nota ? "<p></p>" : "") + PASSI_CODICE; if (nota) wrap.firstChild.textContent = nota;
    wrap.appendChild(cod); wrap.hidden = !aperta;
    var link = document.createElement("a"); link.href = "#"; link.textContent = "Ho un nuovo codice GitHub";
    link.style.cssText = "display:block;margin:12px 0 0;font-size:14px"; link.hidden = aperta;
    link.onclick = function (e) { e.preventDefault(); wrap.hidden = false; link.hidden = true; cod.focus(); };
    return { wrap: wrap, link: link, cod: cod, apri: function (t) { if (t) { wrap.querySelector("p") ? wrap.querySelector("p").textContent = t : wrap.insertAdjacentHTML("afterbegin", "<p>" + t + "</p>"); } wrap.hidden = false; link.hidden = true; cod.focus(); } };
  }
  function riprova(msg) {
    box.innerHTML = "<h1>Home2Love</h1><p></p><button>Riprova</button>";
    box.querySelector("p").textContent = msg;
    box.querySelector("button").onclick = function () { l.remove(); st.remove(); mostraLucchetto(); };
  }
  leggiCassaforte().then(function (cassa) {
    box.innerHTML = "";
    var f = document.createElement("form"), msg = document.createElement("div"); msg.className = "msg";
    var bottone = document.createElement("button");
    if (cassa) {   // ---- entra con la password
      f.innerHTML = "<h1>Home2Love</h1><p>Inserisci la password di casa.</p>";
      var pw = campo("password", "Password", "current-password"); f.appendChild(pw);
      var sc = sezioneCodice(f, false); f.appendChild(sc.wrap);
      bottone.textContent = "Entra"; f.appendChild(bottone); f.appendChild(msg); f.appendChild(sc.link);
      f.onsubmit = function (e) {
        e.preventDefault(); if (!pw.value) return;
        bottone.disabled = true; msg.className = "msg ok"; msg.textContent = "Sblocco…";
        var nuovo = sc.wrap.hidden ? "" : sc.cod.value.trim();
        entra(pw.value, cassa).then(function () {
          if (nuovo) { msg.textContent = "Salvo il nuovo codice…"; return sostituisciCodice(nuovo); }
          return provaCodice(token).catch(function () {   // la password è giusta ma il codice salvato non vale più
            var e = new Error("Password giusta, ma il codice GitHub salvato non funziona più: incolla quello nuovo e premi Entra.");
            e.codice = true; throw e;
          });
        }).then(sbloccato, function (err) {
          bottone.disabled = false; msg.className = "msg"; msg.textContent = err.message || "Non riesco a entrare.";
          if (err.codice) sc.apri(); else if (!nuovo) pw.select();
        });
      };
      box.appendChild(f); setTimeout(function () { pw.focus(); }, 50);
      return;
    }
    // ---- prima volta: scegli la password (e, se serve, il codice GitHub)
    f.innerHTML = "<h1>Proteggi la dashboard</h1><p>Scegli la password di casa: turni, promemoria, foto e dispositivi verranno cifrati con questa. " +
      "Usa una frase di almeno 4 parole (es. pentola-luna-bici-verde). Se la dimenticate i dati non si possono recuperare.</p>";
    var sc = sezioneCodice(f, !token); f.appendChild(sc.wrap);
    if (token) provaCodice(token).catch(function () { sc.apri("Il codice GitHub salvato su questo dispositivo non funziona più: incolla quello nuovo."); });
    var p1 = campo("password", "Nuova password", "new-password"), p2 = campo("password", "Ripeti la password", "new-password");
    f.appendChild(p1); f.appendChild(p2);
    bottone.textContent = "Crea la password e cifra i dati"; f.appendChild(bottone); f.appendChild(msg); f.appendChild(sc.link);
    f.onsubmit = function (e) {
      e.preventDefault();
      var cod = sc.wrap.hidden ? null : sc.cod;
      if (cod && !cod.value.trim()) { msg.textContent = "Incolla il codice GitHub."; return; }
      if (p1.value.length < 12) { msg.textContent = "Troppo corta: usa almeno 12 caratteri, meglio una frase di 4 parole."; return; }
      if (p1.value !== p2.value) { msg.textContent = "Le due password non sono uguali."; return; }
      if (cod) token = cod.value.trim();
      bottone.disabled = true; msg.className = "msg ok";
      creaCassaforte(p1.value, function (t) { msg.textContent = t; }).then(function () {
        salva("cucina_token", token); sbloccato();
      }, function (err) {
        chiaveCripto = null; bottone.disabled = false; msg.className = "msg";
        msg.textContent = (err && err.message && !/^HTTP/.test(err.message) ? err.message : "Qualcosa non è andato (" + (err && err.message) + "). Riprova.");
      });
    };
    box.appendChild(f);
  }, function () { riprova("Non riesco a collegarmi a GitHub. Controlla la connessione e riprova."); });
}

// ================= foto condivise (cartella foto/ del ramo "cassaforte", cifrate) =================
// Il telefono le carica, il tablet le scarica e le mostra nel carosello.
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
function listaFotoRemote() {   // [{name, sha}]
  if (!token || !chiaveCripto) return Promise.resolve([]);
  return gh("GET", "/contents/foto?ref=" + RAMO).then(function (r) {
    if (r.status === 404) return [];
    if (!r.ok) throw errore(r);
    return r.json().then(function (l) { return l.filter(function (x) { return x.type === "file" && /\.bin$/i.test(x.name); }); });
  });
}
function caricaFotoRemota(blob) {   // resolve con {name, sha}
  var nome = nuovoId() + ".bin";
  return blob.arrayBuffer().then(function (b) { return cifraByte(b); }).then(function (c) {
    return gh("PUT", "/contents/foto/" + nome, { message: "Aggiungi foto", content: b64DaByte(c), branch: RAMO });
  }).then(function (r) {
    if (!r.ok) throw errore(r);
    return r.json().then(function (j) { return { name: nome, sha: j.content.sha }; });
  });
}
function scaricaFotoRemota(f) {   // resolve con il Blob JPEG già decifrato
  return gh("GET", "/git/blobs/" + f.sha).then(function (r) {
    if (!r.ok) throw errore(r);
    return r.json();
  }).then(function (j) { return decifraByte(byteDaB64(j.content)); })
    .then(function (b) { return new Blob([b], { type: "image/jpeg" }); });
}
function eliminaFotoRemota(f) {
  return gh("DELETE", "/contents/foto/" + f.name, { message: "Togli foto", sha: f.sha, branch: RAMO }).then(function (r) {
    if (!r.ok && r.status !== 404) throw errore(r);
  });
}
