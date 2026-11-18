// Home2Love — telecomando del tablet dal telefono e avviso "Sto tornando".
// Il telefono scrive nel registro condiviso (cifrato) delle chiavi "cmd.<id>" (comandi) e "rientro.<persona>";
// il tablet le legge a ogni sincronizzazione: esegue i comandi (radio, timer, gatto) e li cancella,
// e mostra in alto chi sta tornando a casa con il conto alla rovescia. Il tablet a sua volta pubblica
// il proprio stato (radio accesa, stazione, timer) in cfg.statoTablet, così il telefono lo vede.

var CMD_VALIDO = 15 * 60000;   // un comando più vecchio di 15 minuti non si esegue più (es. tablet spento)

// ---------------------------------------------------------------- lato telefono
function mandaComando(cosa, dati) {
  if (!token || !chiaveCripto || !reg) return false;
  var ora = Date.now();
  reg["cmd." + nuovoId()] = { v: { cosa: cosa, dati: dati || {}, da: window.io, t: ora }, t: ora };
  salva("cucina_registro", reg); sincronizza();
  return true;
}
function rientroDi(p) {   // { arrivo, min, mezzo, t } se p sta tornando (fino a 10 minuti dopo l'arrivo previsto)
  var e = reg && reg["rientro." + p];
  if (!e || e.d || !e.v || !e.v.arrivo) return null;
  return Date.now() < e.v.arrivo + 10 * 60000 ? e.v : null;
}
function segnaRientro(p, v) {
  var ora = Date.now();
  reg["rientro." + p] = v ? { v: v, t: ora } : { d: 1, t: ora };
  salva("cucina_registro", reg); sincronizza();
}
// "Esco": dove si trova chi è fuori casa (chiave "fuori.<persona>" = { dove, t }); vale finché non torna
function fuoriDi(p) {
  var e = reg && reg["fuori." + p], r = reg && reg["rientro." + p];
  if (!e || e.d || !e.v || !e.v.t) return null;
  if (Date.now() - e.v.t > 12 * 3600000) return null;   // dimenticato acceso: dopo 12 ore non vale più
  if (r && r.t > e.v.t) return null;                     // ha premuto "Sto tornando" dopo
  return e.v;
}
function segnaFuori(p, v) {
  var ora = Date.now();
  reg["fuori." + p] = v ? { v: v, t: ora } : { d: 1, t: ora };
  salva("cucina_registro", reg); sincronizza();
}
function oraHM(t) { var d = new Date(t); return d.getHours() + ":" + due(d.getMinutes()); }
function traQuanto(t) { var m = Math.round((t - Date.now()) / 60000); return m <= 0 ? "a momenti" : m < 60 ? "tra " + m + " min" : "tra " + Math.floor(m / 60) + " h " + due(m % 60); }

// ---------------------------------------------------------------- "Pensavo a te": un cuore che arriva all'altro (e al tablet)
// Chiavi "pensiero.<id>" = { da, t } nel registro cifrato; si tengono solo gli ultimi 60.
function pensieri() {
  return Object.keys(reg || {}).filter(function (k) { return k.indexOf("pensiero.") === 0 && !reg[k].d && reg[k].v; })
    .map(function (k) { return { k: k, da: reg[k].v.da, t: reg[k].v.t }; }).sort(function (a, b) { return a.t - b.t; });
}
function mandaPensiero(da) {
  if (!token || !chiaveCripto || !reg || (da !== 0 && da !== 1)) return false;
  var ora = Date.now();
  reg["pensiero." + nuovoId()] = { v: { da: da, t: ora }, t: ora };
  var l = pensieri(); l.slice(0, Math.max(0, l.length - 60)).forEach(function (x) { reg[x.k] = { d: 1, t: ora }; });
  salva("cucina_registro", reg); sincronizza();
  return true;
}
function pensieriNuovi(chiave, da) {   // quelli arrivati dopo l'ultima volta (la prima volta non mostra quelli vecchi)
  var visto = leggi(chiave, 0);
  if (!visto) { salva(chiave, Date.now()); return []; }
  var nuovi = pensieri().filter(function (x) { return x.t > visto && (da === undefined || x.da === da) && Date.now() - x.t < 3 * 3600000; });
  if (nuovi.length) salva(chiave, nuovi[nuovi.length - 1].t);
  return nuovi;
}
function pensieriOggi(da) { var oggi = iso(new Date()); return pensieri().filter(function (x) { return x.da === da && iso(new Date(x.t)) === oggi; }).length; }

