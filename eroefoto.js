// Home2Love — le vostre foto (le stesse del carosello del tablet) come sfondo della parte alta di Oggi sul telefono.
// Sopra restano la giornata e i pulsanti (Sto tornando, Esco, Pensavo a te). Le foto si scaricano una alla volta,
// solo quella che si vede e la successiva, così non si consuma traffico. Tocco o dito di lato: foto dopo / prima.

var EF = { lista: [], i: 0, timer: null, letta: 0, img: [], vista: -1 };
(function () {
  var st = document.createElement("style");
  st.textContent = [
    ".eroe-box{--ef-alto:min(100vw,440px);position:relative;border-radius:24px;overflow:hidden;margin:6px 0 14px;box-shadow:0 12px 26px -14px rgba(215,38,61,.8)}",
    ".eroe-box .eroe{margin:0;box-shadow:none}",
    "#eroe-foto{position:absolute;inset:0;display:none;background:#2a1418;overflow:hidden}.eroe-box.con-foto #eroe-foto{display:block}",
    "#eroe-foto .sfoca{position:absolute;left:-40px;top:-40px;width:calc(100% + 80px);height:calc(100% + 80px);object-fit:cover;filter:blur(26px) brightness(.5) saturate(1.2);transition:opacity 1.2s}",
    "#eroe-foto .vera{position:absolute;left:0;top:0;width:100%;height:var(--ef-alto);object-fit:cover;object-position:center 42%;opacity:0;transition:opacity 1.2s ease;transform-origin:center 42%;-webkit-mask-image:linear-gradient(to bottom,#000 72%,transparent);mask-image:linear-gradient(to bottom,#000 72%,transparent)}",
    "#eroe-foto .vera.on{opacity:1;animation:ef-zoom 9s ease-out forwards}",
    "@keyframes ef-zoom{from{transform:scale(1)}to{transform:scale(1.05)}}",
    ".eroe-box.con-foto .eroe{background:none;padding-top:calc(var(--ef-alto) - 64px);text-shadow:0 1px 10px rgba(0,0,0,.5)}",
    ".eroe-box.con-foto .eroe::after{display:none}",
    ".eroe-box.con-foto .eroe .cuore,.eroe-box.con-foto #btn-esco,.eroe-box.con-foto #btn-pensiero{-webkit-backdrop-filter:blur(8px);backdrop-filter:blur(8px)}",
    "#ef-punti{position:absolute;top:12px;right:14px;z-index:2;display:none;gap:4px}.eroe-box.con-foto #ef-punti{display:flex}",
    "#ef-punti i{width:6px;height:6px;border-radius:50%;background:rgba(255,255,255,.55);box-shadow:0 0 3px rgba(0,0,0,.4)}#ef-punti i.on{background:#fff}"
  ].join("\n");
  document.head.appendChild(st);
  var e = $("eroe"), box = el("div", "eroe-box"); box.id = "eroe-box";
  e.parentNode.insertBefore(box, e);
  var f = el("div"); f.id = "eroe-foto"; box.appendChild(f); box.appendChild(e);
  var p = el("div"); p.id = "ef-punti"; box.appendChild(p);
  var sf = el("img", "sfoca"); sf.alt = ""; f.appendChild(sf); EF.sfoca = sf;   // la stessa foto, sfocata, dietro alle scritte
  for (var k = 0; k < 2; k++) { var im = el("img", "vera"); im.alt = ""; f.appendChild(im); EF.img.push(im); }
  // tocco su una parte vuota = foto dopo; dito di lato = dopo / prima
  var x0 = null;
  box.addEventListener("pointerdown", function (ev) { x0 = ev.target.closest("button,a") ? null : ev.clientX; });
  box.addEventListener("pointerup", function (ev) {
    if (x0 === null || !EF.lista.length) return;
    var dx = ev.clientX - x0; x0 = null;
    if (Math.abs(dx) > 40) efVai(EF.i + (dx < 0 ? 1 : -1)); else efVai(EF.i + 1);
    efRiparti();
  });
})();
function efUrl(x) {   // indirizzo dell'immagine già decifrata (la stessa cache della scheda Foto)
  var cache = window.miniature || (window.miniature = {});
  if (cache[x.sha]) return Promise.resolve(cache[x.sha]);
  return scaricaFotoRemota(x).then(function (b) { return (cache[x.sha] = URL.createObjectURL(b)); });
}
function efVai(i) {
  var n = EF.lista.length; if (!n) return;
  i = ((i % n) + n) % n; EF.i = i;
  var x = EF.lista[i];
  efUrl(x).then(function (u) {
    if (EF.i !== i) return;   // nel frattempo è passata a un'altra
    var nuova = EF.img[EF.vista === 0 ? 1 : 0], vecchia = EF.img[EF.vista === 0 ? 0 : 1];
    nuova.onload = function () {
      nuova.classList.remove("on"); void nuova.offsetWidth; nuova.classList.add("on"); vecchia.classList.remove("on");
      EF.vista = EF.vista === 0 ? 1 : 0; EF.sfoca.src = u; $("eroe-box").classList.add("con-foto");
    };
    nuova.src = u;
    if (n > 1) efUrl(EF.lista[(i + 1) % n]).catch(function () {});   // la prossima, già pronta
  }, function () { if (n > 1 && EF.lista.length) setTimeout(function () { if (EF.i === i) efVai(i + 1); }, 1500); });
  var p = $("ef-punti"); p.innerHTML = "";
  if (n > 1) for (var k = 0; k < Math.min(n, 8); k++) { var d = el("i", k === Math.min(i, 7) ? "on" : ""); p.appendChild(d); }
}
function efRiparti() {
  clearInterval(EF.timer);
  EF.timer = setInterval(function () { if (document.visibilityState === "visible" && scheda === "oggi" && !document.querySelector(".velo.on")) efVai(EF.i + 1); }, 8000);
}
function efAggiorna(forza) {   // la lista delle foto: all'avvio, dopo lo sblocco e ogni 20 minuti
  if (!token || !chiaveCripto) return;
  if (!forza && Date.now() - EF.letta < 20 * 60000) return;
  EF.letta = Date.now();
  listaFotoRemote().then(function (l) {
    var prima = EF.lista.map(function (x) { return x.sha; }).join();
    EF.lista = l.sort(function (a, b) { return b.name.localeCompare(a.name); });   // le più recenti prima
    if (!EF.lista.length) { $("eroe-box").classList.remove("con-foto"); return; }
    if (EF.lista.map(function (x) { return x.sha; }).join() !== prima) { efVai(0); efRiparti(); }
  }, function () { EF.letta = 0; });
}
