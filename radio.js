// HomeDashboard — radio in cucina (seconda schermata, sotto i Dispositivi).
// Gli indirizzi delle stazioni arrivano da radio-browser.info (archivio libero, sempre aggiornato).
// Il titolo della canzone lo legge il lettore in Termux dai metadati ICY dello stream; se una radio
// trasmette solo in http (bloccato su una pagina https) il lettore fa anche da ponte per l'audio.

var STAZIONI = [
  { nome: "Radio Deejay", cerca: "Radio Deejay" },
  { nome: "Virgin Radio", cerca: "Virgin Radio Italy" },
  { nome: "RTL 102.5", cerca: "RTL 102.5" },
  { nome: "Radio 105", cerca: "Radio 105" },
  { nome: "Radio Capital", cerca: "Radio Capital" },
  { nome: "Rai Radio 2", cerca: "Rai Radio 2" },
  { nome: "Radio Italia", cerca: "Radio Italia" },
  { nome: "m2o", cerca: "m2o" }
];
var LETTORE = "http://127.0.0.1:" + (window.PORTA_LETTORE || 8789);
var radio = { audio: new Audio(), scelta: leggi("radio_scelta", 0), volume: leggi("radio_volume", 0.7), url: null, tTitolo: null, accesa: false };
radio.audio.preload = "none";

function cercaStazione(s) {   // url dello stream, preferendo https; tenuto in memoria per un giorno
  var cache = leggi("radio_url", {}), c = cache[s.nome];
  if (c && Date.now() - c.quando < 864e5) return Promise.resolve(c);
  var server = ["https://all.api.radio-browser.info", "https://de1.api.radio-browser.info", "https://nl1.api.radio-browser.info"];
  function prova(i) {
    if (i >= server.length) return Promise.reject(new Error("archivio radio non raggiungibile"));
    return fetch(server[i] + "/json/stations/search?name=" + encodeURIComponent(s.cerca) + "&countrycode=IT&hidebroken=true&order=clickcount&reverse=true&limit=10",
      { cache: "no-store" }).then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); }).catch(function () { return prova(i + 1); });
  }
  return prova(0).then(function (l) {
    l = l.filter(function (x) { return x.url_resolved && /mp3|aac/i.test(x.codec || "mp3") && !/\.m3u8/.test(x.url_resolved); });
    if (!l.length) throw new Error("stazione non trovata");
    var https = l.filter(function (x) { return /^https:/.test(x.url_resolved); })[0], x = https || l[0];
    var v = { url: x.url_resolved, logo: x.favicon || "", quando: Date.now() };
    cache[s.nome] = v; salva("radio_url", cache); return v;
  });
}
function disegnaRadio() {
  var box = $("radio-stazioni"); if (!box) return;
  box.innerHTML = "";
  STAZIONI.forEach(function (s, i) {
    var b = el("button"); b.type = "button"; b.textContent = s.nome; if (i === radio.scelta) b.className = "sel";
    b.onclick = function () { radio.scelta = i; salva("radio_scelta", i); accendiRadio(); disegnaRadio(); };
    box.appendChild(b);
  });
  $("radio-nome").textContent = STAZIONI[radio.scelta].nome;
  $("radio-play").textContent = radio.accesa ? "■" : "▶";
  $("radio-play").setAttribute("aria-label", radio.accesa ? "Spegni" : "Accendi");
  $("card-radio").classList.toggle("accesa", radio.accesa);
  $("radio-stato").textContent = radio.accesa ? "in onda" : "spenta";
  $("radio-stato").className = "pillola" + (radio.accesa ? " ok" : "");
}
function accendiRadio() {
  var s = STAZIONI[radio.scelta];
  radio.accesa = true; $("radio-titolo").textContent = "Mi collego…"; disegnaRadio();
  cercaStazione(s).then(function (v) {
    $("radio-logo").src = v.logo || ""; $("radio-logo").hidden = !v.logo;
    radio.url = v.url;
    var src = /^https:/.test(v.url) ? v.url : LETTORE + "/radio?url=" + encodeURIComponent(v.url);   // http: passa dal lettore
    radio.audio.src = src; radio.audio.volume = radio.volume;
    return radio.audio.play();
  }).then(function () {
    $("radio-titolo").textContent = ""; leggiTitolo();
    clearInterval(radio.tTitolo); radio.tTitolo = setInterval(leggiTitolo, 20000);
  }).catch(function (e) {
    radio.accesa = false; disegnaRadio();
    $("radio-titolo").textContent = "Non riesco a sintonizzarmi (" + (e && e.message || "errore") + ")";
  });
}
function spegniRadio() {
  radio.accesa = false; radio.audio.pause(); radio.audio.removeAttribute("src"); radio.audio.load();
  clearInterval(radio.tTitolo); $("radio-titolo").textContent = ""; disegnaRadio();
}
function leggiTitolo() {   // "Artista - Canzone" dai metadati ICY, letti dal lettore in Termux
  if (!radio.accesa || !radio.url) return;
  fetch(LETTORE + "/titolo?url=" + encodeURIComponent(radio.url), { cache: "no-store" }).then(function (r) { return r.json(); })
    .then(function (j) { $("radio-titolo").textContent = j.titolo || ""; }, function () {});
}
function avviaRadio() {
  if (!$("card-radio")) return;
  $("radio-play").onclick = function () { radio.accesa ? spegniRadio() : accendiRadio(); };
  var vol = $("radio-volume"); vol.value = Math.round(radio.volume * 100);
  vol.oninput = function () { radio.volume = vol.value / 100; radio.audio.volume = radio.volume; salva("radio_volume", radio.volume); };
  radio.audio.addEventListener("error", function () { if (radio.accesa) { $("radio-titolo").textContent = "Segnale perso, riprovo…"; setTimeout(function () { if (radio.accesa) accendiRadio(); }, 5000); } });
  disegnaRadio();
}
