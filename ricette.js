// HomeDashboard — ricetta del giorno (seconda schermata, sotto Rete).
// Ricette semplici per 2 persone, scelte per stagione; ogni tempo di cottura è un tasto che avvia il timer.
// Nei passi, {10|Pasta} diventa un tasto "Pasta 10 min ▶".

var RICETTE = [
  { t: "Pasta e fagioli", s: "ai", tempo: "35 min", ingr: "160 g ditalini · 1 barattolo di borlotti · 1 carota, 1 sedano, ½ cipolla · 1 cucchiaio di concentrato · rosmarino · olio, sale, pepe",
    p: ["Trita carota, sedano e cipolla e soffriggi in 3 cucchiai d'olio con il rosmarino {6|Soffritto}.", "Aggiungi i fagioli scolati, il concentrato e 700 ml d'acqua calda; frulla metà dei fagioli per una crema più densa. Fai sobbollire {10|Brodo fagioli}.",
        "Butta i ditalini direttamente nella pentola e cuoci mescolando spesso, aggiungendo acqua se serve {10|Ditalini}.", "Lascia riposare 2 minuti, poi olio crudo e pepe."] },
  { t: "Risotto alla zucca", s: "ai", tempo: "35 min", ingr: "160 g riso Carnaroli · 300 g zucca a cubetti · ½ cipolla · 1 l brodo vegetale caldo · 30 g burro · 40 g Parmigiano",
    p: ["Appassisci la cipolla tritata con un filo d'olio e metà della zucca {5|Cipolla e zucca}.", "Aggiungi il riso e tostalo mescolando {2|Tostatura}.",
        "Bagna con un mestolo di brodo alla volta, aggiungi la zucca rimasta e porta a cottura {16|Risotto}.", "Spegni, manteca con burro e Parmigiano, coperchio e riposo {2|Mantecatura}."] },
  { t: "Vellutata di zucca e patate", s: "ai", tempo: "35 min", ingr: "500 g zucca · 1 patata · ½ cipolla · 600 ml brodo · olio · crostini · semi di zucca (facoltativi)",
    p: ["Rosola la cipolla con l'olio {4|Cipolla}.", "Aggiungi zucca e patata a pezzi, copri con il brodo e cuoci a fuoco medio {25|Zucca}.",
        "Frulla tutto con il frullatore a immersione, regola di sale e servi con crostini e un filo d'olio."] },
  { t: "Tortellini in brodo", s: "ai", tempo: "25 min", ingr: "250 g tortellini freschi · 1 l brodo di carne (meglio fatto in casa) · Parmigiano grattugiato",
    p: ["Porta il brodo a bollore leggero e assaggia di sale.", "Butta i tortellini e cuocili senza far bollire troppo forte, così non si aprono {4|Tortellini}.", "Servi con il brodo e tanto Parmigiano."] },
  { t: "Spaghetti aglio, olio e peperoncino", s: "tutte", tempo: "15 min", ingr: "180 g spaghetti · 2 spicchi d'aglio · 1 peperoncino · 5 cucchiai d'olio · prezzemolo",
    p: ["Metti a cuocere gli spaghetti in acqua salata {10|Spaghetti}.", "Intanto scalda l'olio con aglio a fettine e peperoncino a fuoco dolce, senza far scurire l'aglio {3|Aglio}.",
        "Scola la pasta al dente tenendo un mestolo d'acqua, saltala nella padella con l'acqua e il prezzemolo {1|Mantecatura}."] },
  { t: "Cacio e pepe", s: "tutte", tempo: "15 min", ingr: "180 g tonnarelli o spaghetti · 100 g Pecorino Romano grattugiato finissimo · pepe nero in grani",
    p: ["Cuoci la pasta in poca acqua, poco salata {9|Tonnarelli}.", "Tosta il pepe macinato grosso in padella e aggiungi un mestolo d'acqua di cottura.",
        "In una ciotola fai una crema con il Pecorino e un po' d'acqua di cottura tiepida (non bollente!).", "Salta la pasta nel pepe, togli dal fuoco e aggiungi la crema mescolando energicamente."] },
  { t: "Carbonara", s: "tutte", tempo: "20 min", ingr: "180 g spaghetti o rigatoni · 100 g guanciale · 3 tuorli · 50 g Pecorino Romano · pepe nero",
    p: ["Taglia il guanciale a listarelle e rosolalo in padella senza olio finché è croccante {8|Guanciale}.", "Cuoci la pasta in acqua salata {10|Pasta}.",
        "Sbatti i tuorli con il Pecorino e tanto pepe.", "Scola la pasta nel guanciale, togli dal fuoco, aggiungi le uova e un goccio d'acqua di cottura e mescola finché diventa cremosa."] },
  { t: "Pasta alla gricia", s: "tutte", tempo: "20 min", ingr: "180 g rigatoni · 100 g guanciale · 60 g Pecorino Romano · pepe nero",
    p: ["Rosola il guanciale a fuoco medio finché il grasso diventa trasparente {7|Guanciale}.", "Cuoci i rigatoni {11|Rigatoni}.",
        "Scola al dente nel guanciale con un mestolo d'acqua, aggiungi Pecorino e pepe fuori dal fuoco e manteca."] },
  { t: "Spaghetti al pomodoro e basilico", s: "pe", tempo: "25 min", ingr: "180 g spaghetti · 400 g pomodorini o passata · 1 spicchio d'aglio · basilico · olio",
    p: ["Soffriggi l'aglio nell'olio, aggiungi i pomodori e cuoci il sugo {15|Sugo}.", "Cuoci gli spaghetti {10|Spaghetti}.",
        "Scola al dente nel sugo, salta un minuto e completa con basilico e olio crudo."] },
  { t: "Frittata di patate e cipolle", s: "tutte", tempo: "35 min", ingr: "4 uova · 2 patate · 1 cipolla · 30 g Parmigiano · olio, sale, pepe",
    p: ["Affetta sottili patate e cipolla e cuocile in padella con l'olio, coperte {15|Patate}.", "Sbatti le uova con Parmigiano, sale e pepe e versale sulle patate.",
        "Cuoci a fuoco basso col coperchio {8|Frittata lato 1}.", "Gira la frittata aiutandoti con il coperchio e finisci la cottura {4|Frittata lato 2}."] },
  { t: "Polpette al sugo", s: "ai", tempo: "50 min", ingr: "300 g macinato misto · 1 uovo · 40 g pane raffermo ammollato nel latte · 30 g Parmigiano · 500 g passata · ½ cipolla",
    p: ["Impasta carne, uovo, pane strizzato, Parmigiano, sale e forma le polpette.", "Prepara il sugo: cipolla nell'olio, poi la passata {10|Sugo}.",
        "Metti le polpette crude nel sugo e cuoci col coperchio, girandole a metà {25|Polpette}."] },
  { t: "Lenticchie in umido", s: "ai", tempo: "45 min", ingr: "200 g lenticchie secche · 1 carota, 1 sedano, ½ cipolla · 2 cucchiai di passata · alloro · olio",
    p: ["Soffriggi carota, sedano e cipolla tritati {6|Soffritto}.", "Aggiungi le lenticchie sciacquate, la passata, l'alloro e acqua a coprire di 2 dita.",
        "Cuoci a fuoco basso, aggiungendo acqua se si asciugano {35|Lenticchie}.", "Sala alla fine, così restano morbide."] },
  { t: "Minestrone", s: "ai", tempo: "50 min", ingr: "1 patata · 2 carote · 2 zucchine · 1 porro · ¼ di verza · 1 barattolo di fagioli · 1 crosta di Parmigiano · olio",
    p: ["Taglia tutte le verdure a cubetti e rosola il porro nell'olio {5|Porro}.", "Aggiungi le verdure, la crosta di Parmigiano e copri d'acqua.",
        "Cuoci a fuoco basso {35|Minestrone}.", "Aggiungi i fagioli e cuoci ancora {5|Fagioli}. Servi con olio crudo."] },
  { t: "Gnocchi burro e salvia", s: "tutte", tempo: "15 min", ingr: "500 g gnocchi di patate · 50 g burro · 8 foglie di salvia · Parmigiano",
    p: ["Sciogli il burro con la salvia a fuoco dolce finché profuma {3|Burro e salvia}.", "Cuoci gli gnocchi: sono pronti quando salgono a galla {2|Gnocchi}.",
        "Scolali con la schiumarola nel burro, saltali e servi con il Parmigiano."] },
  { t: "Pollo al limone", s: "tutte", tempo: "30 min", ingr: "2 petti di pollo · 1 limone · farina · 30 g burro · prezzemolo",
    p: ["Taglia il pollo a fette sottili e infarinale.", "Rosolale nel burro con un filo d'olio {3|Pollo lato 1}.", "Girale {3|Pollo lato 2}.",
        "Aggiungi il succo del limone e un dito d'acqua e lascia addensare il fondo {3|Salsa al limone}. Finisci col prezzemolo."] },
  { t: "Risotto ai funghi", s: "a", tempo: "35 min", ingr: "160 g riso Carnaroli · 300 g funghi misti (o champignon + porcini secchi) · 1 spicchio d'aglio · 1 l brodo · burro · Parmigiano · prezzemolo",
    p: ["Trifola i funghi in padella con aglio e olio {8|Funghi}.", "Tosta il riso in casseruola {2|Tostatura}.",
        "Aggiungi metà funghi e porta a cottura con il brodo un mestolo alla volta {16|Risotto}.", "Manteca con burro, Parmigiano e i funghi rimasti {2|Mantecatura}."] },
  { t: "Patate al forno croccanti", s: "tutte", tempo: "50 min", ingr: "600 g patate · rosmarino · 2 spicchi d'aglio · olio, sale",
    p: ["Taglia le patate a spicchi e lessale 5 minuti in acqua salata {5|Patate in acqua}.", "Scolale, scuotile nella pentola per graffiarle e condiscile con olio, aglio e rosmarino.",
        "In forno a 220 °C, girandole a metà {40|Patate al forno}."] },
  { t: "Zuppa di ceci e rosmarino", s: "i", tempo: "35 min", ingr: "2 barattoli di ceci · 1 spicchio d'aglio · rosmarino · 1 cucchiaio di concentrato · pane tostato",
    p: ["Scalda aglio e rosmarino nell'olio {2|Aglio}.", "Aggiungi ceci, concentrato e 600 ml d'acqua e cuoci {20|Ceci}.",
        "Frulla metà zuppa, regola di sale e servi sul pane tostato con olio crudo."] },
  { t: "Pasta zucchine e menta", s: "pe", tempo: "25 min", ingr: "180 g pasta corta · 3 zucchine · menta · 40 g Pecorino · 1 spicchio d'aglio",
    p: ["Taglia le zucchine a rondelle e cuocile in padella con aglio e olio finché dorate {10|Zucchine}.", "Cuoci la pasta {11|Pasta}.",
        "Scola al dente nelle zucchine con un po' d'acqua, aggiungi menta e Pecorino e manteca."] },
  { t: "Insalata di riso", s: "e", tempo: "25 min", ingr: "200 g riso parboiled · tonno · olive · pomodorini · mais · uova sode · olio",
    p: ["Cuoci il riso in acqua salata {15|Riso}.", "Intanto rassoda le uova {9|Uova sode}.", "Scola e raffredda il riso sotto l'acqua, condisci con tutto il resto e lascia in frigo."] },
  { t: "Crescentine (tigelle) veloci in padella", s: "tutte", tempo: "1 h 20", ingr: "250 g farina · 125 ml latte tiepido · 50 ml acqua · 5 g lievito di birra secco · 20 g strutto o olio · sale",
    p: ["Impasta tutto e lascia lievitare coperto {60|Lievitazione}.", "Stendi a 1 cm e ricava dei dischi con un bicchiere.",
        "Cuocile in padella antiaderente coperta, a fuoco medio-basso {5|Tigelle lato 1}.", "Girale {5|Tigelle lato 2}. Da farcire con mortadella, crescenza o pesto modenese."] }
];
function stagione(d) { var m = d.getMonth(); return m === 11 || m < 2 ? "i" : m < 5 ? "p" : m < 8 ? "e" : "a"; }
function ricettaDelGiorno(d) {
  var s = stagione(d), adatte = RICETTE.filter(function (r) { return r.s === "tutte" || r.s.indexOf(s) >= 0; });
  var n = Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 864e5);
  return adatte[(n * 7) % adatte.length];   // *7: giorni vicini, ricette lontane nella lista
}
function disegnaRicetta(r) {
  r = r || ricettaDelGiorno(new Date()); disegnaRicetta.r = r;
  $("ricetta-titolo").textContent = r.t; $("ricetta-tempo").textContent = r.tempo + " · per 2";
  $("ricetta-ingr").textContent = r.ingr;
  var ol = $("ricetta-passi"); ol.innerHTML = "";
  r.p.forEach(function (passo) {
    var li = document.createElement("li"), parti = passo.split(/\{(\d+)\|([^}]+)\}/);
    for (var i = 0; i < parti.length; i += 3) {
      if (parti[i]) li.appendChild(document.createTextNode(parti[i]));
      if (parti[i + 1]) {
        var b = document.createElement("button"), min = +parti[i + 1], nome = parti[i + 2];
        b.type = "button"; b.className = "ricetta-timer"; b.textContent = "⏱ " + min + " min";
        b.title = "Avvia il timer \"" + nome + "\""; b.onclick = function () { avviaTimer(min, nome); this.textContent = "✓ avviato"; };
        li.appendChild(b);
      }
    }
    ol.appendChild(li);
  });
}
function avviaRicetta() {
  if (!$("card-ricetta")) return;
  disegnaRicetta();
  $("ricetta-altra").onclick = function () {   // un'altra ricetta della stagione
    var s = stagione(new Date()), adatte = RICETTE.filter(function (r) { return r.s === "tutte" || r.s.indexOf(s) >= 0; });
    var i = (adatte.indexOf(disegnaRicetta.r) + 1) % adatte.length; disegnaRicetta(adatte[i]);
  };
  setInterval(function () { var r = ricettaDelGiorno(new Date()); if (r !== disegnaRicetta.r && !disegnaRicetta.scelta) disegnaRicetta(r); }, 30 * 60 * 1000);
}
