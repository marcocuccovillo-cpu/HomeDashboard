// Home2Love — bus TPER sotto casa (pagina 2, sotto Casa → lavoro).
// I passaggi in tempo reale vengono da HelloBus di TPER; la pagina non può chiederli direttamente (CORS),
// quindi passa dal lettore in Termux sul tablet (http://127.0.0.1:8789/bus). Le fermate stanno in cfg.bus.

var BUS = { dati: {}, nomi: {}, errore: "", ultimo: 0 };
var BUS_OGNI = 45000;

function busCfg() {
  var b = cfg.bus || {};
  b.fermate = b.fermate || [];   // [{ codice: "1234", nome: "Battiferro" }]
  b.linee = b.linee || "";       // linee da mostrare, es. "27, 11" (vuoto = tutte)
  cfg.bus = b;
  return b;
}
function busLinee() { return busCfg().linee.split(/[\s,;]+/).filter(Boolean).map(function (x) { return x.toUpperCase(); }); }

function chiediFermata(codice) {
  var lettore = "http://127.0.0.1:" + (window.PORTA_LETTORE || 8789);
  return fetch(lettore + "/bus?fermata=" + encodeURIComponent(codice), { cache: "no-store" })
    .then(function (r) { return r.json().then(function (j) { if (!r.ok) throw new Error(j.errore || "HTTP " + r.status); return j; }); });
}
function minutiA(hhmm) {   // minuti da adesso all'ora "15:04" (se è già passata da più di un'ora, è domani)
  var p = hhmm.split(":"), ora = new Date(), m = (+p[0]) * 60 + (+p[1]) - (ora.getHours() * 60 + ora.getMinutes());
  if (m < -60) m += 1440;
  return m;
}
function aggiornaBus(subito) {
  var b = busCfg();
  if (!$("card-bus")) return;
  if (!b.fermate.length) { disegnaBus(); return; }
  if (!subito && Date.now() - BUS.ultimo < BUS_OGNI) return;
  BUS.ultimo = Date.now();
  Promise.all(b.fermate.map(function (f) {
    return chiediFermata(f.codice).then(function (j) { BUS.dati[f.codice] = j; BUS.errore = ""; },
      function (e) { BUS.errore = /fetch|network|Load failed/i.test(e.message) ? "lettore" : e.message; });
  })).then(function () { disegnaBus(); busPerTelefono(); });
}
// I telefoni non possono chiedere i bus da soli: quando uno lo chiede ("bus.chiedi"), per 10 minuti il tablet
// mette i passaggi nel registro cifrato ("bus.ora"), al massimo ogni 90 secondi.
function busRichiesto() { var e = reg && reg["bus.chiedi"]; return !!(e && !e.d && e.v && Date.now() - e.v.t < 10 * 60000); }
function busPerTelefono() {
  if (!reg || !busRichiesto()) return;
  var prima = reg["bus.ora"], ora = Date.now(), linee = busLinee();
  if (prima && prima.v && ora - prima.v.t < 90000 && !(reg["bus.chiedi"].v.t > prima.v.t)) return;
  var fermate = busCfg().fermate.map(function (f) {
    var d = BUS.dati[f.codice];
    return { codice: f.codice, nome: f.nome || BUS.nomi[f.codice] || "",
      passaggi: d ? d.passaggi.filter(function (x) { return !linee.length || linee.indexOf(x.linea) >= 0; }).slice(0, 8).map(function (x) { return { linea: x.linea, ora: x.ora }; }) : [] };
  });
  if (!fermate.some(function (f) { return f.passaggi.length; }) && BUS.errore) return;
  reg["bus.ora"] = { v: { t: ora, fermate: fermate }, t: ora };
  salva("cucina_registro", reg); sincronizza();
}
function disegnaBus() {
  var b = busCfg(), box = $("bus-lista"); if (!box) return;
  box.innerHTML = "";
  $("bus-vuoto").hidden = !!b.fermate.length;
  var linee = busLinee();
  b.fermate.forEach(function (f) {
    var d = BUS.dati[f.codice], sez = el("div", "bus-fermata");
    var t = el("div", "bus-nome"); t.textContent = (f.nome || "Fermata") + " · " + f.codice; sez.appendChild(t);
    var riga = el("div", "bus-passaggi");
    var pp = d ? d.passaggi.filter(function (x) { return !linee.length || linee.indexOf(x.linea) >= 0; })
      .map(function (x) { return { linea: x.linea, min: minutiA(x.ora), ora: x.ora, vivo: x.dal_vivo }; })
      .filter(function (x) { return x.min >= -1; }).sort(function (a, c) { return a.min - c.min; }).slice(0, 4) : [];
    if (!pp.length) {
      var v = el("span", "bus-niente");
      v.textContent = !d ? (BUS.errore === "lettore" ? "serve il lettore in Termux aggiornato" : BUS.errore ? "non disponibile ora" : "…")
        : /NESSUNA/i.test(d.testo) ? "nessuna corsa in arrivo" : "nessun bus nei prossimi minuti";
      riga.appendChild(v);
    }
    pp.forEach(function (x) {
      var c = el("span", "bus-pass" + (x.min <= 2 ? " ora" : ""));
      var l = el("b"); l.textContent = x.linea;
      var m = el("span"); m.textContent = x.min <= 0 ? "adesso" : x.min > 90 ? "alle " + x.ora : x.min + " min";
      c.title = (x.vivo ? "dal satellite" : "da orario") + " · " + x.ora;
      c.appendChild(l); c.appendChild(m);
      if (x.vivo) { var s = el("i", "bus-vivo"); s.title = "in tempo reale"; c.appendChild(s); }
      riga.appendChild(c);
    });
    sez.appendChild(riga); box.appendChild(sez);
  });
}

