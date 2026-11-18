// Home2Love — lista della spesa smart, uguale su tablet (pagina 2) e telefono (Promemoria → Spesa).
// I prodotti si dividono da soli per reparto (dalle parole), quelli presi vanno in fondo spuntati,
// e i prodotti che comprate più spesso compaiono come scorciatoie ("+ latte").
// Dati: l'array "spesa" di comune.js ({id, testo, fatto, negozio}), sincronizzato e cifrato come i promemoria.
// Col dito: strisci a destra = preso, a sinistra = tolto (con "Annulla"); tieni premuto = nome e negozio.
// Negozi: in alto si sceglie il negozio e si vede la sua lista (più le cose senza negozio, che si trovano ovunque).
// Corsie: l'ordine dei reparti si sistema come nel proprio supermercato, anche diverso per negozio
// (chiavi "corsie.<negozio>" nel registro cifrato, così vale su tutti i dispositivi).

var REPARTI = [
  { id: "frutta", nome: "Frutta e verdura", ico: "🥦", parole: "mela mele pera pere banan arancia arance limon mandarin clementin kiwi uva fragol frutt verdur insalat lattuga rucola spinac pomodor pomodorini patat cipoll aglio carot zucchin melanzan peperon funghi zucca broccol cavol cavolfior finocch sedano prezzemolo basilico rosmarino avocado ananas pesca pesche albicocc cilieg anguria melone lime zenzero legumi fagiolini piselli carciof asparag porri radicchio cetriol" },
  { id: "pane", nome: "Pane e forno", ico: "🥖", parole: "pane panini pancarr piadin crackers cracker grissini fette biscott taralli focaccia brioche cornetti croissant pan di spagna lievito farina" },
  { id: "latte", nome: "Latte, uova e formaggi", ico: "🧀", parole: "latte yogurt yogurth uova uovo burro panna formagg parmigiano grana mozzarell stracchino ricotta mascarpone squacquerone scamorza provola gorgonzola pecorino emmental fontina philadelphia kefir" },
  { id: "carne", nome: "Carne, pesce e salumi", ico: "🥩", parole: "carne pollo tacchino manzo maiale vitello macinato hamburger salsicc wurstel bistecc cotolett petto fesa prosciutto mortadella salame speck bresaola pancetta coppa tonno salmone merluzzo pesce gamber calamar cozze vongole orata branzino" },
  { id: "dispensa", nome: "Dispensa", ico: "🍝", parole: "pasta spaghetti penne fusilli rigatoni tortellini tortelloni lasagne gnocchi riso cous farro orzo legumi ceci lenticchie fagioli passata pelati sugo pesto olio aceto sale zucchero pepe spezie origano dado brodo maionese ketchup senape conserve marmellata nutella miele cereali muesli caffè caffe tè te tisana cacao biscotti cioccolat snack patatine noci mandorle arachidi pistacchi tonno in scatola sottaceti olive" },
  { id: "surgelati", nome: "Surgelati", ico: "🧊", parole: "surgelat gelato gelati ghiaccio bastoncini sofficini piselli surgelati minestrone pizza surgelata" },
  { id: "bevande", nome: "Bevande", ico: "🧃", parole: "acqua vino birra succo succhi coca cola aranciata bibit spumante prosecco tonica the freddo sprite fanta gassat" },
  { id: "casa", nome: "Casa e pulizia", ico: "🧽", parole: "detersiv sapone piatti lavastoviglie pastiglie ammorbident candeggin sgrassat spugn carta igienica scottex rotoli tovagliol sacchetti sacchi spazzatura alluminio pellicola stagnola anticalcare brillantante pile lampadin scope panno" },
  { id: "igiene", nome: "Igiene e persona", ico: "🧴", parole: "shampoo balsamo bagnoschiuma docciaschiuma dentifricio spazzolino deodorant crema rasoio assorbent salviett cotton fioc dischetti struccante cerotti farmac medicin tachipirin collutorio filo interdentale" },
  { id: "gatto", nome: "Per il gatto", ico: "🐱", parole: "crocchette lettiera scatolette umido per gatti gatto snack gatto" },
  { id: "altro", nome: "Altro", ico: "🛒", parole: "" }
];
function normaleSpesa(t) { return String(t).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\s+/g, " ").trim(); }
function repartoDi(testo) {
  var t = " " + normaleSpesa(testo) + " ", migliore = REPARTI[REPARTI.length - 1], lung = 0;
  REPARTI.forEach(function (r) {
    r.parole.split(" ").forEach(function (p) {   // vince la parola più lunga trovata ("pizza surgelata" batte "pizza")
      if (p.length > 2 && t.indexOf(" " + p) >= 0 && p.length > lung) { migliore = r; lung = p.length; }
    });
  });
  return migliore;
}
// ---------------------------------------------------------------- negozi e corsie
var SPN = { negozio: leggi("spesa_negozio", "") };
function negoziSpesa() {
  var l = leggi("spesa_negozi", ["Supermercato", "Farmacia"]);
  spesa.forEach(function (v) { if (v.negozio && l.indexOf(v.negozio) < 0) l.push(v.negozio); });
  return l;
}
function scegliNegozio(n) { SPN.negozio = n; salva("spesa_negozio", n); ridisegnaSpesa(); }
function nuovoNegozio() {
  var n = (prompt("Nome del negozio (es. Coop, Lidl, Esselunga, Mercato):") || "").trim().slice(0, 20); if (!n) return;
  n = n.charAt(0).toUpperCase() + n.slice(1);
  var l = leggi("spesa_negozi", ["Supermercato", "Farmacia"]); if (l.indexOf(n) < 0) { l.push(n); salva("spesa_negozi", l); }
  scegliNegozio(n);
}
function corsie(neg) {   // ordine dei reparti per quel negozio
  var e = window.reg && reg["corsie." + (neg || "_")], o = e && !e.d && e.v ? e.v : leggi("corsie_" + (neg || "_"), null);
  if (!o && neg) { e = window.reg && reg["corsie._"]; o = e && !e.d && e.v ? e.v : null; }
  var ids = REPARTI.map(function (r) { return r.id; });
  if (!o) return REPARTI.slice();
  return o.filter(function (id) { return ids.indexOf(id) >= 0; }).concat(ids.filter(function (id) { return o.indexOf(id) < 0; }))
    .map(function (id) { return REPARTI.filter(function (r) { return r.id === id; })[0]; });
}
function salvaCorsie(neg, ids) {
  salva("corsie_" + (neg || "_"), ids);
  if (window.reg && window.token && window.chiaveCripto) { var ora = Date.now(); reg["corsie." + (neg || "_")] = { v: ids, t: ora }; salva("cucina_registro", reg); sincronizza(); }
}
function apriCorsie() {
  var neg = SPN.negozio, ordine = corsie(neg).map(function (r) { return r.id; });
  var m = spModale('<h3>Ordine delle corsie' + (neg ? " · " + spSicuro(neg) : "") + '</h3><p class="sp-nota">Metti i reparti nell\'ordine in cui li trovi girando nel negozio: la lista seguirà questo giro.</p><div class="sp-corsie"></div><div class="sp-azioni"><button type="button" class="sp-btn" data-x="reset">Ordine normale</button><button type="button" class="sp-btn pieno" data-x="ok">Fatto</button></div>');
  function disegna() {
    var box = m.querySelector(".sp-corsie"); box.innerHTML = "";
    ordine.forEach(function (id, i) {
      var r = REPARTI.filter(function (x) { return x.id === id; })[0], riga = el("div", "sp-corsia");
      riga.innerHTML = '<span></span><button type="button" aria-label="Su">▲</button><button type="button" aria-label="Giù">▼</button>';
      riga.querySelector("span").textContent = (i + 1) + ". " + r.ico + " " + r.nome;
      var b = riga.querySelectorAll("button");
      b[0].disabled = i === 0; b[1].disabled = i === ordine.length - 1;
      b[0].onclick = function () { ordine.splice(i - 1, 0, ordine.splice(i, 1)[0]); disegna(); };
      b[1].onclick = function () { ordine.splice(i + 1, 0, ordine.splice(i, 1)[0]); disegna(); };
      box.appendChild(riga);
    });
  }
  disegna();
  m.querySelector('[data-x="reset"]').onclick = function () { ordine = REPARTI.map(function (r) { return r.id; }); disegna(); };
  m.querySelector('[data-x="ok"]').onclick = function () { salvaCorsie(neg, ordine); spChiudiModale(); ridisegnaSpesa(); };
}
function apriVoce(v) {   // tieni premuto: nome e negozio
  var m = spModale('<h3>Prodotto</h3><input class="sp-campo" type="text" maxlength="60"><p class="sp-nota">Dove lo compri?</p><div class="sp-scelte"></div>' +
    '<div class="sp-azioni"><button type="button" class="sp-btn rosso" data-x="via">Togli</button><button type="button" class="sp-btn pieno" data-x="ok">Fatto</button></div>');
  var campo = m.querySelector(".sp-campo"), scelto = v.negozio || "";
  campo.value = v.testo;
  function scelte() {
    var box = m.querySelector(".sp-scelte"); box.innerHTML = "";
    [""].concat(negoziSpesa()).forEach(function (n) {
      var b = el("button", "sp-chip" + (n === scelto ? " sel" : "")); b.type = "button"; b.textContent = n || "Ovunque";
      b.onclick = function () { scelto = n; scelte(); }; box.appendChild(b);
    });
  }
  scelte();
  m.querySelector('[data-x="via"]').onclick = function () { spChiudiModale(); togliSpesa(v.id); };
  m.querySelector('[data-x="ok"]').onclick = function () {
    var t = campo.value.trim(); if (t) v.testo = t.charAt(0).toUpperCase() + t.slice(1);
    v.negozio = scelto || undefined; salva("cucina_spesa", spesa); spChiudiModale(); ridisegnaSpesa();
  };
}

