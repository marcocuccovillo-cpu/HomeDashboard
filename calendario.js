// Home2Love — calendario del mese (pagina 4 del tablet).
// Per ogni giorno: i turni di tutti e due, ♥ giorno libero insieme / ♡ serata libera, gli appuntamenti.
// Toccando un giorno si vedono i dettagli e si aggiungono o tolgono appuntamenti (cfg.eventi, sincronizzati e cifrati).

var CAL = { mese: 0, giorno: null };   // mese: spostamento rispetto a quello attuale
var GIORNI_SETT = ["Lun", "Mar", "Mer", "Gio", "Ven", "Sab", "Dom"];

function eventi() { cfg.eventi = cfg.eventi || []; return cfg.eventi; }
function eventiDel(k) { return eventi().filter(function (e) { return e.data === k; }).sort(function (a, b) { return (a.ora || "99").localeCompare(b.ora || "99") || a.id - b.id; }); }
function turnoBreve(v) { return v ? (ordinato(v).replace(/:00/g, "").replace(/\s*\/\s*/g, " · ") || v) : ""; }
function primaMaiuscola(t) { return t.charAt(0).toUpperCase() + t.slice(1); }

function disegnaCalendario() {
  var box = $("card-calendario"); if (!box) return;
  var oggi = new Date(), base = new Date(oggi.getFullYear(), oggi.getMonth() + CAL.mese, 1), oggiK = iso(oggi);
  var inizio = lunedi(base), fine = new Date(base.getFullYear(), base.getMonth() + 1, 0), settimane = Math.ceil(((fine - inizio) / 864e5 + 1) / 7);
  box.innerHTML = "";
  var testa = el("div", "cal-testa"), t = el("h2"); t.textContent = primaMaiuscola(MESI[base.getMonth()]) + " " + base.getFullYear(); testa.appendChild(t);
  var leg = el("div", "cal-legenda");
  leg.innerHTML = '<span class="p0"></span><span class="p1"></span><span class="cuore">♥ liberi insieme</span><span class="cuore">♡ serata insieme</span>';
  leg.children[0].textContent = cfg.nomi[0]; leg.children[1].textContent = cfg.nomi[1];
  testa.appendChild(leg);
  [["‹", -1], ["Oggi", 0], ["›", 1]].forEach(function (x) {
    var b = el("button", "cal-nav"); b.type = "button"; b.textContent = x[0];
    b.onclick = function () { CAL.mese = x[1] ? CAL.mese + x[1] : 0; disegnaCalendario(); };
    testa.appendChild(b);
  });
  box.appendChild(testa);
  var g = el("div", "cal-griglia"); g.style.gridTemplateRows = "auto repeat(" + settimane + ", minmax(0, 1fr))";
  GIORNI_SETT.forEach(function (n, i) { var h = el("div", "cal-sett" + (i > 4 ? " fine" : "")); h.textContent = n; g.appendChild(h); });
  for (var k = 0; k < settimane * 7; k++) (function (d) {
    var key = iso(d), fuori = d.getMonth() !== base.getMonth(), ins = insieme(d);
    var c = el("button", "cal-g" + (fuori ? " fuori" : "") + (key === oggiK ? " oggi" : "") + (key < oggiK ? " passato" : "") + (ins === "giorno" ? " insieme" : ""));
    c.type = "button";
    var n = el("div", "cal-num"); n.textContent = d.getDate();
    if (ins) { var cu = el("span", "cal-cuore"); cu.textContent = ins === "giorno" ? "♥" : "♡"; n.appendChild(cu); }
    c.appendChild(n);
    [0, 1].forEach(function (p) {
      var v = turno(d, p), r = el("div", "cal-turno p" + p + (v ? "" : " riposo") + (haEccezione(d, p) ? " cambiato" : ""));
      r.textContent = v ? turnoBreve(v) : "riposo"; c.appendChild(r);
    });
    var ev = eventiDel(key);
    if (window.compleanniDel) compleanniDel(d).forEach(function (x) { var t = el("div", "cal-ev"); t.textContent = "🎂 " + x.nome; c.appendChild(t); });
    if (window.festeDel) festeDel(d).forEach(function (f) { var t = el("div", "cal-ev festa"); t.textContent = f.ico + " " + f.nome; c.appendChild(t); if (f.festivo) n.classList.add("festivo"); });
    ev.slice(0, 2).forEach(function (e) { var x = el("div", "cal-ev"); x.textContent = (e.ora ? e.ora + " " : "") + e.testo; c.appendChild(x); });
    if (ev.length > 2) { var piu = el("div", "cal-ev piu"); piu.textContent = "+" + (ev.length - 2) + " altri"; c.appendChild(piu); }
    c.onclick = function () { apriGiornoCal(key); };
    g.appendChild(c);
  })(piuGiorni(inizio, k));
  box.appendChild(g);
}

