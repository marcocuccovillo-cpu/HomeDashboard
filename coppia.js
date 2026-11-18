// Home2Love — cose di coppia sul telefono: umore del giorno, abbraccio a distanza, buonanotte, bigliettini segreti.
// Tutto passa dal registro condiviso cifrato, come "Pensavo a te":
//   umore.<p>      = { e, nome, colore, t }            vale solo per oggi
//   abbraccio.<p>  = { t }                              un abbraccio riesce se tutti e due tengono premuto entro 90 secondi
//   buonanotte.<p> = { t, frase }
//   biglietto.<id> = { da, per, testo, dalle, casa, t, aperto }   si apre da un'ora, oppure solo a casa (o tutte e due)
// Usa dalla pagina: reg, cfg, io, salva, sincronizza, el, $, due, nuovoId, oraHM, trCfg.

var UMORI = [
  { e: "😊", nome: "felice", colore: "#ffb547" }, { e: "🥰", nome: "innamorato", colore: "#ff6b8a" }, { e: "🤩", nome: "carico", colore: "#ff8a3d" },
  { e: "😌", nome: "tranquillo", colore: "#5fc3a8" }, { e: "😴", nome: "stanco", colore: "#8f9bd6" }, { e: "😔", nome: "giù", colore: "#7a8aa0" },
  { e: "😤", nome: "nervoso", colore: "#e0574f" }, { e: "🤒", nome: "malaticcio", colore: "#9bb36a" }
];
var FRASI_NOTTE = ["Sogni d'oro ♥", "Buonanotte amore mio", "Dormi bene, ti penso", "Notte, a domani ♥", "Ti mando un bacio sul cuscino", "Chiudi gli occhi, sono lì con te"];
var ABBRACCIO_FIN = 90000;
if (!leggi("buonanotte_vista", 0)) salva("buonanotte_vista", Date.now());   // su un telefono nuovo non mostro quelle vecchie

// ---------------------------------------------------------------- registro
function rv(k) { var e = reg && reg[k]; return e && !e.d && e.v ? e.v : null; }
function scrivi(k, v) { var ora = Date.now(); reg[k] = v ? { v: v, t: ora } : { d: 1, t: ora }; salva("cucina_registro", reg); sincronizza(); }
function umoreDi(p) { var u = rv("umore." + p); return u && iso(new Date(u.t)) === iso(new Date()) ? u : null; }
function biglietti() {
  return Object.keys(reg || {}).filter(function (k) { return k.indexOf("biglietto.") === 0 && rv(k); })
    .map(function (k) { var v = rv(k); v.k = k; return v; }).sort(function (a, b) { return b.t - a.t; });
}
function distanzaM(a, b) { var dx = (a.lon - b.lon) * 111320 * Math.cos(a.lat * Math.PI / 180), dy = (a.lat - b.lat) * 110540; return Math.sqrt(dx * dx + dy * dy); }