// ---------------------------------------------------------------- finestrella e avviso (uguali su tablet e telefono)
(function () {
  var st = document.createElement("style");
  st.textContent = [
    ".sp-negozi{display:flex;gap:6px;overflow-x:auto;scrollbar-width:none;margin-bottom:10px;flex:none}.sp-negozi::-webkit-scrollbar{display:none}",
    ".sp-negozi button{flex:none;border:1px solid var(--line);background:none;border-radius:16px;padding:6px 12px;font-size:min(14px,1.7vh);color:var(--muted);white-space:nowrap;cursor:pointer}",
    ".sp-negozi button.sel{background:var(--accent);border-color:var(--accent);color:#fff;font-weight:600}",
    ".sp-corsie-btn{border:0;background:none;color:var(--muted);font-size:min(13px,1.6vh);cursor:pointer;padding:0 0 0 8px;text-decoration:underline}",
    ".sp-voce{position:relative;touch-action:pan-y;transition:transform .2s,background .2s}.sp-voce.tira{transition:none}",
    ".sp-voce.verso-ok{background:linear-gradient(90deg,rgba(63,138,76,.22),transparent)}.sp-voce.verso-via{background:linear-gradient(270deg,rgba(215,38,61,.2),transparent)}",
    ".sp-tag{font-size:min(11.5px,1.4vh);color:var(--muted);border:1px solid var(--line);border-radius:8px;padding:1px 6px;margin-left:6px;white-space:nowrap;flex:none}",
    ".sp-voce.altrove .sp-testo{opacity:.55}",
    "#sp-modale{position:fixed;inset:0;z-index:60;background:rgba(20,5,10,.45);display:flex;align-items:flex-end;justify-content:center}",
    "#sp-modale .sp-foglio{background:var(--card);color:var(--ink);width:min(560px,100%);border-radius:24px 24px 0 0;padding:20px 18px calc(18px + env(safe-area-inset-bottom));max-height:86vh;overflow-y:auto;font-size:15px}",
    "#sp-modale h3{margin:0 0 8px;font-size:18px}.sp-nota{font-size:13px;color:var(--muted);margin:6px 0 10px}",
    ".sp-campo{width:100%;box-sizing:border-box;padding:12px;border-radius:12px;border:1px solid var(--line);background:var(--bg);color:var(--ink);font-size:16px}",
    ".sp-scelte{display:flex;flex-wrap:wrap;gap:8px}.sp-scelte .sp-chip{border-style:solid}.sp-scelte .sp-chip.sel{background:var(--accent);border-color:var(--accent);color:#fff}",
    ".sp-corsia{display:flex;align-items:center;gap:6px;padding:8px 0;border-bottom:1px solid var(--line)}.sp-corsia span{flex:1}",
    ".sp-corsia button{border:1px solid var(--line);background:var(--bg);color:var(--ink);border-radius:10px;width:40px;height:34px;font-size:13px}.sp-corsia button:disabled{opacity:.3}",
    ".sp-azioni{display:flex;gap:10px;margin-top:16px}.sp-btn{flex:1;border:1px solid var(--line);background:none;border-radius:12px;padding:12px;font-size:15px;color:var(--ink)}",
    ".sp-btn.pieno{background:var(--accent);border-color:var(--accent);color:#fff;font-weight:600}.sp-btn.rosso{color:var(--accent)}",
    "#sp-avviso{position:fixed;left:50%;bottom:calc(90px + env(safe-area-inset-bottom));transform:translateX(-50%);z-index:61;background:#2a2124;color:#fff;border-radius:14px;padding:10px 14px;font-size:14px;display:flex;gap:14px;align-items:center;box-shadow:0 8px 24px rgba(0,0,0,.3);max-width:92vw}",
    "#sp-avviso button{border:0;background:none;color:#ff9aa8;font-weight:700;font-size:14px}"
  ].join("\n");
  document.head.appendChild(st);
})();
function spSicuro(t) { var d = document.createElement("div"); d.textContent = t; return d.innerHTML; }
function spModale(html) {
  spChiudiModale();
  var m = el("div"); m.id = "sp-modale"; m.innerHTML = '<div class="sp-foglio">' + html + '</div>';
  m.onclick = function (e) { if (e.target === m) spChiudiModale(); };
  document.body.appendChild(m); return m;
}
function spChiudiModale() { var m = document.getElementById("sp-modale"); if (m) m.remove(); }
function spAvviso(testo, annulla) {
  var a = document.getElementById("sp-avviso"); if (a) a.remove();
  a = el("div"); a.id = "sp-avviso"; var t = el("span"); t.textContent = testo; a.appendChild(t);
  if (annulla) { var b = el("button"); b.type = "button"; b.textContent = "Annulla"; b.onclick = function () { a.remove(); annulla(); }; a.appendChild(b); }
  document.body.appendChild(a); clearTimeout(spAvviso.t); spAvviso.t = setTimeout(function () { a.remove(); }, 4500);
}

