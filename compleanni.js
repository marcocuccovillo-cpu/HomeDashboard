// Home2Love — compleanni, uguali su telefono e tablet.
// Si salvano dal telefono (Turni → 🎂 Compleanni) nel registro cifrato: "compleanno.<id>" = { nome, g, m, anno, t }.
// Telefono: elenco con "tra quanti giorni", un'etichetta in Oggi e il segno nel calendario del mese.
// Tablet: il giorno del compleanno una festa a tutto schermo (con "Tanti auguri" suonato), poi un nastro in alto
// per tutta la giornata; il giorno prima un promemoria per il regalo. Il segno 🎂 anche nel calendario (pagina 4).

var MESI_C = ["gennaio", "febbraio", "marzo", "aprile", "maggio", "giugno", "luglio", "agosto", "settembre", "ottobre", "novembre", "dicembre"];
function compleanni() {
  return Object.keys(window.reg || {}).filter(function (k) { return k.indexOf("compleanno.") === 0 && !reg[k].d && reg[k].v && reg[k].v.nome; })
    .map(function (k) { var v = reg[k].v; return { k: k, nome: v.nome, g: +v.g, m: +v.m, anno: v.anno ? +v.anno : null }; });
}
function prossimoCompleanno(c, da) {   // la prossima data (oggi compreso)
  da = da || new Date(); var oggi = new Date(da.getFullYear(), da.getMonth(), da.getDate());
  var d = new Date(oggi.getFullYear(), c.m - 1, c.g);
  if (c.m === 2 && c.g === 29 && d.getMonth() !== 1) d = new Date(oggi.getFullYear(), 1, 28);   // 29 febbraio negli anni non bisestili
  if (d < oggi) { d = new Date(oggi.getFullYear() + 1, c.m - 1, c.g); if (c.m === 2 && c.g === 29 && d.getMonth() !== 1) d = new Date(oggi.getFullYear() + 1, 1, 28); }
  return d;
}
function giorniAlCompleanno(c) { var n = new Date(), o = new Date(n.getFullYear(), n.getMonth(), n.getDate()); return Math.round((prossimoCompleanno(c) - o) / 864e5); }
function anniCompie(c) { return c.anno ? prossimoCompleanno(c).getFullYear() - c.anno : null; }
function compleanniDel(d) { return compleanni().filter(function (c) { var p = prossimoCompleanno(c, d); return p.getDate() === d.getDate() && p.getMonth() === d.getMonth(); }); }
function compleanniInOrdine() { return compleanni().sort(function (a, b) { return giorniAlCompleanno(a) - giorniAlCompleanno(b) || a.nome.localeCompare(b.nome); }); }
function salvaCompleanno(k, v) {
  if (!window.reg || !window.token || !window.chiaveCripto) { alert("Sblocca prima con la password."); return false; }
  var ora = Date.now(); reg[k || "compleanno." + nuovoId()] = v ? { v: Object.assign({ t: ora }, v), t: ora } : { d: 1, t: ora };
  salva("cucina_registro", reg); sincronizza(); return true;
}
function quandoCompleanno(n) { return n === 0 ? "oggi! 🎉" : n === 1 ? "domani" : "tra " + n + " giorni"; }