// ---------------------------------------------------------------- stile e pezzi fissi (creati una volta)
(function () {
  var st = document.createElement("style");
  st.textContent = [
    "#card-noi .noi-umori{display:flex;gap:10px;margin-bottom:12px}",
    "#card-noi .umore{flex:1;border:0;border-radius:16px;padding:12px 10px;text-align:left;background:var(--soft);color:var(--ink);display:flex;gap:10px;align-items:center;min-width:0}",
    "#card-noi .umore .em{font-size:30px;line-height:1}#card-noi .umore b{display:block;font-size:14px}#card-noi .umore small{display:block;font-size:12.5px;color:var(--muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}",
    ".eroe .noi-eroe{position:relative;z-index:1;margin-top:10px}",
    ".eroe .noi-pill{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:8px}",
    ".eroe .noi-pill button,.eroe .noi-pill span{border:0;border-radius:14px;padding:6px 11px;background:rgba(255,255,255,.18);color:#fff;font-size:13px;font-weight:600;-webkit-backdrop-filter:blur(8px);backdrop-filter:blur(8px);max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}",
    ".eroe .noi-pill button:disabled{opacity:1}.eroe .noi-pill span{background:none;padding-left:2px;font-weight:500;opacity:.85}",
    ".eroe .noi-pill .bigl-pill{background:rgba(255,236,170,.92);color:#5a4a1e}",
    ".eroe .noi-azioni{display:flex;gap:8px;position:relative;z-index:1}",
    ".eroe .noi-azioni button{flex:1;border:0;border-radius:16px;padding:9px 4px 8px;background:rgba(255,255,255,.2);color:#fff;font-size:13px;font-weight:700;position:relative;overflow:hidden;touch-action:none;-webkit-user-select:none;user-select:none;-webkit-backdrop-filter:blur(8px);backdrop-filter:blur(8px)}",
    ".eroe .noi-azioni button .noi-carica{position:absolute;left:0;bottom:0;height:4px;background:#fff;width:0;border-radius:0;display:block;margin:0;padding:0}",
    ".eroe .noi-azioni button .ico{display:block;font-size:22px;line-height:1.1;margin-bottom:2px}",
    "#card-noi .noi-azioni{display:flex;gap:8px}#card-noi .noi-azioni button{flex:1;border:0;border-radius:14px;padding:12px 6px;background:var(--accent-soft);color:var(--accent);font-size:14px;font-weight:700;position:relative;overflow:hidden;touch-action:none;-webkit-user-select:none;user-select:none}",
    "#card-noi .noi-azioni button .noi-carica{position:absolute;left:0;bottom:0;height:4px;background:var(--accent);width:0;border-radius:0;display:block;margin:0;padding:0}",
    "#card-noi .noi-azioni button .ico{display:block;font-size:24px;line-height:1.1;margin-bottom:3px}",
    "#card-noi .bigl{display:flex;align-items:center;gap:10px;margin-top:10px;padding:10px 12px;border-radius:14px;background:#fff6d8;color:#5a4a1e;border:0;width:100%;text-align:left;font-size:14px}",
    "@media (prefers-color-scheme: dark){#card-noi .bigl{background:#3a3220;color:#f0e2b8}}",
    "#card-noi .bigl .ic{font-size:22px}#card-noi .bigl small{display:block;opacity:.75;font-size:12.5px}",
    ".umori-scelta{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin:6px 0 4px}",
    ".umori-scelta button{border:1px solid var(--line);background:var(--bg);border-radius:14px;padding:10px 2px;font-size:12.5px;color:var(--ink)}.umori-scelta button span{display:block;font-size:28px;margin-bottom:3px}",
    ".umori-scelta button.sel{border-color:var(--accent);background:var(--accent-soft)}",
    "#copertina{position:fixed;inset:0;z-index:31;display:none;flex-direction:column;align-items:center;justify-content:center;gap:14px;text-align:center;padding:30px;color:#fff}",
    "#copertina.on{display:flex;animation:entra .3s ease-out}#copertina .grande{font-size:120px;line-height:1}#copertina b{font-size:24px;line-height:1.3}#copertina p{margin:0;opacity:.85;max-width:420px}",
    "#copertina button{border:0;border-radius:22px;padding:12px 22px;font-size:16px;font-weight:700;background:#fff;color:#b8172d}#copertina .via{background:none;color:#fff;font-weight:500;text-decoration:underline}",
    "#copertina.abbraccio{background:radial-gradient(circle at 50% 40%,#ff8fa3,#d7263d 70%)}#copertina.abbraccio .grande{animation:stringi 1.2s ease-in-out infinite}",
    "#copertina.notte{background:radial-gradient(circle at 50% 30%,#2b2f6b,#0b0d24 75%)}#copertina.notte .grande{filter:drop-shadow(0 0 30px rgba(255,236,170,.6))}",
    "#copertina.carta{background:rgba(20,8,12,.72)}#copertina .foglietto{background:#fff9e6;color:#3a2e14;border-radius:6px;padding:26px 24px 22px;max-width:420px;width:100%;box-shadow:0 20px 50px rgba(0,0,0,.45);transform:rotate(-1.2deg);text-align:left;font-size:18px;line-height:1.5;white-space:pre-wrap;font-family:Georgia,serif}",
    "#copertina .foglietto small{display:block;margin-top:14px;font-family:inherit;font-size:13px;opacity:.6;text-align:right}",
    "#copertina .stella{position:absolute;width:3px;height:3px;border-radius:50%;background:#fff;animation:brilla 2.4s ease-in-out infinite}",
    "#copertina .tieni{width:150px;height:150px;border-radius:50%;font-size:56px;padding:0;position:relative;touch-action:none;-webkit-user-select:none;user-select:none;background:#fff}",
    "#copertina .tieni svg{position:absolute;inset:-8px;width:166px;height:166px;transform:rotate(-90deg)}",
    "@keyframes stringi{0%,100%{transform:scale(1)}50%{transform:scale(1.12)}}@keyframes brilla{0%,100%{opacity:.2}50%{opacity:1}}"
  ].join("\n");
  document.head.appendChild(st);
  var c = document.createElement("div"); c.id = "copertina"; document.body.appendChild(c);
  c.addEventListener("click", function (e) { if (e.target === c && !c.classList.contains("abbraccio")) chiudiCopertina(); });
  // fogli: umore e bigliettino
  var f = document.createElement("div"); f.className = "velo"; f.id = "ed-umore";
  f.innerHTML = '<div class="foglio"><h3>Come ti senti oggi?</h3><div class="umori-scelta" id="um-scelta"></div><p class="spiega">Lo vede anche l\'altro, nella schermata Oggi. Vale fino a mezzanotte.</p>' +
    '<div class="azioni"><button type="button" class="btn sx" id="um-togli">Togli</button><button type="button" class="btn chiudi">Chiudi</button></div></div>';
  document.body.appendChild(f);
  var b = document.createElement("div"); b.className = "velo"; b.id = "ed-bigl";
  b.innerHTML = '<form class="foglio"><h3 id="bi-titolo">Bigliettino segreto</h3>' +
    '<div class="campo"><textarea id="bi-testo" rows="4" maxlength="600" placeholder="Scrivi qui… lo leggerà solo quando vuoi tu" style="width:100%;box-sizing:border-box;border-radius:12px;border:1px solid var(--line);background:var(--bg);color:var(--ink);font:inherit;font-size:16px;padding:12px;resize:vertical"></textarea></div>' +
    '<div class="campo"><label>Si può aprire</label><select id="bi-quando" style="width:100%;padding:11px;border-radius:12px;border:1px solid var(--line);background:var(--bg);color:var(--ink);font-size:16px">' +
    '<option value="subito">subito</option><option value="ora">da un\'ora precisa…</option><option value="casa">solo quando è a casa</option><option value="ora-casa">da un\'ora precisa, e solo a casa</option></select></div>' +
    '<div class="campo" id="bi-riga-ora" hidden><input type="datetime-local" id="bi-ora" class="ea-campo" style="width:100%"></div>' +
    '<p class="spiega" id="bi-nota">L\'altro vede che c\'è un bigliettino, ma non cosa c\'è scritto finché non si può aprire.</p>' +
    '<div class="azioni"><button type="button" class="btn chiudi sx">Annulla</button><button class="btn pieno" id="bi-invia">Lascia il bigliettino</button></div></form>';
  document.body.appendChild(b);
  [f, b].forEach(function (v) {
    v.addEventListener("click", function (e) { if (e.target === v || e.target.classList.contains("chiudi")) chiudi(v.id); });
  });
  $("bi-quando").onchange = function () { $("bi-riga-ora").hidden = this.value.indexOf("ora") < 0; };
  $("ed-bigl").querySelector("form").onsubmit = inviaBiglietto;
  $("um-togli").onclick = function () { scrivi("umore." + io, null); chiudi("ed-umore"); disegnaCoppia(); };
})();
function copertina(classe, html) { var c = $("copertina"); c.className = "on " + classe; c.innerHTML = html; return c; }
function chiudiCopertina() { var c = $("copertina"); c.className = ""; c.innerHTML = ""; }
function nomeDi(p) { return (cfg.nomi[p] || "").split(" ")[0] || (p ? "Lei" : "Lui"); }
function testoSicuro(s) { var d = document.createElement("div"); d.textContent = s; return d.innerHTML; }