// ---------------------------------------------------------------- dettaglio di un giorno
function apriGiornoCal(key) {
  CAL.giorno = key; disegnaGiornoCal(); $("cal-giorno").classList.add("on");
  setTimeout(function () { var i = $("cal-testo"); if (i) i.focus(); }, 150);
}
function chiudiGiornoCal() { CAL.giorno = null; $("cal-giorno").classList.remove("on"); if (document.activeElement) document.activeElement.blur(); disegnaCalendario(); }
function disegnaGiornoCal() {
  var key = CAL.giorno, d = daIso(key), box = $("cal-dettaglio"), ins = insieme(d);
  box.innerHTML = "";
  var h = el("h2"); h.textContent = primaMaiuscola(GIORNI[d.getDay()]) + " " + d.getDate() + " " + MESI[d.getMonth()] + " " + d.getFullYear(); box.appendChild(h);
  if (window.festeDel) festeDel(d).forEach(function (f) { var t = el("div", "cal-d-cuore"); t.textContent = f.ico + " " + f.nome + (f.festivo ? " · festivo" : ""); box.appendChild(t); });
  if (window.compleanniDel) compleanniDel(d).forEach(function (x) { var t = el("div", "cal-d-cuore"); var a = anniCompie(x); t.textContent = "🎂 Compleanno di " + x.nome + (a !== null ? " (" + a + " anni)" : ""); box.appendChild(t); });
  if (ins) { var c = el("div", "cal-d-cuore"); c.textContent = ins === "giorno" ? "♥ Siete liberi insieme tutto il giorno" : "♡ Serata libera insieme"; box.appendChild(c); }
  var tt = el("div", "cal-d-turni");
  [0, 1].forEach(function (p) {
    var v = turno(d, p), r = el("div", "cal-d-turno p" + p);
    var n = el("span"); n.textContent = cfg.nomi[p]; var o = el("b"); o.textContent = v ? turnoBreve(v) : "riposo";
    r.appendChild(n); r.appendChild(o); tt.appendChild(r);
  });
  box.appendChild(tt);
  var lt = el("div", "cal-d-tit"); lt.textContent = "Appuntamenti"; box.appendChild(lt);
  var lista = el("div", "cal-d-lista"), ev = eventiDel(key);
  if (!ev.length) { var v0 = el("div", "cal-d-vuoto"); v0.textContent = "Nessun appuntamento."; lista.appendChild(v0); }
  ev.forEach(function (e) {
    var r = el("div", "cal-d-ev"), t = el("span"); t.textContent = (e.ora ? e.ora + " · " : "") + e.testo;
    var x = el("button"); x.type = "button"; x.textContent = "×"; x.setAttribute("aria-label", "Togli");
    x.onclick = function () { cfg.eventi = eventi().filter(function (y) { return y.id !== e.id; }); salvaCfg(); disegnaGiornoCal(); };
    r.appendChild(t); r.appendChild(x); lista.appendChild(r);
  });
  box.appendChild(lista);
  var f = el("form", "cal-d-form");
  f.innerHTML = '<input type="time" id="cal-ora" aria-label="Ora (facoltativa)"><input type="text" id="cal-testo" autocomplete="off" placeholder="Nuovo appuntamento (es. dentista, cena da Giulia)" enterkeyhint="done"><button type="submit">Aggiungi</button>';
  f.onsubmit = function (e) {
    e.preventDefault();
    var testo = $("cal-testo").value.trim(); if (!testo) return;
    eventi().push({ id: nuovoId(), data: key, ora: $("cal-ora").value || "", testo: testo.slice(0, 80) });
    salvaCfg(); disegnaGiornoCal(); setTimeout(function () { $("cal-testo").focus(); }, 50);
  };
  box.appendChild(f);
}
function avviaCalendario() {
  if (!$("card-calendario")) return;
  $("cal-chiudi").onclick = chiudiGiornoCal;
  $("cal-giorno").onclick = function (e) { if (e.target === this) chiudiGiornoCal(); };
  disegnaCalendario();
  setInterval(function () { if (!CAL.giorno) disegnaCalendario(); }, 5 * 60000);   // a mezzanotte cambia "oggi"
}