// ---------------------------------------------------------------- lato tablet
function sulTablet() { return !!$("card-radio"); }
function eseguiComando(c) {
  var chi = c.da === 0 || c.da === 1 ? cfg.nomi[c.da] : "il telefono";
  if (c.cosa === "radio") {
    if (c.dati.stazione != null && STAZIONI[c.dati.stazione]) { radio.scelta = c.dati.stazione; salva("radio_scelta", radio.scelta); }
    if (c.dati.accendi === false) spegniRadio(); else accendiRadio();
  } else if (c.cosa === "volume") {
    radio.volume = Math.max(0, Math.min(1, radio.volume + (c.dati.passo || 0)));
    radio.audio.volume = radio.volume; salva("radio_volume", radio.volume);
    if ($("radio-volume")) $("radio-volume").value = radio.volume;
  } else if (c.cosa === "timer") {
    avviaTimer(Math.max(1, Math.min(240, +c.dati.min || 5)), c.dati.nome || "");
  } else if (c.cosa === "gatto") {
    if (window.saltaGatto && !$("gatto-strato").hidden) {
      G.attivita = null; G.salto = 10; G.stato = "seduto"; G.fino = Date.now() + 6000;
      fumetto("Miao! " + (c.dati.testo || "Un bacio da " + chi) + " ♥", 6000);
      for (var i = 0; i < 6; i++) setTimeout(cuoricino, i * 220);
    }
  }
}
function controllaComandi() {
  if (!reg || !sulTablet()) return;
  var fatti = leggi("comandi_fatti", {}), ora = Date.now(), cambiato = false;
  Object.keys(reg).filter(function (k) { return k.indexOf("cmd.") === 0 && !reg[k].d && reg[k].v; })
    .sort(function (a, b) { return reg[a].v.t - reg[b].v.t; }).forEach(function (k) {
      var c = reg[k].v;
      if (!fatti[k] && ora - c.t < CMD_VALIDO) { try { eseguiComando(c); } catch (e) {} }
      fatti[k] = ora; reg[k] = { d: 1, t: ora }; cambiato = true;   // fatto: lo cancello per tutti
    });
  Object.keys(fatti).forEach(function (k) { if (ora - fatti[k] > 864e5) delete fatti[k]; });
  salva("comandi_fatti", fatti);
  if (cambiato) { salva("cucina_registro", reg); sincronizza(); }
  pubblicaStatoTablet(); disegnaRientri(); controllaPensieriTablet();
}
function pubblicaStatoTablet() {   // radio e timer, per il telefono; solo quando cambia qualcosa
  if (!sulTablet() || !window.radio) return;
  var s = { radio: radio.accesa, stazione: radio.scelta, volume: Math.round(radio.volume * 100), timer: (window.timers || []).length,
            stazioni: STAZIONI.map(function (x) { return x.nome; }) };
  var prima = cfg.statoTablet ? JSON.stringify(Object.assign({}, cfg.statoTablet, { quando: 0 })) : "";
  if (prima === JSON.stringify(Object.assign({}, s, { quando: 0 }))) return;
  s.quando = Date.now(); cfg.statoTablet = s; salvaCfg();
}
function disegnaRientri() {   // banda in alto sul tablet: "Marco sta tornando · arriva alle 18:42"
  if (!sulTablet()) return;
  suonaRientriNuovi();
  var box = $("rientri"); if (!box) { box = el("div"); box.id = "rientri"; document.body.appendChild(box); }
  var firma = [0, 1].map(function (p) { var r = rientroDi(p); return r ? r.t + ":" + Math.round((r.arrivo - Date.now()) / 60000) : ""; }).join("|");
  if (firma === disegnaRientri.firma) return;
  disegnaRientri.firma = firma; box.innerHTML = "";
  [0, 1].forEach(function (p) {
    var r = rientroDi(p); if (!r) return;
    var d = el("div", "rientro p" + p), arrivato = Date.now() >= r.arrivo;
    d.textContent = arrivato ? "🏠 " + cfg.nomi[p] + " dovrebbe essere arrivato ♥"
      : (r.mezzo === "bici" ? "🚲 " : r.mezzo === "auto" ? "🚗 " : "🏠 ") + cfg.nomi[p] + " sta tornando · arriva alle " + oraHM(r.arrivo) + " (" + traQuanto(r.arrivo) + ")";
    box.appendChild(d);
    var m = Math.round((r.arrivo - Date.now()) / 60000);
    if (m === 1 && disegnaRientri.avvisato !== r.t && window.fumetto && !$("gatto-strato").hidden) {   // il gatto lo aspetta
      disegnaRientri.avvisato = r.t; G.salto = 10; fumetto("Arriva " + cfg.nomi[p] + "! ♥", 8000);
    }
  });
}
function suonaRientriNuovi() {   // il tablet suona una volta per ogni nuovo "Sto tornando" (non per quelli vecchi, né dopo un ricaricamento)
  var sentiti = leggi("rientri_sentiti", {}), nuovo = false;
  [0, 1].forEach(function (p) {
    var r = rientroDi(p); if (!r || !r.t || sentiti[p] === r.t) return;
    if (Date.now() - r.t < 15 * 60000 && Date.now() < r.arrivo) nuovo = true;
    sentiti[p] = r.t;
  });
  if (!nuovo && JSON.stringify(sentiti) === JSON.stringify(leggi("rientri_sentiti", {}))) return;
  salva("rientri_sentiti", sentiti);
  if (nuovo && window.suonaRientro) suonaRientro();
}
function controllaPensieriTablet() {   // cuore grande sul tablet: "Marco pensa a Roberta"
  var n = pensieriNuovi("pensieri_visti_tablet"); if (!n.length) return;
  var x = n[n.length - 1], box = $("pensiero-tab");
  if (!box) { box = el("div"); box.id = "pensiero-tab"; document.body.appendChild(box); box.onclick = function () { box.classList.remove("on"); }; }
  box.innerHTML = '<div class="cuore-grande">♥</div><div class="testo"></div>';
  box.querySelector(".testo").textContent = cfg.nomi[x.da] + " sta pensando a " + cfg.nomi[1 - x.da];
  if (window.suonaPensiero) suonaPensiero();
  box.className = "on p" + x.da;
  for (var i = 0; i < 14; i++) (function (i) {   // pioggia di cuoricini
    setTimeout(function () {
      var c = el("span", "cuoricino-volante"); c.textContent = "♥"; c.style.left = (5 + Math.random() * 90) + "%"; c.style.animationDuration = (2.5 + Math.random() * 2) + "s";
      box.appendChild(c); setTimeout(function () { c.remove(); }, 5000);
    }, i * 180);
  })(i);
  if (window.cuoricino && !$("gatto-strato").hidden) { G.salto = 10; fumetto("♥ " + cfg.nomi[x.da] + " pensa a " + cfg.nomi[1 - x.da], 6000); for (var k = 0; k < 6; k++) setTimeout(cuoricino, k * 250); }
  clearTimeout(controllaPensieriTablet.t); controllaPensieriTablet.t = setTimeout(function () { box.classList.remove("on"); }, 8000);
}
function avviaTelecomando() {
  if (!sulTablet()) return;
  setInterval(controllaComandi, 1500);   // comandi, stato e banda dei rientri
  setTimeout(pubblicaStatoTablet, 5000);
}
