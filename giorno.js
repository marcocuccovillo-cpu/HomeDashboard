// HomeDashboard — riquadro del giorno (prima schermata, a destra):
// pixel art di Bologna che segue ora, Sole, Luna e meteo + indovinello del giorno o "Accadde oggi" (a giorni alterni).

// ---------------------------------------------------------------- indovinelli e curiosità
var DEL_GIORNO = [
  { t: "i", q: "Più è grande, meno si vede. Che cos'è?", r: "Il buio." },
  { t: "i", q: "Ha i tasti ma non apre porte, ha lo spazio ma non c'è posto, puoi entrare ma non uscire. Che cos'è?", r: "La tastiera del computer (Invio, Spazio, Esc)." },
  { t: "i", q: "Cosa si rompe appena lo nomini?", r: "Il silenzio." },
  { t: "i", q: "Una mazza e una palla costano in tutto 1,10 €. La mazza costa 1 € più della palla. Quanto costa la palla?", r: "5 centesimi (la mazza 1,05 €). Quasi tutti rispondono 10!" },
  { t: "i", q: "Ha un collo ma non ha la testa. Che cos'è?", r: "La bottiglia." },
  { t: "i", q: "Una lumaca è in fondo a un pozzo di 10 metri. Di giorno sale 3 metri, di notte scivola giù di 2. In quanti giorni esce?", r: "8 giorni: dopo 7 giorni è a 7 metri, l'ottavo giorno sale di 3 ed è fuori prima di scivolare." },
  { t: "i", q: "Più ne togli, più diventa grande. Che cos'è?", r: "La buca." },
  { t: "i", q: "Se 5 macchine fanno 5 pezzi in 5 minuti, quanto ci mettono 100 macchine a fare 100 pezzi?", r: "5 minuti: ogni macchina fa un pezzo in 5 minuti." },
  { t: "i", q: "Ha i denti ma non morde. Che cos'è?", r: "Il pettine." },
  { t: "i", q: "Mi trovi una volta in un minuto, due volte in un momento e mai in cento anni. Chi sono?", r: "La lettera M." },
  { t: "i", q: "In un lago le ninfee raddoppiano ogni giorno e in 48 giorni coprono tutto il lago. In quanti giorni ne coprono metà?", r: "In 47 giorni: il giorno dopo raddoppiano e lo coprono tutto." },
  { t: "i", q: "Corre sempre ma non si stanca, ha un letto ma non dorme mai. Che cos'è?", r: "Il fiume." },
  { t: "i", q: "Ti segue dappertutto ma sparisce al buio. Che cos'è?", r: "L'ombra." },
  { t: "i", q: "Quante volte puoi sottrarre 5 da 25?", r: "Una volta sola: dopo è 20, non più 25." },
  { t: "i", q: "Si bagna mentre asciuga. Che cos'è?", r: "L'asciugamano." },
  { t: "i", q: "Ci sono 10 tipi di persone: quelle che capiscono il sistema binario e quelle che no. Quante persone sono?", r: "Due: 10 in binario vale 2." },
  { t: "i", q: "Ha una testa e una coda ma niente corpo. Che cos'è?", r: "La moneta." },
  { t: "i", q: "Sei in una stanza buia con un solo fiammifero. Ci sono una candela, una lampada a olio e un camino. Cosa accendi per primo?", r: "Il fiammifero." },
  { t: "i", q: "Ha un pollice e quattro dita ma non è viva. Che cos'è?", r: "Il guanto." },
  { t: "i", q: "Cosa sale e non scende mai?", r: "L'età." },
  { t: "i", q: "Ha 13 cuori ma nessun altro organo. Che cos'è?", r: "Un mazzo di carte francesi." },
  { t: "i", q: "Ha le foglie ma non è un albero, ha il dorso ma non è un animale. Che cos'è?", r: "Il libro." }
];