// ---------------------------------------------------------------- la scheda "Noi due" in Oggi
var premendo = false;   // mentre tieni premuto non ridisegno (si perderebbe il gesto)
// Tutto quello "per noi" sta nel riquadro in alto con le foto: umore, bigliettini e i tre pulsanti.
function disegnaCoppia() {
  if (premendo) return;
  var vecchia = $("card-noi"); if (vecchia) vecchia.remove();   // la scheda separata di prima
  var eroe = $("eroe"); if (!eroe) return;
  var c = eroe.querySelector(".noi-eroe"); if (c) c.remove();
  if (io === null) return;
  c = el("div", "noi-eroe");
  // umore: due pastiglie
  var um = el("div", "noi-pill");
  [io, 1 - io].forEach(function (p) {
    var u = umoreDi(p), b = el("button"); b.type = "button";
    b.textContent = (p === io ? "Tu" : nomeDi(p)) + " " + (u ? u.e + " " + u.nome : p === io ? "＋ come ti senti?" : "· ?");
    if (u) b.style.boxShadow = "inset 3px 0 0 " + u.colore;
    if (p === io) b.onclick = apriUmore; else b.disabled = true;
    um.appendChild(b);
  });
  c.appendChild(um);
  // bigliettini per me (da aprire, o letti da poco) e lo stato del mio
  var bl = el("div", "noi-pill");
  biglietti().filter(function (x) { return x.per === io && !x.aperto; }).slice(0, 3).forEach(function (x) {
    var ok = apribile(x), b = el("button", "bigl-pill"); b.type = "button";
    b.textContent = (ok.ora ? "✉️ " : "🔒 ") + "Bigliettino da " + nomeDi(x.da) + " · " + (ok.ora ? (x.casa ? "a casa" : "aprilo") : "si apre " + ok.quando);
    b.onclick = function () { apriBigliettoRicevuto(x); }; bl.appendChild(b);
  });
  biglietti().filter(function (x) { return x.per === io && x.aperto && Date.now() - x.aperto < 864e5; }).slice(0, 1).forEach(function (x) {
    var b = el("button"); b.type = "button"; b.textContent = "📖 Rileggi il bigliettino di " + nomeDi(x.da); b.onclick = function () { leggiBiglietto(x); }; bl.appendChild(b);
  });
  biglietti().filter(function (x) { return x.da === io && Date.now() - x.t < 3 * 864e5; }).slice(0, 1).forEach(function (x) {
    var s = el("span"); s.textContent = "✉️ Il tuo: " + (x.aperto ? "letto alle " + oraHM(x.aperto) + " ♥" : "non ancora aperto"); bl.appendChild(s);
  });
  if (bl.children.length) c.appendChild(bl);
  // i tre pulsanti
  var az = el("div", "noi-azioni");
  var ab = el("button"); ab.type = "button"; ab.title = "Tieni premuto"; ab.innerHTML = "<span class='ico'>🤗</span>Abbraccio<span class='noi-carica'></span>"; tieniPremuto(ab, 1200, iniziaAbbraccio); az.appendChild(ab);
  var bn = el("button"); bn.type = "button"; bn.innerHTML = "<span class='ico'>🌙</span>Buonanotte"; bn.onclick = function () { mandaBuonanotte(bn); }; az.appendChild(bn);
  var bi = el("button"); bi.type = "button"; bi.innerHTML = "<span class='ico'>✉️</span>Bigliettino"; bi.onclick = apriBiglietto; az.appendChild(bi);
  c.appendChild(az);
  eroe.appendChild(c);
}
function tieniPremuto(b, ms, fatto) {   // tenere premuto: una barra si riempie, poi parte
  var t = null, inizio = 0, barra = b.querySelector(".noi-carica");
  function giu(e) { e.preventDefault(); premendo = true; inizio = Date.now(); if (navigator.vibrate) navigator.vibrate(15); t = requestAnimationFrame(passo); }
  function passo() { var p = Math.min(1, (Date.now() - inizio) / ms); if (barra) barra.style.width = p * 100 + "%"; if (p >= 1) { su(); fatto(); return; } t = requestAnimationFrame(passo); }
  function su() { cancelAnimationFrame(t); t = null; premendo = false; if (barra) barra.style.width = "0"; }
  b.addEventListener("pointerdown", giu); b.addEventListener("pointerup", su); b.addEventListener("pointerleave", su); b.addEventListener("pointercancel", su);
  b.addEventListener("contextmenu", function (e) { e.preventDefault(); });
}