// ================================================================ FESTE DELL'ANNO
// festivo = giorno rosso sul calendario; regalo = promemoria qualche giorno prima.
function pasqua(y) {   // domenica di Pasqua (algoritmo di Meeus)
  var a = y % 19, b = Math.floor(y / 100), c = y % 100, d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3);
  var h = (19 * a + b - d - g + 15) % 30, i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451);
  var mese = Math.floor((h + l - 7 * m + 114) / 31), giorno = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(y, mese - 1, giorno);
}
function nesimaDomenica(y, mese, n) { var d = new Date(y, mese, 1); d.setDate(1 + (7 - d.getDay()) % 7 + (n - 1) * 7); return d; }
var FESTE_CACHE = {};
function festeAnno(y) {
  if (FESTE_CACHE[y]) return FESTE_CACHE[y];
  var p = pasqua(y), pq = new Date(p); pq.setDate(p.getDate() + 1);
  var l = [
    [new Date(y, 0, 1), "Capodanno", "🥂", true], [new Date(y, 0, 6), "Epifania", "🧦", true], [new Date(y, 1, 14), "San Valentino", "💘", false, true],
    [new Date(y, 2, 8), "Festa della donna", "🌼", false, true], [new Date(y, 2, 19), "Festa del papà", "👨", false, true],
    [p, "Pasqua", "🐣", true], [pq, "Pasquetta", "🧺", true], [new Date(y, 3, 25), "Festa della Liberazione", "🇮🇹", true],
    [new Date(y, 4, 1), "Festa dei lavoratori", "🛠️", true], [nesimaDomenica(y, 4, 2), "Festa della mamma", "💐", false, true],
    [new Date(y, 5, 2), "Festa della Repubblica", "🇮🇹", true], [new Date(y, 7, 15), "Ferragosto", "🏖️", true],
    [new Date(y, 9, 4), "San Petronio", "⛪", true], [new Date(y, 9, 31), "Halloween", "🎃", false], [new Date(y, 10, 1), "Ognissanti", "🕯️", true],
    [new Date(y, 11, 8), "Immacolata", "✨", true], [new Date(y, 11, 24), "Vigilia di Natale", "🎄", false], [new Date(y, 11, 25), "Natale", "🎄", true, true],
    [new Date(y, 11, 26), "Santo Stefano", "🎁", true], [new Date(y, 11, 31), "San Silvestro", "🎆", false]
  ].map(function (x) { return { d: x[0], nome: x[1], ico: x[2], festivo: x[3], regalo: !!x[4] }; });
  return (FESTE_CACHE[y] = l);
}
function festeDel(d) { return festeAnno(d.getFullYear()).filter(function (f) { return f.d.getDate() === d.getDate() && f.d.getMonth() === d.getMonth(); }); }
function festeInArrivo(d, giorni) {   // le feste "da regalo" nei prossimi giorni (esclusa oggi): [{ f, tra }]
  var o = new Date(d.getFullYear(), d.getMonth(), d.getDate()), r = [];
  for (var i = 1; i <= giorni; i++) { var x = piuGiorni(o, i); festeDel(x).forEach(function (f) { if (f.regalo) r.push({ f: f, tra: i }); }); }
  return r;
}

// ================================================================ TELEFONO: Turni → 🎂 Compleanni
function disegnaCompleanni() {
  var box = $("compleanni"); if (!box) return;
  box.innerHTML = "";
  var testa = el("div", "cp-testa"), sp = el("p", "spiega"), piu = el("button", "btn pieno"); piu.type = "button"; piu.textContent = "+ Aggiungi";
  sp.style.margin = "0"; sp.textContent = "Il giorno del compleanno il tablet fa festa, e il giorno prima vi ricorda il regalo.";
  piu.onclick = function () { apriCompleanno(null); };
  testa.appendChild(sp); testa.appendChild(piu); box.appendChild(testa);
  var l = compleanniInOrdine();
  if (!l.length) { var v = el("div", "card cp-vuoto"); v.textContent = "🎂 Nessun compleanno salvato. Aggiungi quelli di famiglia e amici."; box.appendChild(v); disegnaProssimeFeste(box); return; }
  var c = el("div", "card cp-lista");
  l.forEach(function (x) {
    var n = giorniAlCompleanno(x), a = anniCompie(x), r = el("button", "cp-riga" + (n === 0 ? " oggi" : n <= 7 ? " presto" : "")); r.type = "button";
    r.innerHTML = '<span class="cp-ico">🎂</span><span class="cp-tx"><b></b><small></small></span><span class="cp-quando"></span>';
    r.querySelector("b").textContent = x.nome;
    r.querySelector("small").textContent = x.g + " " + MESI_C[x.m - 1] + (a !== null ? " · " + (n === 0 ? "compie " : "compirà ") + a + " anni" : "");
    r.querySelector(".cp-quando").textContent = quandoCompleanno(n);
    r.onclick = function () { apriCompleanno(x); };
    c.appendChild(r);
  });
  box.appendChild(c);
  disegnaProssimeFeste(box);
}
function disegnaProssimeFeste(box) {
  var o = new Date(), l = [];
  for (var i = 0; i <= 120 && l.length < 6; i++) { var x = piuGiorni(new Date(o.getFullYear(), o.getMonth(), o.getDate()), i); festeDel(x).forEach(function (f) { l.push({ f: f, tra: i }); }); }
  var t = el("div", "titolo"); t.innerHTML = "<h2>Prossime feste</h2>"; box.appendChild(t);
  var c = el("div", "card cp-lista");
  l.forEach(function (x) {
    var r = el("div", "cp-riga" + (x.tra === 0 ? " oggi" : x.tra <= 7 ? " presto" : ""));
    r.innerHTML = '<span class="cp-ico"></span><span class="cp-tx"><b></b><small></small></span><span class="cp-quando"></span>';
    r.querySelector(".cp-ico").textContent = x.f.ico; r.querySelector("b").textContent = x.f.nome;
    r.querySelector("small").textContent = GIORNI[x.f.d.getDay()] + " " + x.f.d.getDate() + " " + MESI_C[x.f.d.getMonth()] + (x.f.festivo ? " · festivo" : "") + (x.f.regalo ? " · 🎁 promemoria" : "");
    r.querySelector(".cp-quando").textContent = x.tra === 0 ? "oggi!" : x.tra === 1 ? "domani" : "tra " + x.tra + " giorni";
    c.appendChild(r);
  });
  box.appendChild(c);
}
function apriCompleanno(x) {
  var f = $("ed-compleanno");
  if (!f) {
    f = el("div", "velo"); f.id = "ed-compleanno";
    var giorni = ""; for (var g = 1; g <= 31; g++) giorni += '<option value="' + g + '">' + g + '</option>';
    var mesi = MESI_C.map(function (m, i) { return '<option value="' + (i + 1) + '">' + m + '</option>'; }).join("");
    f.innerHTML = '<form class="foglio"><h3 id="cp-titolo">Nuovo compleanno</h3>' +
      '<div class="campo"><input type="text" id="cp-nome" placeholder="Chi? (es. Mamma, Giulia)" autocomplete="off" maxlength="40"></div>' +
      '<div class="riga2"><select id="cp-g" class="ea-campo" style="flex:.8">' + giorni + '</select><select id="cp-m" class="ea-campo" style="flex:1.6">' + mesi + '</select>' +
      '<input type="number" id="cp-anno" class="ea-campo" style="flex:1.1" placeholder="anno" min="1900" max="2100" inputmode="numeric"></div>' +
      '<p class="spiega">L\'anno di nascita è facoltativo: serve per dire quanti anni compie.</p>' +
      '<div class="azioni"><button type="button" class="btn rosso sx" id="cp-togli">Togli</button><button type="button" class="btn chiudi">Annulla</button><button class="btn pieno">Salva</button></div></form>';
    document.body.appendChild(f);
    f.addEventListener("click", function (e) { if (e.target === f || e.target.classList.contains("chiudi")) chiudi("ed-compleanno"); });
  }
  var oggi = new Date();
  $("cp-titolo").textContent = x ? "Compleanno di " + x.nome : "Nuovo compleanno";
  $("cp-nome").value = x ? x.nome : ""; $("cp-g").value = x ? x.g : oggi.getDate(); $("cp-m").value = x ? x.m : oggi.getMonth() + 1; $("cp-anno").value = x && x.anno ? x.anno : "";
  $("cp-togli").hidden = !x;
  $("cp-togli").onclick = function () { if (confirm("Togliere il compleanno di " + x.nome + "?") && salvaCompleanno(x.k, null)) { chiudi("ed-compleanno"); disegnaCompleanni(); } };
  f.querySelector("form").onsubmit = function (e) {
    e.preventDefault();
    var nome = $("cp-nome").value.trim(); if (!nome) { $("cp-nome").focus(); return; }
    var anno = parseInt($("cp-anno").value, 10);
    if (salvaCompleanno(x ? x.k : null, { nome: nome.charAt(0).toUpperCase() + nome.slice(1), g: +$("cp-g").value, m: +$("cp-m").value, anno: anno > 1900 && anno <= new Date().getFullYear() ? anno : null })) {
      chiudi("ed-compleanno"); disegnaCompleanni(); if (window.disegnaOggi) disegnaOggi();
    }
  };
  apri("ed-compleanno"); if (!x) setTimeout(function () { $("cp-nome").focus(); }, 250);
}