// ---------------------------------------------------------------- impostazioni: fermate vicine a casa
function busApriImpostazioni() {
  var b = busCfg();
  $("bus-codici").value = b.fermate.map(function (f) { return f.codice; }).join(", ");
  $("bus-linee").value = b.linee;
  $("bus-vicine").innerHTML = ""; $("bus-stato").textContent = "";
}
function busSalva() {
  var b = busCfg(), vecchie = {};
  b.fermate.forEach(function (f) { vecchie[f.codice] = f.nome; });
  var codici = $("bus-codici").value.split(/[\s,;]+/).filter(function (x) { return /^\d{1,6}$/.test(x); });
  b.fermate = codici.slice(0, 3).map(function (c) { return { codice: c, nome: vecchie[c] || BUS.nomi[c] || "" }; });
  b.linee = $("bus-linee").value.trim();
  salvaCfg(); BUS.dati = {};
  $("bus-stato").textContent = b.fermate.length ? "Salvato ✓ " + b.fermate.length + (b.fermate.length === 1 ? " fermata" : " fermate") : "Nessuna fermata";
  aggiornaBus(true);
}
function busCercaVicine() {   // fermate degli autobus entro 400 m da casa, da OpenStreetMap
  var casa = window.trCfg && trCfg().casa, box = $("bus-vicine");
  if (!casa) { $("bus-stato").textContent = "Prima salvate l'indirizzo di casa (qui sopra, in Casa → lavoro)."; return; }
  $("bus-stato").textContent = "Cerco le fermate vicine…"; box.innerHTML = "";
  var q = "[out:json][timeout:15];node(around:400," + casa.lat + "," + casa.lon + ")[highway=bus_stop];out;";
  fetch("https://overpass-api.de/api/interpreter?data=" + encodeURIComponent(q)).then(function (r) { return r.json(); }).then(function (j) {
    var l = (j.elements || []).map(function (n) {
      var t = n.tags || {}, dx = (n.lon - casa.lon) * 79000, dy = (n.lat - casa.lat) * 111000;
      return { nome: t.name || "Fermata senza nome", codice: (t.ref || t["ref:tper"] || "").replace(/\D/g, ""), metri: Math.round(Math.sqrt(dx * dx + dy * dy)) };
    }).sort(function (a, c) { return a.metri - c.metri; }).slice(0, 8);
    $("bus-stato").textContent = l.length ? "Tocca una fermata per aggiungerla:" : "Nessuna fermata trovata vicino a casa.";
    l.forEach(function (f) {
      var bt = el("button", "btn-piccolo"); bt.type = "button";
      bt.textContent = f.nome + (f.codice ? " · " + f.codice : "") + " · " + f.metri + " m";
      bt.onclick = function () {
        if (!f.codice) { $("bus-stato").textContent = "Questa fermata non ha il numero su OpenStreetMap: lo trovate scritto sulla palina."; return; }
        BUS.nomi[f.codice] = f.nome;
        var c = $("bus-codici").value.split(/[\s,;]+/).filter(Boolean);
        if (c.indexOf(f.codice) < 0) c.push(f.codice);
        $("bus-codici").value = c.join(", "); bt.disabled = true;
      };
      box.appendChild(bt);
    });
  }).catch(function () { $("bus-stato").textContent = "Ricerca non riuscita, riprova tra poco."; });
}
function avviaBus() {
  if (!$("card-bus")) return;
  $("bus-salva").onclick = busSalva;
  $("bus-cerca").onclick = busCercaVicine;
  $("bus-imposta").onclick = function () { apriImpostazioni(); };
  setTimeout(function () { aggiornaBus(true); }, 2500);   // il lettore può metterci un attimo a rispondere
  setInterval(function () { aggiornaBus(busRichiesto() && reg["bus.chiedi"].v.t > BUS.ultimo); disegnaBus(); }, 15000);   // una richiesta nuova dal telefono: subito
}