// ---------------------------------------------------------------- umore
function apriUmore() {
  var box = $("um-scelta"), u = umoreDi(io); box.innerHTML = "";
  UMORI.forEach(function (x) {
    var b = el("button"); b.type = "button"; b.innerHTML = "<span></span>"; b.querySelector("span").textContent = x.e; b.appendChild(document.createTextNode(x.nome));
    if (u && u.nome === x.nome) b.className = "sel";
    b.onclick = function () { scrivi("umore." + io, { e: x.e, nome: x.nome, colore: x.colore, t: Date.now() }); if (navigator.vibrate) navigator.vibrate(20); chiudi("ed-umore"); disegnaCoppia(); };
    box.appendChild(b);
  });
  apri("ed-umore");
}

// ---------------------------------------------------------------- abbraccio a distanza
function iniziaAbbraccio() {
  if (!token || !chiaveCripto) { alert("Sblocca prima con la password."); return; }
  scrivi("abbraccio." + io, { t: Date.now() });
  if (navigator.vibrate) navigator.vibrate(60);
  controllaAbbraccio(true);
}
function controllaAbbraccio(mio) {
  if (io === null) return;
  var a = rv("abbraccio." + io), b = rv("abbraccio." + (1 - io)), ora = Date.now();
  var mioVivo = a && ora - a.t < ABBRACCIO_FIN, suoVivo = b && ora - b.t < ABBRACCIO_FIN;
  if (mioVivo && suoVivo && Math.abs(a.t - b.t) < ABBRACCIO_FIN) {   // tutti e due: abbraccio!
    var firma = Math.max(a.t, b.t);
    if (leggi("abbraccio_fatto", 0) === firma) return;
    salva("abbraccio_fatto", firma); fermaAttesa();
    copertina("abbraccio", '<div class="grande">🤗</div><b>Abbraccio con ' + testoSicuro(nomeDi(1 - io)) + '</b><p>Stretti stretti, anche da lontano ♥</p><button type="button">♥</button>');
    $("copertina").querySelector("button").onclick = chiudiCopertina;
    if (navigator.vibrate) navigator.vibrate([400, 120, 400, 120, 900]);
    if (window.suonaPensiero) suonaPensiero();
    setTimeout(chiudiCopertina, 9000);
    return;
  }
  if (mioVivo && !suoVivo) {   // aspetto che ricambi
    if ($("copertina").classList.contains("attesa")) return;
    copertina("abbraccio attesa", '<div class="grande">🤗</div><b>Aspetto che ' + testoSicuro(nomeDi(1 - io)) + ' ricambi…</b><p>Ha un minuto e mezzo per tenere premuto anche lui.</p><button type="button" class="via">Lascia stare</button>');
    $("copertina").querySelector("button").onclick = function () { fermaAttesa(); chiudiCopertina(); };
    fermaAttesa(); controllaAbbraccio.t = setInterval(function () {
      if (Date.now() - a.t > ABBRACCIO_FIN) { fermaAttesa(); chiudiCopertina(); return; }
      if (document.visibilityState === "visible") sincronizza().then(function () { controllaAbbraccio(); });
    }, 3000);
    return;
  }
  if (suoVivo && !mioVivo && leggi("abbraccio_visto", 0) !== b.t) {   // mi sta abbracciando: tengo premuto anche io
    salva("abbraccio_visto", b.t);
    var resta = Math.round((ABBRACCIO_FIN - (ora - b.t)) / 1000);
    copertina("abbraccio invito", '<div class="grande" style="font-size:80px">🤗</div><b>' + testoSicuro(nomeDi(1 - io)) + ' ti sta abbracciando</b><p>Tieni premuto il cuore per ricambiare (' + resta + ' s)</p>' +
      '<button type="button" class="tieni">♥<svg viewBox="0 0 166 166"><circle cx="83" cy="83" r="78" fill="none" stroke="rgba(255,255,255,.9)" stroke-width="6" stroke-dasharray="490" stroke-dashoffset="490" stroke-linecap="round"/></svg></button><button type="button" class="via">Non ora</button>');
    var c = $("copertina"), anello = c.querySelector("circle"), tb = c.querySelector(".tieni");
    tieniPremutoAnello(tb, anello, 1200, iniziaAbbraccio);
    c.querySelector(".via").onclick = chiudiCopertina;
    if (navigator.vibrate) navigator.vibrate([120, 80, 120]);
    setTimeout(function () { if (c.classList.contains("invito")) chiudiCopertina(); }, ABBRACCIO_FIN - (ora - b.t) + 500);   // tempo scaduto
  }
}
function tieniPremutoAnello(b, anello, ms, fatto) {
  var t = null, inizio = 0;
  function giu(e) { e.preventDefault(); inizio = Date.now(); if (navigator.vibrate) navigator.vibrate(15); t = requestAnimationFrame(passo); }
  function passo() { var p = Math.min(1, (Date.now() - inizio) / ms); anello.setAttribute("stroke-dashoffset", 490 * (1 - p)); if (p >= 1) { su(); fatto(); return; } t = requestAnimationFrame(passo); }
  function su() { cancelAnimationFrame(t); anello.setAttribute("stroke-dashoffset", 490); }
  b.addEventListener("pointerdown", giu); b.addEventListener("pointerup", su); b.addEventListener("pointerleave", su); b.addEventListener("pointercancel", su);
  b.addEventListener("contextmenu", function (e) { e.preventDefault(); });
}
function fermaAttesa() { clearInterval(controllaAbbraccio.t); }