// ================================================================ TABLET: festa e promemoria
function suonaTantiAuguri() {   // "Tanti auguri a te", con le campanelle di suoni.js
  if (!window.audioCtx || !window.campanella) return;
  var ac = audioCtx(); if (!ac) return; var t = ac.currentTime + .1, out = uscita(ac, .5);
  var G = 392, A = 440, B = 493.88, C = 523.25, D = 587.33, E = 659.25, F = 698.46, G2 = 783.99;
  var note = [[G, .75], [G, .25], [A, 1], [G, 1], [C, 1], [B, 2], [G, .75], [G, .25], [A, 1], [G, 1], [D, 1], [C, 2],
              [G, .75], [G, .25], [G2, 1], [E, 1], [C, 1], [B, 1], [A, 2], [F, .75], [F, .25], [E, 1], [C, 1], [D, 1], [C, 2.5]];
  var batt = .42;
  note.forEach(function (n) { campanella(ac, out, n[0], t, Math.max(.6, n[1] * batt * 2.2), .4); t += n[1] * batt; });
}
function festaCompleanno(chi) {
  var box = $("festa-compleanno");
  if (!box) {
    var st = document.createElement("style");
    st.textContent = "#festa-compleanno{position:fixed;inset:0;z-index:60;display:none;flex-direction:column;align-items:center;justify-content:center;gap:2vh;text-align:center;color:#fff;" +
      "background:radial-gradient(circle at 50% 40%,#ff8fa3,#d7263d 60%,#7a0f22);overflow:hidden;cursor:pointer}#festa-compleanno.on{display:flex}" +
      "#festa-compleanno .torta{font-size:22vh;line-height:1;animation:festa-salta 1.2s ease-in-out infinite}#festa-compleanno h1{font-size:6vh;margin:0}" +
      "#festa-compleanno p{font-size:3vh;margin:0;opacity:.9}#festa-compleanno small{font-size:2vh;opacity:.7;margin-top:2vh}" +
      "#festa-compleanno i{position:absolute;top:-4vh;width:1.4vh;height:2.4vh;border-radius:.3vh;animation:festa-cade linear forwards}" +
      "@keyframes festa-salta{50%{transform:translateY(-2vh) rotate(-4deg)}}@keyframes festa-cade{to{transform:translateY(110vh) rotate(720deg)}}" +
      "#nastro-compleanno{position:fixed;top:1.2vh;right:1.2vw;z-index:8;background:#fff3c4;color:#5a4a1e;border-radius:3vh;padding:.8vh 1.6vw;font-size:2vh;font-weight:600;box-shadow:0 .6vh 2vh rgba(0,0,0,.15);cursor:pointer}";
    document.head.appendChild(st);
    box = el("div"); box.id = "festa-compleanno"; document.body.appendChild(box);
    box.onclick = function () { box.classList.remove("on"); box.innerHTML = ""; };
  }
  var nomi = chi.map(function (c) { return c.nome; }), anni = chi.map(function (c) { var a = anniCompie(c); return a !== null ? c.nome + " compie " + a + " anni" : ""; }).filter(Boolean);
  box.innerHTML = '<div class="torta">🎂</div><h1></h1><p></p><small>Tocca per chiudere</small>';
  box.querySelector("h1").textContent = "Buon compleanno " + nomi.join(" e ") + "!";
  box.querySelector("p").textContent = anni.length ? anni.join(" · ") + " 🎉" : "Oggi è il suo giorno 🎉";
  var colori = ["#ffd166", "#06d6a0", "#118ab2", "#ffffff", "#ff9a62", "#c77dff"];
  for (var i = 0; i < 70; i++) (function (i) {
    setTimeout(function () {
      if (!box.classList.contains("on")) return;
      var c = el("i"); c.style.left = Math.random() * 100 + "%"; c.style.background = colori[i % colori.length];
      c.style.animationDuration = (3 + Math.random() * 3) + "s"; box.appendChild(c); setTimeout(function () { c.remove(); }, 6500);
    }, i * 120);
  })(i);
  box.classList.add("on");
  suonaTantiAuguri();
  if (window.fumetto && $("gatto-strato") && !$("gatto-strato").hidden) { G.salto = 10; fumetto("Miao! Auguri " + nomi.join(" e ") + "! 🎂", 9000); }
  setTimeout(function () { box.classList.remove("on"); box.innerHTML = ""; }, 60000);
}
function controllaCompleanniTablet() {
  if (!$("card-radio") || !window.reg) return;   // solo sul tablet
  if (Date.now() - (controllaCompleanniTablet.ultimo || 0) < 20000) return;
  controllaCompleanniTablet.ultimo = Date.now();
  var ora = new Date(), oggi = compleanniDel(ora), domani = compleanniDel(piuGiorni(ora, 1)), k = iso(ora);
  // nastro in alto: oggi, oppure il promemoria del giorno prima
  var n = $("nastro-compleanno");
  var feste = festeDel(ora), arrivo = festeInArrivo(ora, 3);
  var testo = oggi.length ? "🎂 Oggi è il compleanno di " + oggi.map(function (c) { return c.nome; }).join(" e ")
    : feste.length ? feste[0].ico + " Oggi è " + feste[0].nome + (feste[0].nome === "Natale" ? ": buon Natale!" : "")
    : domani.length ? "🎁 Domani è il compleanno di " + domani.map(function (c) { return c.nome; }).join(" e ") + ": il regalo?"
    : arrivo.length ? "🎁 " + arrivo[0].f.nome + " " + (arrivo[0].tra === 1 ? "domani" : "tra " + arrivo[0].tra + " giorni") + ": pensate al regalo" : "";
  if (testo) {
    if (!n) { n = el("div"); n.id = "nastro-compleanno"; document.body.appendChild(n); n.onclick = function () { var x = compleanniDel(new Date()); if (x.length) festaCompleanno(x); }; }
    n.textContent = testo; n.hidden = false;
  } else if (n) n.hidden = true;
  // la festa: una volta al giorno, non prima delle 8
  if (!oggi.length || ora.getHours() < 8) return;
  var fatte = leggi("compleanni_festeggiati", {}), firma = oggi.map(function (c) { return c.k; }).sort().join(",");
  if (fatte[k] === firma) return;
  fatte = {}; fatte[k] = firma; salva("compleanni_festeggiati", fatte);
  festaCompleanno(oggi);
}