// "Accadde oggi": scienza, spazio, informatica e videogiochi. [mese, giorno, anno, testo]
// Se oggi non c'è niente, si mostra il prossimo anniversario in arrivo.
var ACCADDE = [
  [1, 1, 1983, "ARPANET passa al protocollo TCP/IP: è considerato il compleanno di Internet."],
  [1, 7, 1610, "Galileo punta il cannocchiale su Giove e scopre tre delle sue lune (la quarta pochi giorni dopo)."],
  [1, 8, 1942, "Nasce a Oxford Stephen Hawking."],
  [1, 9, 2007, "Steve Jobs presenta il primo iPhone: «un iPod, un telefono e un comunicatore Internet»."],
  [1, 15, 2001, "Nasce Wikipedia."],
  [1, 24, 1984, "Esce il primo Macintosh, lanciato con lo spot «1984»."],
  [1, 31, 1958, "Parte Explorer 1, il primo satellite americano: scopre le fasce di radiazione di Van Allen."],
  [2, 4, 2004, "Mark Zuckerberg lancia «TheFacebook» dalla sua stanza di Harvard."],
  [2, 10, 1996, "Il computer Deep Blue di IBM batte per la prima volta Kasparov in una partita a scacchi."],
  [2, 11, 1847, "Nasce Thomas Edison."],
  [2, 14, 1990, "Voyager 1, a 6 miliardi di km, si volta e fotografa la Terra: il «pallido puntino azzurro»."],
  [2, 15, 1564, "Nasce a Pisa Galileo Galilei."],
  [2, 18, 1930, "Clyde Tombaugh scopre Plutone confrontando due lastre fotografiche."],
  [2, 21, 1986, "Esce in Giappone il primo The Legend of Zelda."],
  [2, 27, 1996, "Escono in Giappone Pokémon Rosso e Verde per Game Boy."],
  [2, 28, 1953, "Watson e Crick capiscono che il DNA è una doppia elica."],
  [3, 3, 2017, "Esce la Nintendo Switch."],
  [3, 4, 2000, "Esce in Giappone la PlayStation 2, la console più venduta di sempre."],
  [3, 10, 1876, "Prima telefonata della storia: «Signor Watson, venga qui, ho bisogno di lei»."],
  [3, 12, 1989, "Tim Berners-Lee presenta al CERN la proposta che diventerà il World Wide Web."],
  [3, 14, 1879, "Nasce Albert Einstein. Ed è anche il Pi Greco Day: 3/14!"],
  [3, 18, 1965, "Aleksej Leonov esce dalla capsula: è la prima passeggiata nello spazio."],
  [3, 21, 2006, "Jack Dorsey scrive il primo tweet: «just setting up my twttr»."],
  [4, 1, 1976, "Steve Jobs e Steve Wozniak fondano Apple."],
  [4, 3, 1973, "Martin Cooper di Motorola fa la prima chiamata da un cellulare, per strada a New York."],
  [4, 4, 1975, "Bill Gates e Paul Allen fondano Microsoft."],
  [4, 10, 2019, "Viene mostrata la prima foto di un buco nero, al centro della galassia M87."],
  [4, 12, 1961, "Jurij Gagarin è il primo essere umano nello spazio: un'orbita in 108 minuti."],
  [4, 21, 1989, "Esce in Giappone il Game Boy, insieme a Tetris."],
  [4, 24, 1990, "Lo Space Shuttle Discovery porta in orbita il telescopio spaziale Hubble."],
  [4, 25, 1953, "Esce su Nature l'articolo di Watson e Crick sulla struttura del DNA."],
  [4, 30, 1993, "Il CERN rende il World Wide Web libero e gratuito per tutti."],
  [5, 5, 1961, "Alan Shepard è il primo americano nello spazio."],
  [5, 11, 1997, "Deep Blue vince l'intera sfida contro Kasparov: un computer batte il campione del mondo di scacchi."],
  [5, 14, 1796, "Edward Jenner fa la prima vaccinazione contro il vaiolo."],
  [5, 22, 1980, "Esce in Giappone Pac-Man."],
  [5, 25, 1977, "Esce nei cinema americani il primo Star Wars."],
  [6, 6, 1984, "Aleksej Pažitnov, a Mosca, finisce la prima versione di Tetris."],
  [6, 16, 1963, "Valentina Tereškova è la prima donna nello spazio."],
  [6, 19, 1623, "Nasce Blaise Pascal, che a 19 anni costruirà una delle prime calcolatrici meccaniche."],
  [6, 23, 1912, "Nasce Alan Turing, padre dell'informatica."],
  [6, 29, 2007, "Il primo iPhone arriva nei negozi americani."],
  [6, 30, 1908, "Esplosione di Tunguska: un oggetto spaziale abbatte 80 milioni di alberi in Siberia."],
  [7, 4, 2012, "Il CERN annuncia la scoperta del bosone di Higgs."],
  [7, 6, 2016, "Esce Pokémon GO: le strade si riempiono di allenatori."],
  [7, 10, 1856, "Nasce Nikola Tesla."],
  [7, 12, 2022, "Il telescopio James Webb mostra le sue prime immagini a colori."],
  [7, 14, 2015, "La sonda New Horizons sorvola Plutone e ne vede il «cuore»."],
  [7, 15, 1983, "Esce in Giappone il Famicom, il Nintendo a 8 bit."],
  [7, 20, 1969, "Apollo 11: Neil Armstrong e Buzz Aldrin camminano sulla Luna."],
  [7, 29, 1958, "Viene firmata la legge che crea la NASA."],
  [8, 6, 1991, "Tim Berners-Lee annuncia al mondo il World Wide Web."],
  [8, 6, 2012, "Il rover Curiosity atterra su Marte."],
  [8, 12, 1981, "IBM presenta il suo primo Personal Computer, il modello 5150."],
  [8, 24, 2006, "Plutone viene declassato a pianeta nano."],
  [8, 25, 1991, "Linus Torvalds annuncia Linux: «solo un hobby, non sarà grande e professionale»."],
  [8, 25, 2012, "Voyager 1 esce dal Sistema Solare ed entra nello spazio interstellare."],
  [9, 4, 1998, "Larry Page e Sergey Brin fondano Google."],
  [9, 5, 1977, "Parte la sonda Voyager 1, oggi l'oggetto umano più lontano di sempre."],
  [9, 9, 1947, "Una falena trovata in un relè del computer Harvard Mark II diventa il primo «bug» documentato."],
  [9, 12, 1940, "Quattro ragazzi e un cane scoprono le pitture della grotta di Lascaux."],
  [9, 13, 1985, "Esce in Giappone Super Mario Bros."],
  [9, 23, 1846, "Viene scoperto Nettuno, nel punto che i calcoli avevano previsto."],
  [9, 27, 1983, "Richard Stallman annuncia il progetto GNU: nasce il software libero."],
  [9, 28, 1928, "Alexander Fleming nota la muffa che lo porterà alla penicillina."],
  [10, 1, 1958, "La NASA inizia ufficialmente a lavorare."],
  [10, 4, 1957, "Lo Sputnik 1 è il primo satellite artificiale: inizia l'era spaziale."],
  [10, 18, 1958, "«Tennis for Two», su un oscilloscopio, è uno dei primi videogiochi della storia."],
  [10, 23, 2001, "Apple presenta l'iPod: «mille canzoni in tasca»."],
  [10, 29, 1969, "Primo messaggio su ARPANET: doveva essere «LOGIN», arrivò solo «LO» prima del crash."],
  [11, 3, 1957, "Parte lo Sputnik 2 con la cagnolina Laika."],
  [11, 7, 1867, "Nasce Marie Curie, unica persona premiata con il Nobel in due scienze diverse."],
  [11, 8, 1895, "Wilhelm Röntgen scopre i raggi X."],
  [11, 12, 2014, "Il lander Philae della missione Rosetta si posa su una cometa."],
  [11, 15, 2001, "Esce la prima Xbox."],
  [11, 16, 1974, "Dal radiotelescopio di Arecibo parte un messaggio verso l'ammasso M13: arriverà tra 25.000 anni."],
  [11, 20, 1985, "Esce Windows 1.0."],
  [11, 24, 1859, "Darwin pubblica «L'origine delle specie»."],
  [11, 29, 1972, "Atari mette in un bar della California il primo Pong da sala giochi."],
  [12, 3, 1994, "Esce in Giappone la prima PlayStation."],
  [12, 9, 1968, "Douglas Engelbart mostra mouse, finestre e videochiamate: «la madre di tutte le demo»."],
  [12, 10, 1815, "Nasce Ada Lovelace, autrice del primo programma per computer."],
  [12, 17, 1903, "I fratelli Wright fanno il primo volo a motore: 12 secondi."],
  [12, 21, 1968, "Parte Apollo 8, il primo volo umano intorno alla Luna."],
  [12, 23, 1947, "Ai Bell Labs funziona il primo transistor."],
  [12, 24, 1968, "Dall'Apollo 8 viene scattata «Earthrise», la Terra che sorge dietro la Luna."],
  [12, 25, 1642, "Nasce Isaac Newton."],
  [12, 25, 2021, "Parte il telescopio spaziale James Webb."]
];
function accaddeDi(oggi) {   // gli eventi di oggi, altrimenti quelli del prossimo giorno che ne ha
  for (var i = 0; i < 366; i++) {
    var d = new Date(oggi.getFullYear(), oggi.getMonth(), oggi.getDate() + i);
    var l = ACCADDE.filter(function (a) { return a[0] === d.getMonth() + 1 && a[1] === d.getDate(); });
    if (l.length) return { giorni: i, d: d, e: l[Math.floor(oggi.getFullYear() + oggi.getDate()) % l.length] };
  }
  return null;
}
function disegnaGiorno() {   // un giorno l'indovinello, il giorno dopo "Accadde oggi"
  var oggi = new Date(), n = Math.floor((Date.UTC(oggi.getFullYear(), oggi.getMonth(), oggi.getDate())) / 864e5);
  var a = n % 2 ? accaddeDi(oggi) : null, x = a ? null : DEL_GIORNO[Math.floor(n / 2) % DEL_GIORNO.length];
  if (a) {
    $("gioco-tipo").textContent = a.giorni === 0 ? "Accadde oggi" : a.giorni === 1 ? "Accadde domani" : "Accadde il " + a.d.getDate() + " " + MESI[a.d.getMonth()];
    $("gioco-testo").textContent = a.e[2] + " · " + a.e[3];
  } else {
    $("gioco-tipo").textContent = "Indovinello del giorno";
    $("gioco-testo").textContent = x.q;
  }
  $("gioco-sol").hidden = !x; $("gioco-risposta").hidden = true; $("gioco-risposta").textContent = x ? x.r : "";
  disegnaGiorno.n = n;
}
$("gioco-sol").onclick = function () { $("gioco-risposta").hidden = false; $("gioco-sol").hidden = true; };

