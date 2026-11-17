// Home2Love — lista della spesa smart, uguale su tablet (pagina 2) e telefono (Promemoria → Spesa).
// I prodotti si dividono da soli per reparto (dalle parole), quelli presi vanno in fondo spuntati,
// e i prodotti che comprate più spesso compaiono come scorciatoie ("+ latte").
// Dati: l'array "spesa" di comune.js ({id, testo, fatto}), sincronizzato e cifrato come i promemoria.

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
function frequenti() { return leggi("spesa_frequenti", {}); }
function ricordaProdotto(testo) {
  var f = frequenti(), k = normaleSpesa(testo); if (!k) return;
  f[k] = { testo: testo.trim(), n: ((f[k] && f[k].n) || 0) + 1, ultimo: Date.now() };
  var chiavi = Object.keys(f); if (chiavi.length > 120) chiavi.sort(function (a, b) { return f[a].ultimo - f[b].ultimo; }).slice(0, chiavi.length - 120).forEach(function (x) { delete f[x]; });
  salva("spesa_frequenti", f);
}
function aggiungiSpesa(testo) {
  testo = String(testo || "").trim(); if (!testo) return;
  var k = normaleSpesa(testo), gia = spesa.filter(function (v) { return normaleSpesa(v.testo) === k; })[0];
  if (gia) { gia.fatto = false; }   // già in lista: torna "da prendere"
  else spesa.push({ id: nuovoId(), testo: testo.charAt(0).toUpperCase() + testo.slice(1), fatto: false });
  ricordaProdotto(testo); salva("cucina_spesa", spesa); ridisegnaSpesa();
}
function segnaSpesa(id) { spesa.forEach(function (v) { if (v.id === id) v.fatto = !v.fatto; }); salva("cucina_spesa", spesa); ridisegnaSpesa(); }
function togliSpesa(id) { spesa = spesa.filter(function (v) { return v.id !== id; }); salva("cucina_spesa", spesa); ridisegnaSpesa(); }
function togliPresi() { spesa = spesa.filter(function (v) { return !v.fatto; }); salva("cucina_spesa", spesa); ridisegnaSpesa(); }
function ridisegnaSpesa() { [].forEach.call(document.querySelectorAll(".spesa-box"), function (b) { if (b.querySelector(".sp-lista")) disegnaSpesa(b); }); if (window.contaSpesaTab) contaSpesaTab(); }

// Disegna tutta la lista dentro un contenitore .spesa-box (stesso codice per tablet e telefono)
function disegnaSpesa(box) {
  var lista = box.querySelector(".sp-lista"), conta = box.querySelector(".sp-conta"), presiBtn = box.querySelector(".sp-presi"), sug = box.querySelector(".sp-suggeriti");
  var daPrendere = spesa.filter(function (v) { return !v.fatto; }), presi = spesa.filter(function (v) { return v.fatto; });
  conta.textContent = daPrendere.length ? daPrendere.length + " da prendere" : spesa.length ? "tutto preso ✓" : "lista vuota";
  presiBtn.hidden = !presi.length; presiBtn.textContent = "Togli i presi (" + presi.length + ")";
  lista.innerHTML = "";
  REPARTI.forEach(function (r) {   // per reparto, nell'ordine del giro al supermercato
    var qui = daPrendere.filter(function (v) { return repartoDi(v.testo) === r; }); if (!qui.length) return;
    var t = el("div", "sp-reparto"); t.textContent = r.ico + " " + r.nome; lista.appendChild(t);
    qui.forEach(function (v) { lista.appendChild(rigaSpesa(v)); });
  });
  if (presi.length) { var t2 = el("div", "sp-reparto presi"); t2.textContent = "✓ Presi"; lista.appendChild(t2); presi.forEach(function (v) { lista.appendChild(rigaSpesa(v)); }); }
  if (!spesa.length) { var vuota = el("div", "sp-vuota"); vuota.textContent = "Scrivi qui sopra cosa manca, oppure tocca un prodotto che comprate spesso."; lista.appendChild(vuota); }
  // suggeriti: i più comprati che ora non sono in lista
  var inLista = {}; spesa.forEach(function (v) { if (!v.fatto) inLista[normaleSpesa(v.testo)] = 1; });
  var f = frequenti(), top = Object.keys(f).filter(function (k) { return !inLista[k]; }).sort(function (a, b) { return f[b].n - f[a].n || f[b].ultimo - f[a].ultimo; }).slice(0, 10);
  sug.innerHTML = ""; sug.hidden = !top.length;
  top.forEach(function (k) { var b = el("button", "sp-chip"); b.type = "button"; b.textContent = "+ " + f[k].testo; b.onclick = function () { aggiungiSpesa(f[k].testo); }; sug.appendChild(b); });
}
function rigaSpesa(v) {
  var r = el("div", "sp-voce" + (v.fatto ? " fatto" : "")), c = el("button", "sp-check"); c.type = "button"; c.setAttribute("aria-label", v.fatto ? "Rimetti da prendere" : "Preso");
  c.onclick = function () { segnaSpesa(v.id); };
  var t = el("span", "sp-testo"); t.textContent = v.testo; t.onclick = function () { segnaSpesa(v.id); };
  var x = el("button", "sp-x"); x.type = "button"; x.textContent = "×"; x.setAttribute("aria-label", "Togli"); x.onclick = function () { togliSpesa(v.id); };
  r.appendChild(c); r.appendChild(t); r.appendChild(x); return r;
}
function preparaSpesa(box) {   // collega il campo e i pulsanti di un contenitore
  var f = box.querySelector(".sp-form"), i = box.querySelector(".sp-input");
  f.onsubmit = function (e) {
    e.preventDefault();
    i.value.split(/[,;\n]+/).forEach(aggiungiSpesa);   // "latte, pane, uova" = tre prodotti
    i.value = "";
  };
  box.querySelector(".sp-presi").onclick = togliPresi;
  disegnaSpesa(box);
}
function avviaSpesa() { [].forEach.call(document.querySelectorAll(".spesa-box"), function (b) { if (!b.querySelector(".sp-lista")) b.innerHTML = HTML_SPESA; preparaSpesa(b); }); }
// lo stesso blocco HTML va nel tablet e nel telefono
var HTML_SPESA = '<div class="sp-testa"><h2>Spesa</h2><span class="sp-conta"></span></div>' +
  '<form class="sp-form"><input class="sp-input" type="text" autocomplete="off" placeholder="Cosa manca? (anche più cose, con la virgola)" enterkeyhint="done"><button type="submit" aria-label="Aggiungi">+</button></form>' +
  '<div class="sp-suggeriti"></div><div class="sp-lista"></div><button type="button" class="sp-presi" hidden></button>';
