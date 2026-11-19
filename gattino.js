// Home2Love — il gatto del tablet che ogni tanto passa a trovarvi sul telefono.
// Entra dal bordo camminando, si siede sopra la barra in basso, dice qualcosa adatto al momento
// (buongiorno, chi sta tornando, un compleanno…), fa le fusa se lo tocchi e poi se ne va.
// Al massimo una visita ogni 25 minuti; si spegne dalle impostazioni ("Il gatto passa a trovarti").
// Il disegno è lo stesso del tablet e della stanza del gatto (gattodisegno.js).

var GATTINO = (function () {
  var W = 24, H = 18, S = 4, DPR = Math.min(2, window.devicePixelRatio || 1);
  var st = document.createElement("style");
  st.textContent = "#gattino{position:fixed;z-index:9;bottom:calc(94px + env(safe-area-inset-bottom));left:0;width:" + W * S + "px;height:" + H * S + "px;pointer-events:none;will-change:transform}" +
    "#gattino canvas{width:100%;height:100%;pointer-events:auto;cursor:pointer;filter:drop-shadow(0 2px 2px rgba(0,0,0,.12))}" +
    "#gattino .fum{position:absolute;bottom:100%;left:50%;transform:translateX(-50%);background:#fff;color:#2a2124;border-radius:12px;padding:6px 10px;font:600 13px/1.25 system-ui,sans-serif;white-space:nowrap;box-shadow:0 4px 12px rgba(0,0,0,.18);margin-bottom:4px}" +
    "#gattino .fum::after{content:'';position:absolute;top:100%;left:50%;margin-left:-5px;border:5px solid transparent;border-top-color:#fff}" +
    "#gattino .cuo{position:absolute;left:50%;bottom:60%;color:#ff5468;font-size:16px;animation:gattino-su 1.4s ease-out forwards}" +
    "#gattino .zz{position:absolute;right:0;top:-6px;font:700 14px system-ui;color:#8f9bd6;animation:gattino-su 2s ease-out infinite}" +
    "@keyframes gattino-su{from{opacity:1;transform:translate(-50%,0)}to{opacity:0;transform:translate(-50%,-46px)}}";
  document.head.appendChild(st);
  var box = null, cv = null, g = null, s = null, raf = 0;

  function disegna(posa) {   // il gatto disegnato (gattodisegno.js), nitido come sul tablet
    var t = performance.now(), d = new Date(), k = d.toDateString();
    if (disegna.k !== k) { disegna.k = k; var fe = window.festeDel ? festeDel(d) : [], co = window.compleanniDel ? compleanniDel(d) : [];
      disegna.cap = fe.some(function (x) { return x.festivo || x.regalo; }) || co.length > 0; }
    g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, cv.width, cv.height);
    g.setTransform(DPR * .42, 0, 0, DPR * .42, DPR * W * S / 2, DPR * (H * S - 3));
    GATTO_VET.disegna(g, 0, 0, posa, t, 1, { blink: s.f % 150 < 5, fusa: s.fusa, cappello: disegna.cap });
  }
  function attivo() { try { return JSON.parse(localStorage.getItem("gattino_si") || "true"); } catch (e) { return true; } }
  function frase() {   // cosa dice: dipende dal momento
    var h = new Date().getHours(), nomi = window.cfg ? cfg.nomi : ["", ""], altro = window.io === 0 || window.io === 1 ? 1 - io : null, l = [];
    if (altro !== null && window.rientroDi) { var r = rientroDi(altro); if (r && Date.now() < r.arrivo) l.push("Arriva " + nomi[altro].split(" ")[0] + "! 🏃"); }
    if (window.compleanniDel) compleanniDel(new Date()).forEach(function (c) { l.push("Auguri " + c.nome + "! 🎂"); });
    if (window.festeDel) festeDel(new Date()).forEach(function (f) { l.push(f.ico + " " + f.nome + "!"); });
    if (l.length) return l[0];
    if (h < 10) l.push("Buongiorno! ☀️", "Hai fatto colazione?", "Miao… caffè?");
    else if (h < 14) l.push("Che si mangia? 🐟", "Miao!", "Pausa coccole?");
    else if (h < 19) l.push("Miao! 😺", "Mi annoio…", "Giochiamo?", "Prrr…");
    else l.push("Si torna a casa? 🏠", "Ho sonno…", "Buonasera! 🌙", "Coccole?");
    if (altro !== null) l.push("Pensa a " + nomi[altro].split(" ")[0] + " 💗");
    return l[Math.floor(Math.random() * l.length)];
  }
  function fumetto(t, ms) {
    var f = box.querySelector(".fum"); if (!f) { f = document.createElement("div"); f.className = "fum"; box.appendChild(f); }
    f.textContent = t; f.hidden = false; clearTimeout(fumetto.t); fumetto.t = setTimeout(function () { f.hidden = true; }, ms || 3500);
  }
  function cuore() { var c = document.createElement("span"); c.className = "cuo"; c.textContent = "♥"; c.style.marginLeft = (Math.random() * 30 - 15) + "px"; box.appendChild(c); setTimeout(function () { c.remove(); }, 1500); }
  function passo() {
    if (!s) return;
    s.f++;
    var ora = Date.now(), largo = innerWidth;
    if (s.fase === "entra" || s.fase === "esce") {
      var v = 1.7 * s.verso; s.x += v;
      if (s.fase === "entra" && (s.verso > 0 ? s.x >= s.meta : s.x <= s.meta)) { s.fase = "fermo"; s.fino = ora + (s.dorme ? 9000 : 7000 + Math.random() * 3000); if (!s.dorme) fumetto(frase(), 4000); }
      if (s.fase === "esce" && (s.x < -W * S - 20 || s.x > largo + 20)) { via(); return; }
    } else if (s.fase === "fermo" && ora > s.fino) { s.fase = "esce"; s.fusa = false; s.verso = Math.random() < .5 ? -1 : 1; var z = box.querySelector(".zz"); if (z) z.remove(); }
    var posa = s.fase === "fermo" ? (s.dorme ? "dorme" : "seduto") : "cammina";
    disegna(posa); s.posa = posa;
    cv.style.transform = s.verso < 0 && posa === "cammina" ? "scaleX(-1)" : "";
    box.style.transform = "translateX(" + Math.round(s.x) + "px)";
    raf = requestAnimationFrame(passo);
  }
  function via() { cancelAnimationFrame(raf); if (box) box.remove(); box = null; s = null; }
  function visita(forza) {
    if (s || !attivo()) return;
    if (!forza && Date.now() - (+localStorage.getItem("gattino_ultima") || 0) < 25 * 60000) return;
    try { localStorage.setItem("gattino_ultima", String(Date.now())); } catch (e) {}
    box = document.createElement("div"); box.id = "gattino";
    cv = document.createElement("canvas"); cv.width = Math.round(W * S * DPR); cv.height = Math.round(H * S * DPR); g = cv.getContext("2d"); box.appendChild(cv); document.body.appendChild(box);
    var h = new Date().getHours(), dalla = Math.random() < .5 ? -1 : 1;
    s = { f: 0, verso: -dalla, x: dalla < 0 ? -W * S : innerWidth, meta: 30 + Math.random() * (innerWidth - W * S - 60), fase: "entra", fusa: false, dorme: h >= 23 || h < 7 };
    if (s.dorme) { var z = document.createElement("span"); z.className = "zz"; z.textContent = "z z"; box.appendChild(z); }
    cv.onclick = function () {   // coccole: fusa, cuoricini, un piccolo tremolio
      if (!s) return;
      if (navigator.vibrate) navigator.vibrate([10, 30, 10, 30, 10]);
      if (s.fase === "fermo") { s.dorme = false; s.fusa = true; s.fino = Math.max(s.fino, Date.now() + 4000); fumetto("Prrr… ♥", 2500); for (var i = 0; i < 4; i++) setTimeout(cuore, i * 180); }
      else fumetto("Miao!", 1500);
    };
    raf = requestAnimationFrame(passo);
  }
  function avvia() {   // la prima visita dopo un po' (non sempre), poi ogni tanto mentre l'app è aperta
    setTimeout(function () { if (Math.random() < .6 && document.visibilityState === "visible") visita(); }, 9000 + Math.random() * 15000);
    setInterval(function () { if (document.visibilityState === "visible" && Math.random() < .35) visita(); }, 6 * 60000);
  }
  return { avvia: avvia, visita: visita, attivo: attivo };
})();