// ---------------------------------------------------------------- radar della pioggia (previsione a 15 minuti)
// window.pioggia = [{t, mm}] da Open-Meteo (minutely_15): ogni voce è la pioggia nei 15 minuti dopo t.
function statoPioggia() {
  var p = window.pioggia; if (!p || !p.length) return null;
  var ora = Date.now(), Q = 15 * 60000;
  var adesso = p.filter(function (x) { return x.t <= ora && ora < x.t + Q; })[0];
  var futuro = p.filter(function (x) { return x.t > ora - Q; }).slice(0, 8);
  var mm = adesso ? adesso.mm : 0, testo;
  function tra(x) { var m = Math.max(5, Math.round((x.t - ora) / 60000 / 5) * 5); return m >= 60 ? "tra " + Math.floor(m / 60) + " h " + (m % 60 ? m % 60 + " min" : "") : "tra " + m + " min"; }
  if (mm >= 0.1) {
    var fine = futuro.filter(function (x) { return x.t > ora && x.mm < 0.1; })[0];
    testo = fine ? "☂ Smette " + tra(fine) : "☂ Piove per le prossime 2 ore";
  } else {
    var arriva = futuro.filter(function (x) { return x.t > ora && x.mm >= 0.1; })[0];
    testo = arriva ? "🌧 Pioggia " + tra(arriva) : "Niente pioggia nelle prossime 2 ore";
    if (arriva) var minuti = (arriva.t - ora) / 60000;
  }
  return { mm: mm, futuro: futuro, testo: testo, arrivaTra: minuti };
}
function disegnaPioggia() {
  var s = statoPioggia(), barra = $("pioggia-barra"); if (!barra) return;
  $("pioggia").hidden = !s; if (!s) return;
  $("pioggia-testo").textContent = s.testo;
  barra.innerHTML = "";
  s.futuro.forEach(function (x) {
    var i = document.createElement("i"); if (x.mm >= 0.1) i.className = "p";
    i.style.height = Math.max(12, Math.min(100, x.mm / 1.5 * 100)) + "%";
    i.title = new Date(x.t).getHours() + ":" + due(new Date(x.t).getMinutes()) + " · " + x.mm.toFixed(1) + " mm";
    barra.appendChild(i);
  });
}