function frequenti() { return leggi("spesa_frequenti", {}); }
function ricordaProdotto(testo) {
  var f = frequenti(), k = normaleSpesa(testo); if (!k) return;
  f[k] = { testo: testo.trim(), n: ((f[k] && f[k].n) || 0) + 1, ultimo: Date.now() };
  var chiavi = Object.keys(f); if (chiavi.length > 120) chiavi.sort(function (a, b) { return f[a].ultimo - f[b].ultimo; }).slice(0, chiavi.length - 120).forEach(function (x) { delete f[x]; });
  salva("spesa_frequenti", f);
}
var FARMACIA = /farmac|medicin|tachipirin|aspirin|moment|oki|cerott|sciroppo|antibiotic|collirio/;
function aggiungiSpesa(testo) {
  testo = String(testo || "").trim(); if (!testo) return;
  var k = normaleSpesa(testo), gia = spesa.filter(function (v) { return normaleSpesa(v.testo) === k; })[0];
  var neg = SPN.negozio || (FARMACIA.test(k) && negoziSpesa().indexOf("Farmacia") >= 0 ? "Farmacia" : "");
  if (gia) { gia.fatto = false; if (neg && !gia.negozio) gia.negozio = neg; }   // già in lista: torna "da prendere"
  else spesa.push({ id: nuovoId(), testo: testo.charAt(0).toUpperCase() + testo.slice(1), fatto: false, negozio: neg || undefined });
  ricordaProdotto(testo); salva("cucina_spesa", spesa); ridisegnaSpesa();
}
function segnaSpesa(id) { spesa.forEach(function (v) { if (v.id === id) v.fatto = !v.fatto; }); salva("cucina_spesa", spesa); ridisegnaSpesa(); }
function togliSpesa(id) {
  var via = spesa.filter(function (v) { return v.id === id; })[0];
  spesa = spesa.filter(function (v) { return v.id !== id; }); salva("cucina_spesa", spesa); ridisegnaSpesa();
  if (via) spAvviso("Tolto «" + via.testo + "»", function () { spesa.push(via); salva("cucina_spesa", spesa); ridisegnaSpesa(); });
}
function togliPresi() { spesa = spesa.filter(function (v) { return !v.fatto; }); salva("cucina_spesa", spesa); ridisegnaSpesa(); }
function ridisegnaSpesa() { [].forEach.call(document.querySelectorAll(".spesa-box"), function (b) { if (b.querySelector(".sp-lista")) disegnaSpesa(b); }); if (window.contaSpesaTab) contaSpesaTab(); }