// ---------------------------------------------------------------- buonanotte
function mandaBuonanotte(b) {
  if (!token || !chiaveCripto) { alert("Sblocca prima con la password."); return; }
  if (Date.now() - (mandaBuonanotte.ultimo || 0) < 10000) return;
  mandaBuonanotte.ultimo = Date.now();
  scrivi("buonanotte." + io, { t: Date.now(), frase: FRASI_NOTTE[Math.floor(Math.random() * FRASI_NOTTE.length)] });
  if (navigator.vibrate) navigator.vibrate(30);
  if (b) { b.innerHTML = "<span class='ico'>🌙</span>Inviata ♥"; setTimeout(disegnaCoppia, 2500); }
}
function controllaBuonanotte() {
  if (io === null) return;
  var x = rv("buonanotte." + (1 - io)); if (!x || Date.now() - x.t > 3 * 3600000) return;
  if (leggi("buonanotte_vista", 0) >= x.t) return;
  salva("buonanotte_vista", x.t);
  var stelle = ""; for (var i = 0; i < 40; i++) stelle += '<i class="stella" style="left:' + (Math.random() * 100).toFixed(1) + '%;top:' + (Math.random() * 100).toFixed(1) + '%;animation-delay:' + (Math.random() * 2.4).toFixed(2) + 's"></i>';
  copertina("notte", stelle + '<div class="grande">🌙</div><b>' + testoSicuro(x.frase) + '</b><p>' + testoSicuro(nomeDi(1 - io)) + ' ti dà la buonanotte · ' + oraHM(x.t) + '</p><button type="button">Buonanotte ♥</button><button type="button" class="via">Chiudi</button>');
  var c = $("copertina"), bs = c.querySelectorAll("button");
  bs[0].onclick = function () { mandaBuonanotte(); chiudiCopertina(); };
  bs[1].onclick = chiudiCopertina;
  if (navigator.vibrate) navigator.vibrate([60, 120, 60]);
  ninnaNanna();
}
function ninnaNanna() {   // tre note basse e lente
  if (!window.audioCtx || !window.campanella) return;
  var ac = audioCtx(); if (!ac) return; var t = ac.currentTime + .05, out = uscita(ac, .3);
  [[523.25, 0], [440, .7], [349.23, 1.4], [392, 2.4]].forEach(function (n) { campanella(ac, out, n[0], t + n[1], 2.4, .35); });
}

