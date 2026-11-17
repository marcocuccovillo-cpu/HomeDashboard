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
function oraHM(t) { var d = new Date(t); return d.getHours() + ":" + due(d.getMinutes()); }
function traQuanto(t) { var m = Math.round((t - Date.now()) / 60000); return m <= 0 ? "a momenti" : m < 60 ? "tra " + m + " min" : "tra " + Math.floor(m / 60) + " h " + due(m % 60); }

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
  pubblicaStatoTablet(); disegnaRientri();
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
function avviaTelecomando() {
  if (!sulTablet()) return;
  setInterval(controllaComandi, 1500);   // comandi, stato e banda dei rientri
  setTimeout(pubblicaStatoTablet, 5000);
}