// Disegna tutta la lista dentro un contenitore .spesa-box (stesso codice per tablet e telefono)
function disegnaSpesa(box) {
  var lista = box.querySelector(".sp-lista"), conta = box.querySelector(".sp-conta"), presiBtn = box.querySelector(".sp-presi"), sug = box.querySelector(".sp-suggeriti");
  var neg = SPN.negozio, qui0 = function (v) { return !neg || !v.negozio || v.negozio === neg; };
  if (neg && negoziSpesa().indexOf(neg) < 0) { neg = SPN.negozio = ""; }
  var nb = box.querySelector(".sp-negozi");
  if (nb) {
    nb.innerHTML = "";
    [""].concat(negoziSpesa()).forEach(function (n) {
      var quanti = spesa.filter(function (v) { return !v.fatto && (n ? v.negozio === n : true); }).length;
      var b = el("button", n === neg ? "sel" : ""); b.type = "button"; b.textContent = (n || "Tutto") + (quanti ? " · " + quanti : "");
      b.onclick = function () { scegliNegozio(n); }; nb.appendChild(b);
    });
    var piu = el("button"); piu.type = "button"; piu.textContent = "＋ negozio"; piu.onclick = nuovoNegozio; nb.appendChild(piu);
  }
  var daPrendere = spesa.filter(function (v) { return !v.fatto && qui0(v); }), presi = spesa.filter(function (v) { return v.fatto && qui0(v); });
  conta.textContent = daPrendere.length ? daPrendere.length + " da prendere" : spesa.length ? "tutto preso ✓" : "lista vuota";
  presiBtn.hidden = !presi.length; presiBtn.textContent = "Togli i presi (" + presi.length + ")";
  lista.innerHTML = "";
  corsie(neg).forEach(function (r) {   // per reparto, nell'ordine del giro in quel negozio
    var qui = daPrendere.filter(function (v) { return repartoDi(v.testo) === r; }); if (!qui.length) return;
    var t = el("div", "sp-reparto"); t.textContent = r.ico + " " + r.nome; lista.appendChild(t);
    qui.forEach(function (v) { lista.appendChild(rigaSpesa(v)); });
  });
  if (presi.length) { var t2 = el("div", "sp-reparto presi"); t2.textContent = "✓ Presi"; lista.appendChild(t2); presi.forEach(function (v) { lista.appendChild(rigaSpesa(v)); }); }
  if (!daPrendere.length && !presi.length) { var vuota = el("div", "sp-vuota"); vuota.textContent = neg && spesa.length ? "Niente da prendere da " + neg + "." : "Scrivi qui sopra cosa manca, oppure tocca un prodotto che comprate spesso."; lista.appendChild(vuota); }
  var altrove = neg ? spesa.filter(function (v) { return !v.fatto && v.negozio && v.negozio !== neg; }).length : 0;
  if (altrove) { var al = el("div", "sp-vuota"); al.textContent = "+ " + altrove + (altrove === 1 ? " cosa" : " cose") + " da prendere in altri negozi"; al.style.fontSize = "13px"; lista.appendChild(al); }
  // suggeriti: i più comprati che ora non sono in lista
  var inLista = {}; spesa.forEach(function (v) { if (!v.fatto) inLista[normaleSpesa(v.testo)] = 1; });
  var f = frequenti(), top = Object.keys(f).filter(function (k) { return !inLista[k]; }).sort(function (a, b) { return f[b].n - f[a].n || f[b].ultimo - f[a].ultimo; }).slice(0, 10);
  sug.innerHTML = ""; sug.hidden = !top.length;
  top.forEach(function (k) { var b = el("button", "sp-chip"); b.type = "button"; b.textContent = "+ " + f[k].testo; b.onclick = function () { aggiungiSpesa(f[k].testo); }; sug.appendChild(b); });
}
function rigaSpesa(v) {
  var r = el("div", "sp-voce" + (v.fatto ? " fatto" : "")), c = el("button", "sp-check"); c.type = "button"; c.setAttribute("aria-label", v.fatto ? "Rimetti da prendere" : "Preso");
  c.onclick = function () { segnaSpesa(v.id); };
  var t = el("span", "sp-testo"); t.textContent = v.testo;
  var x = el("button", "sp-x"); x.type = "button"; x.textContent = "×"; x.setAttribute("aria-label", "Togli"); x.onclick = function () { togliSpesa(v.id); };
  r.appendChild(c); r.appendChild(t);
  if (v.negozio && !SPN.negozio) { var g = el("span", "sp-tag"); g.textContent = v.negozio; r.appendChild(g); }
  r.appendChild(x);
  gestiDito(r, v);
  return r;
}
// strisciare e tenere premuto su una voce
function gestiDito(r, v) {
  var x0 = 0, y0 = 0, dx = 0, attivo = false, mosso = false, tLungo = null;
  r.addEventListener("pointerdown", function (e) {
    if (e.target.closest("button")) return;
    x0 = e.clientX; y0 = e.clientY; dx = 0; attivo = true; mosso = false;
    tLungo = setTimeout(function () { if (attivo && !mosso) { attivo = false; if (navigator.vibrate) navigator.vibrate(25); apriVoce(v); } }, 550);
  });
  r.addEventListener("pointermove", function (e) {
    if (!attivo) return;
    dx = e.clientX - x0; var dy = e.clientY - y0;
    if (!mosso && Math.abs(dy) > 12 && Math.abs(dy) > Math.abs(dx)) { attivo = false; clearTimeout(tLungo); return; }   // sta scorrendo la lista
    if (Math.abs(dx) > 8) { mosso = true; clearTimeout(tLungo); r.classList.add("tira"); r.style.transform = "translateX(" + dx + "px)"; r.classList.toggle("verso-ok", dx > 50); r.classList.toggle("verso-via", dx < -50); }
  });
  function fine() {
    clearTimeout(tLungo); if (!attivo) return; attivo = false;
    r.classList.remove("tira"); r.style.transform = "";
    var largo = Math.min(110, r.offsetWidth * .3);
    if (mosso && dx > largo) { if (navigator.vibrate) navigator.vibrate(15); segnaSpesa(v.id); }
    else if (mosso && dx < -largo) { if (navigator.vibrate) navigator.vibrate(15); togliSpesa(v.id); }
    else if (!mosso) segnaSpesa(v.id);   // un tocco semplice: preso / da prendere
    r.classList.remove("verso-ok", "verso-via");
  }
  r.addEventListener("pointerup", fine); r.addEventListener("pointercancel", function () { clearTimeout(tLungo); attivo = false; r.style.transform = ""; r.classList.remove("tira", "verso-ok", "verso-via"); });
  r.addEventListener("contextmenu", function (e) { e.preventDefault(); });
}
function preparaSpesa(box) {   // collega il campo e i pulsanti di un contenitore
  var f = box.querySelector(".sp-form"), i = box.querySelector(".sp-input");
  f.onsubmit = function (e) {
    e.preventDefault();
    i.value.split(/[,;\n]+/).forEach(aggiungiSpesa);   // "latte, pane, uova" = tre prodotti
    i.value = "";
  };
  box.querySelector(".sp-presi").onclick = togliPresi;
  var cb = box.querySelector(".sp-corsie-btn"); if (cb) cb.onclick = apriCorsie;
  disegnaSpesa(box);
}
function avviaSpesa() { [].forEach.call(document.querySelectorAll(".spesa-box"), function (b) { if (!b.querySelector(".sp-lista")) b.innerHTML = HTML_SPESA; preparaSpesa(b); }); }
// lo stesso blocco HTML va nel tablet e nel telefono
var HTML_SPESA = '<div class="sp-testa"><h2>Spesa</h2><span><span class="sp-conta"></span><button type="button" class="sp-corsie-btn">↕ corsie</button></span></div><div class="sp-negozi"></div>' +
  '<form class="sp-form"><input class="sp-input" type="text" autocomplete="off" placeholder="Cosa manca? (anche più cose, con la virgola)" enterkeyhint="done"><button type="submit" aria-label="Aggiungi">+</button></form>' +
  '<div class="sp-suggeriti"></div><div class="sp-lista"></div><button type="button" class="sp-presi" hidden></button>';
