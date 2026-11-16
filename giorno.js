// HomeDashboard — riquadro del giorno (prima schermata, a destra):
// pixel art di Bologna che segue ora, Sole, Luna e meteo + indovinello o curiosità del giorno.

// ---------------------------------------------------------------- indovinelli e curiosità
var DEL_GIORNO = [
  { t: "i", q: "Più è grande, meno si vede. Che cos'è?", r: "Il buio." },
  { t: "c", q: "La luce del Sole impiega circa 8 minuti e 20 secondi ad arrivare fino a noi: quando guardi il tramonto, il Sole è già un po' più in basso di come lo vedi." },
  { t: "i", q: "Ha i tasti ma non apre porte, ha lo spazio ma non c'è posto, puoi entrare ma non uscire. Che cos'è?", r: "La tastiera del computer (Invio, Spazio, Esc)." },
  { t: "c", q: "La Torre degli Asinelli è alta circa 97 metri e per arrivare in cima ci sono 498 gradini." },
  { t: "i", q: "Cosa si rompe appena lo nomini?", r: "Il silenzio." },
  { t: "c", q: "La Stazione Spaziale fa un giro della Terra in circa 90 minuti: gli astronauti vedono 16 albe e 16 tramonti al giorno." },
  { t: "i", q: "Una mazza e una palla costano in tutto 1,10 €. La mazza costa 1 € più della palla. Quanto costa la palla?", r: "5 centesimi (la mazza 1,05 €). Quasi tutti rispondono 10!" },
  { t: "c", q: "Il primo \"bug\" informatico documentato era una vera falena, trovata nel 1947 dentro un relè del computer Harvard Mark II. Fu incollata sul registro di bordo." },
  { t: "i", q: "Ha un collo ma non ha la testa. Che cos'è?", r: "La bottiglia." },
  { t: "c", q: "I portici di Bologna sono patrimonio UNESCO dal 2021: in tutto il comune sono più di 60 km." },
  { t: "i", q: "Una lumaca è in fondo a un pozzo di 10 metri. Di giorno sale 3 metri, di notte scivola giù di 2. In quanti giorni esce?", r: "8 giorni: dopo 7 giorni è a 7 metri, l'ottavo giorno sale di 3 ed è fuori prima di scivolare." },
  { t: "c", q: "Un fulmine arriva a circa 30.000 °C: è più o meno cinque volte più caldo della superficie del Sole." },
  { t: "i", q: "Più ne togli, più diventa grande. Che cos'è?", r: "La buca." },
  { t: "c", q: "Su Venere un giorno (243 giorni terrestri) dura più di un anno (225 giorni terrestri)." },
  { t: "i", q: "Se 5 macchine fanno 5 pezzi in 5 minuti, quanto ci mettono 100 macchine a fare 100 pezzi?", r: "5 minuti: ogni macchina fa un pezzo in 5 minuti." },
  { t: "c", q: "Il QR code è stato inventato nel 1994 in Giappone, alla Denso Wave, per tenere traccia dei pezzi delle automobili in fabbrica." },
  { t: "i", q: "Ha i denti ma non morde. Che cos'è?", r: "Il pettine." },
  { t: "c", q: "\"Wi-Fi\" non è l'abbreviazione di niente: è un nome di fantasia inventato da un'agenzia di marketing nel 1999." },
  { t: "i", q: "Mi trovi una volta in un minuto, due volte in un momento e mai in cento anni. Chi sono?", r: "La lettera M." },
  { t: "c", q: "La Luna si allontana dalla Terra di circa 3,8 centimetri all'anno." },
  { t: "i", q: "In un lago le ninfee raddoppiano ogni giorno e in 48 giorni coprono tutto il lago. In quanti giorni ne coprono metà?", r: "In 47 giorni: il giorno dopo raddoppiano e lo coprono tutto." },
  { t: "c", q: "Il primo SMS della storia fu inviato nel 1992 e diceva \"Merry Christmas\"." },
  { t: "i", q: "Corre sempre ma non si stanca, ha un letto ma non dorme mai. Che cos'è?", r: "Il fiume." },
  { t: "c", q: "Gli orologi Unix a 32 bit andranno in tilt il 19 gennaio 2038 alle 3:14:07 UTC: i secondi dal 1970 non ci staranno più." },
  { t: "i", q: "Ti segue dappertutto ma sparisce al buio. Che cos'è?", r: "L'ombra." },
  { t: "c", q: "Il polpo ha tre cuori e il sangue blu." },
  { t: "i", q: "Quante volte puoi sottrarre 5 da 25?", r: "Una volta sola: dopo è 20, non più 25." },
  { t: "c", q: "Le banane, dal punto di vista botanico, sono bacche. Le fragole invece no." },
  { t: "i", q: "Si bagna mentre asciuga. Che cos'è?", r: "L'asciugamano." },
  { t: "c", q: "Il primo sito web della storia, del 1991, è ancora online: info.cern.ch." },
  { t: "i", q: "Ci sono 10 tipi di persone: quelle che capiscono il sistema binario e quelle che no. Quante persone sono?", r: "Due: 10 in binario vale 2." },
  { t: "c", q: "Gli squali esistono da più tempo degli alberi: circa 450 milioni di anni contro circa 385." },
  { t: "i", q: "Ha una testa e una coda ma niente corpo. Che cos'è?", r: "La moneta." },
  { t: "c", q: "La Terra non è una sfera perfetta: all'equatore il diametro è circa 43 km più grande che da polo a polo." },
  { t: "i", q: "Sei in una stanza buia con un solo fiammifero. Ci sono una candela, una lampada a olio e un camino. Cosa accendi per primo?", r: "Il fiammifero." },
  { t: "c", q: "Il cervello consuma circa il 20% dell'energia di tutto il corpo, pur pesando circa il 2%." },
  { t: "i", q: "Ha un pollice e quattro dita ma non è viva. Che cos'è?", r: "Il guanto." },
  { t: "c", q: "Per un computer 0,1 + 0,2 fa 0,30000000000000004: colpa di come i numeri con la virgola vengono scritti in binario." },
  { t: "i", q: "Cosa sale e non scende mai?", r: "L'età." },
  { t: "c", q: "Un anno luce è circa 9.460 miliardi di chilometri. La stella più vicina dopo il Sole è a circa 4,2 anni luce." },
  { t: "i", q: "Ha 13 cuori ma nessun altro organo. Che cos'è?", r: "Un mazzo di carte francesi." },
  { t: "c", q: "Una tazza di caffè americano contiene più caffeina di un espresso: l'espresso è più concentrato ma molto più piccolo." },
  { t: "i", q: "Ha le foglie ma non è un albero, ha il dorso ma non è un animale. Che cos'è?", r: "Il libro." },
  { t: "c", q: "La Garisenda, la torre più bassa delle Due Torri, è alta circa 48 metri: in origine era più alta, ma fu accorciata nel Trecento perché pendeva troppo." }
];
function disegnaGiorno() {
  var oggi = new Date(), n = Math.floor((Date.UTC(oggi.getFullYear(), oggi.getMonth(), oggi.getDate())) / 864e5);
  var x = DEL_GIORNO[n % DEL_GIORNO.length];
  $("gioco-tipo").textContent = x.t === "i" ? "Indovinello del giorno" : "Lo sapevi?";
  $("gioco-testo").textContent = x.q;
  $("gioco-sol").hidden = x.t !== "i"; $("gioco-risposta").hidden = true; $("gioco-risposta").textContent = x.r || "";
  disegnaGiorno.n = n;
}
$("gioco-sol").onclick = function () { $("gioco-risposta").hidden = false; $("gioco-sol").hidden = true; };

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
  var ora = new Date(), m = momento(ora), tipo = window.meteoAdesso || "sole";
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
  if (tipo === "pioggia" || tipo === "temporale") {
    g.fillStyle = "rgba(190,215,255,.7)";
    for (var p = 0; p < 40; p++) { var px = (p * 37 + PX.f * 2) % W, py = (p * 13 + PX.f * 3) % H; g.fillRect(px, py, 1, 2); }
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
  disegnaGiorno(); disegnaPixel();
  setInterval(disegnaPixel, 125);   // 8 fotogrammi al secondo
  setInterval(function () {   // a mezzanotte cambia indovinello
    var oggi = new Date(), n = Math.floor(Date.UTC(oggi.getFullYear(), oggi.getMonth(), oggi.getDate()) / 864e5);
    if (n !== disegnaGiorno.n) disegnaGiorno();
  }, 60 * 1000);
}