// ---------------------------------------------------------------- bigliettini segreti
function apriBiglietto() {
  if (!token || !chiaveCripto) { alert("Sblocca prima con la password."); return; }
  $("bi-testo").value = ""; $("bi-quando").value = "subito"; $("bi-riga-ora").hidden = true;
  var d = new Date(Date.now() + 3 * 3600000); d.setMinutes(0, 0, 0);
  $("bi-ora").value = d.getFullYear() + "-" + due(d.getMonth() + 1) + "-" + due(d.getDate()) + "T" + due(d.getHours()) + ":00";
  $("bi-titolo").textContent = "Bigliettino per " + nomeDi(1 - io);
  apri("ed-bigl"); setTimeout(function () { $("bi-testo").focus(); }, 250);
}
function inviaBiglietto(e) {
  e.preventDefault();
  var testo = $("bi-testo").value.trim(); if (!testo) { $("bi-testo").focus(); return; }
  var q = $("bi-quando").value, dalle = null;
  if (q.indexOf("ora") >= 0) { dalle = new Date($("bi-ora").value).getTime(); if (!dalle || isNaN(dalle)) { $("bi-ora").focus(); return; } }
  var casa = q.indexOf("casa") >= 0;
  if (casa && !(trCfg().casa && trCfg().casa.lat)) { alert("Per «solo a casa» serve l'indirizzo di casa (impostalo sul tablet, in Casa → lavoro)."); return; }
  var id = nuovoId();
  scrivi("biglietto." + id, { da: io, per: 1 - io, testo: testo.slice(0, 600), dalle: dalle, casa: casa, t: Date.now(), aperto: 0 });
  var tutti = biglietti(); tutti.slice(30).forEach(function (x) { reg[x.k] = { d: 1, t: Date.now() }; });   // ne tengo 30
  if (window.inviaChat) inviaChat("✉️ Ti ho lasciato un bigliettino" + (dalle ? ": si apre " + quandoBreve(dalle) : "") + (casa ? (dalle ? ", a casa" : ": si apre quando sei a casa") : ""));
  chiudi("ed-bigl"); disegnaCoppia();
}
function quandoBreve(t) {
  var d = new Date(t), oggi = iso(new Date()), dom = iso(piuGiorni(new Date(), 1));
  return (iso(d) === oggi ? "oggi" : iso(d) === dom ? "domani" : GIORNI[d.getDay()] + " " + d.getDate()) + " alle " + oraHM(t);
}
function apribile(x) {   // { ora: true } oppure { ora: false, quando: "oggi alle 20:00" }
  if (x.dalle && Date.now() < x.dalle) return { ora: false, quando: quandoBreve(x.dalle) + (x.casa ? ", a casa" : "") };
  return { ora: true };
}
function apriBigliettoRicevuto(x) {
  var ok = apribile(x);
  if (!ok.ora) {
    copertina("carta", '<div class="grande" style="font-size:90px">🔒</div><b>Non ancora…</b><p>Questo bigliettino si apre ' + testoSicuro(ok.quando) + '.</p><button type="button" class="via">Va bene</button>');
    $("copertina").querySelector("button").onclick = chiudiCopertina; return;
  }
  if (x.casa) {
    copertina("carta", '<div class="grande" style="font-size:80px">📍</div><b>Controllo dove sei…</b>');
    if (!navigator.geolocation) { mostraNonACasa("Questo telefono non sa dire dove sei."); return; }
    navigator.geolocation.getCurrentPosition(function (p) {
      var c = trCfg().casa, d = c && c.lat ? distanzaM({ lat: p.coords.latitude, lon: p.coords.longitude }, c) : 1e9;
      if (d <= 250) leggiBiglietto(x); else mostraNonACasa("Si apre solo a casa: adesso sei a " + (d < 1000 ? Math.round(d / 10) * 10 + " m" : (d / 1000).toFixed(1) + " km") + ".");
    }, function () { mostraNonACasa("Serve il permesso della posizione per sapere se sei a casa."); }, { timeout: 12000, maximumAge: 60000, enableHighAccuracy: true });
    return;
  }
  leggiBiglietto(x);
}
function mostraNonACasa(t) {
  copertina("carta", '<div class="grande" style="font-size:90px">🏠</div><b>Aspetta di essere a casa</b><p>' + testoSicuro(t) + '</p><button type="button" class="via">Va bene</button>');
  $("copertina").querySelector("button").onclick = chiudiCopertina;
}
function leggiBiglietto(x) {
  copertina("carta", '<div class="foglietto"></div><button type="button">♥ Grazie</button>');
  var f = $("copertina").querySelector(".foglietto"); f.textContent = x.testo;
  var s = el("small"); s.textContent = "— " + nomeDi(x.da) + ", " + quandoBreve(x.t).replace(" alle ", " ore "); f.appendChild(s);
  $("copertina").querySelector("button").onclick = function () { chiudiCopertina(); disegnaCoppia(); };
  if (navigator.vibrate) navigator.vibrate(40);
  if (!x.aperto) { var v = Object.assign({}, rv(x.k)); v.aperto = Date.now(); scrivi(x.k, v); }
}
function controllaBiglietti() {   // un bigliettino nuovo, o uno che adesso si può aprire: un piccolo tocco
  if (io === null) return;
  var visti = leggi("biglietti_visti", {}), nuovo = false;
  biglietti().forEach(function (x) {
    if (x.per !== io || x.aperto) return;
    var stato = apribile(x).ora ? "aperto" : "chiuso";
    if (visti[x.k] !== stato) { if (visti[x.k] !== undefined || stato === "chiuso" || Date.now() - x.t < 3 * 3600000) nuovo = true; visti[x.k] = stato; }
  });
  salva("biglietti_visti", visti);
  if (nuovo && navigator.vibrate) navigator.vibrate([40, 60, 40]);
}

// ---------------------------------------------------------------- da chiamare dopo ogni sincronizzazione
function controllaCoppia() {
  try { controllaAbbraccio(); controllaBuonanotte(); controllaBiglietti(); } catch (e) {}
  if (!document.querySelector(".velo.on")) disegnaCoppia();
}
setInterval(function () { if ($("card-noi") && !document.querySelector(".velo.on")) disegnaCoppia(); }, 60000);   // i lucchetti che si aprono con l'ora