// ---------------------------------------------------------------- pixel art
var PX = { W: 96, H: 34, f: 0, fulmine: 0 };
function casuale(seme) { var s = seme; return function () { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff; }; }
function mescola(a, b, k) {   // colori #rrggbb
  function h(c, i) { return parseInt(c.substr(1 + i * 2, 2), 16); }
  var r = [0, 1, 2].map(function (i) { return Math.round(h(a, i) + (h(b, i) - h(a, i)) * k); });
  return "rgb(" + r.join(",") + ")";
}
function momento(ora) {   // 0 notte · dall'alba al giorno · dal giorno al tramonto · notte
  var s = alba_tramonto(ora, LAT, LON), t = ora.getTime(), a = s.alba.getTime(), b = s.tramonto.getTime(), M = 45 * 60000;
  var fase = t < a - M || t > b + M ? "notte" : t < a + M ? "alba" : t > b - M ? "tramonto" : "giorno";
  return { fase: fase, sole: Math.max(0, Math.min(1, (t - a) / (b - a))), alba: a, tramonto: b, M: M, t: t };
}
var CIELI = {   // [alto, basso]
  notte: ["#0b1026", "#1d2752"], alba: ["#5b6aa8", "#f2a97a"], giorno: ["#5aa6e0", "#bfe3f5"], tramonto: ["#3b3f7a", "#f08a5d"]
};
var STELLE = (function () { var r = casuale(7), out = []; for (var i = 0; i < 40; i++) out.push([Math.floor(r() * 96), Math.floor(r() * 22), r()]); return out; })();
var FINESTRE = (function () { var r = casuale(11), out = []; for (var i = 0; i < 60; i++) out.push([r(), r(), r()]); return out; })();
var CITTA = (function () {   // profilo della città: [x, larghezza, altezza dal suolo]
  return [[0, 7, 8], [6, 5, 11], [11, 8, 7], [18, 6, 10], [24, 9, 6], [32, 5, 9], [37, 10, 12], [47, 6, 8],
          [62, 7, 9], [69, 5, 11], [74, 9, 7], [83, 6, 10], [89, 7, 8]];
})();
function disegnaPixel() {
  var c = $("pixel"); if (!c) return; var g = c.getContext("2d"), W = PX.W, H = PX.H, SUOLO = 30;
  var ora = new Date(), m = momento(ora), tipo = window.meteoAdesso || "sole", rad = statoPioggia();
  if (rad && rad.mm >= 0.1 && tipo !== "neve" && tipo !== "temporale") tipo = "pioggia";   // il radar ha la precedenza
  if (rad && rad.mm < 0.1 && tipo === "pioggia") tipo = "nuvole";
  var cupo = { nuvole: .35, pioggia: .5, neve: .3, temporale: .7, nebbia: .3 }[tipo] || 0;
  PX.f++;
  // cielo
  var cols = CIELI[m.fase];
  for (var y = 0; y < SUOLO; y++) { g.fillStyle = mescola(cols[0], cols[1], y / SUOLO); g.fillRect(0, y, W, 1); }
  if (cupo) { g.fillStyle = "rgba(90,96,110," + (cupo * (m.fase === "notte" ? .4 : .6)) + ")"; g.fillRect(0, 0, W, SUOLO); }
  // stelle e Luna (di notte), Sole (di giorno)
  if (m.fase === "notte" && cupo < .5) {
    STELLE.forEach(function (s) {
      var acc = (Math.sin(PX.f / 6 + s[2] * 20) + 1) / 2;
      g.fillStyle = "rgba(255,255,230," + (.25 + acc * .75 * (1 - cupo)) + ")"; g.fillRect(s[0], s[1], 1, 1);
    });
  }
  if (m.fase === "notte" || m.fase === "tramonto" || m.fase === "alba") {
    var l = luna(ora), lx = 80, ly = 7, R = 4;
    for (var dy = -R; dy <= R; dy++) for (var dx = -R; dx <= R; dx++) {
      if (dx * dx + dy * dy > R * R + 1) continue;
      var k = Math.cos(2 * Math.PI * l.eta / SINODICO), lim = Math.sqrt(Math.max(0, R * R - dy * dy)) * k;
      var luce = l.eta < SINODICO / 2 ? dx > lim : dx < -lim;   // crescente: luce a destra
      g.fillStyle = luce ? "#f6e3a1" : "rgba(40,44,70,.85)"; g.fillRect(lx + dx, ly + dy, 1, 1);
    }
  }
  if (m.fase !== "notte") {
    var sx = Math.round(6 + m.sole * 84), sy = Math.round(24 - Math.sin(m.sole * Math.PI) * 19);
    g.fillStyle = cupo > .4 ? "rgba(255,236,170,.45)" : "#ffd75e";
    g.fillRect(sx - 2, sy - 1, 5, 3); g.fillRect(sx - 1, sy - 2, 3, 5);
  }
  // nuvole
  if (tipo !== "sole") {
    var n = tipo === "poco" ? 2 : 5;
    for (var i = 0; i < n; i++) {
      var cx = ((i * 23 + PX.f * (0.12 + i * .03)) % 120) - 14, cy = 3 + (i * 5) % 12;
      g.fillStyle = m.fase === "notte" ? "rgba(120,126,150,.75)" : cupo > .5 ? "rgba(140,146,160,.95)" : "rgba(255,255,255,.92)";
      g.fillRect(cx, cy + 1, 12, 3); g.fillRect(cx + 2, cy, 7, 1); g.fillRect(cx + 3, cy - 1, 4, 1);
    }
  }
  // città: case, portici e le Due Torri
  var muro = m.fase === "notte" ? "#1a1720" : m.fase === "giorno" ? "#9c5a3c" : "#5a3a36";
  var tetto = m.fase === "notte" ? "#120f16" : m.fase === "giorno" ? "#7a3f2a" : "#3e2828";
  CITTA.forEach(function (b, i) {
    g.fillStyle = i % 2 ? muro : mescola(m.fase === "notte" ? "#1a1720" : "#b06a48", tetto, .3);
    g.fillRect(b[0], SUOLO - b[2], b[1], b[2]);
    g.fillStyle = tetto; g.fillRect(b[0], SUOLO - b[2], b[1], 1);
  });
  // Torre degli Asinelli (alta) e Garisenda (pendente)
  g.fillStyle = m.fase === "notte" ? "#16121a" : "#8a4a30"; g.fillRect(54, 3, 3, SUOLO - 3); g.fillRect(53, 2, 5, 1); g.fillRect(55, 0, 1, 2);
  for (var yy = 14; yy < SUOLO; yy++) g.fillRect(58 + Math.floor((yy - 14) / 8), yy, 3, 1);
  // finestre accese la sera
  if (m.fase !== "giorno") {
    FINESTRE.forEach(function (w, i) {
      var b = CITTA[Math.floor(w[0] * CITTA.length)], fx = b[0] + 1 + Math.floor(w[1] * (b[1] - 2)), fy = SUOLO - 2 - Math.floor(w[2] * (b[2] - 3));
      var accesa = (Math.sin(i * 7.1 + Math.floor(PX.f / 40)) > -.2);
      if (accesa) { g.fillStyle = "#ffd36b"; g.fillRect(fx, fy, 1, 1); }
    });
  }
  // portici al livello della strada
  g.fillStyle = m.fase === "notte" ? "#221d26" : "#c98a5e"; g.fillRect(0, SUOLO, W, H - SUOLO);
  g.fillStyle = m.fase === "notte" ? "#0e0c12" : "#6b3a26";
  for (var ax = 1; ax < W; ax += 4) { g.fillRect(ax, SUOLO + 1, 2, 3); }
  // pioggia, neve, nebbia, fulmini
  if (rad && rad.arrivaTra != null && rad.arrivaTra < 60) {   // nuvole scure che arrivano da ovest
    var avanza = 1 - rad.arrivaTra / 60, fronte = Math.round(avanza * 70) - 10;
    g.fillStyle = "rgba(70,78,98,.85)";
    for (var nx = -20; nx < fronte; nx += 9) { g.fillRect(nx, 2 + (nx & 3), 12, 4); g.fillRect(nx + 3, 1 + (nx & 3), 6, 1); }
  }
  if (tipo === "pioggia" || tipo === "temporale") {
    g.fillStyle = "rgba(190,215,255,.7)";
    var gocce = rad && rad.mm >= 0.1 ? Math.min(90, Math.round(15 + rad.mm * 45)) : 40;   // più pioggia, più gocce
    for (var p = 0; p < gocce; p++) { var px = (p * 37 + PX.f * 2) % W, py = (p * 13 + PX.f * 3) % H; g.fillRect(px, py, 1, 2); }
  }
  if (tipo === "neve") {
    g.fillStyle = "rgba(255,255,255,.9)";
    for (var q = 0; q < 35; q++) { var qx = (q * 29 + Math.round(Math.sin((PX.f + q * 9) / 8) * 2)) % W, qy = (q * 11 + PX.f) % H; g.fillRect(qx, qy, 1, 1); }
  }
  if (tipo === "nebbia") { for (var b2 = 0; b2 < 4; b2++) { g.fillStyle = "rgba(220,220,225,.35)"; g.fillRect(0, 14 + b2 * 5, W, 2); } }
  if (tipo === "temporale") {
    if (PX.fulmine > 0) { g.fillStyle = "rgba(255,255,255," + (PX.fulmine * .25) + ")"; g.fillRect(0, 0, W, H); PX.fulmine--; }
    else if (Math.random() < .01) PX.fulmine = 3;
  }
}
function avviaGiorno() {
  disegnaGiorno(); disegnaPixel(); disegnaPioggia();
  setInterval(disegnaPioggia, 60 * 1000);
  setInterval(disegnaPixel, 125);   // 8 fotogrammi al secondo
  setInterval(function () {   // a mezzanotte cambia indovinello
    var oggi = new Date(), n = Math.floor(Date.UTC(oggi.getFullYear(), oggi.getMonth(), oggi.getDate()) / 864e5);
    if (n !== disegnaGiorno.n) disegnaGiorno();
  }, 60 * 1000);
}
