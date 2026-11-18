// Home2Love — chat più ricca sul telefono: foto, messaggi vocali brevi e reazioni.
// Foto e vocali sono file cifrati (come le foto del carosello) nella cartella chat/ del ramo "cassaforte";
// il messaggio nel registro tiene solo il riferimento: msg.<id> = { da, testo, t, tipo: "foto"|"voce", file: {name, sha}, dur, w, h }.
// Reazioni: chiavi "reaz.<id del messaggio>.<persona>" = { e, t } (tenere premuto un messaggio; doppio tocco = ❤️).

var CP = { cache: {}, invio: [], reazioni: ["❤️", "😂", "😮", "😢", "👍", "🔥"], reg: null, durMax: 60 };
(function () {
  var st = document.createElement("style");
  st.textContent = [
    "#chat-form .cp-btn{flex:none;width:40px;height:40px;border-radius:50%;border:0;background:var(--card);color:var(--muted);font-size:19px;display:grid;place-items:center;padding:0;touch-action:none;-webkit-user-select:none;user-select:none}",
    "#chat-form .cp-btn.rec{background:var(--accent);color:#fff;transform:scale(1.15)}",
    "#cp-reg{display:none;align-items:center;gap:10px;padding:10px 16px;margin:0 12px 6px;border-radius:16px;background:var(--card);font-size:14px;color:var(--ink)}#cp-reg.on{display:flex}",
    "#cp-reg i{width:10px;height:10px;border-radius:50%;background:var(--accent);animation:cp-lampo 1s infinite}#cp-reg span{flex:1}#cp-reg small{color:var(--muted)}",
    "@keyframes cp-lampo{50%{opacity:.25}}",
    ".msg.media{padding:4px 4px 5px}.msg.media small{padding:0 8px}",
    ".msg .cp-foto{display:block;border-radius:14px;max-width:100%;width:240px;background:rgba(0,0,0,.08);object-fit:cover;cursor:pointer}",
    ".msg .cp-voce{display:flex;align-items:center;gap:10px;padding:6px 8px;min-width:170px}",
    ".msg .cp-voce button{width:36px;height:36px;border-radius:50%;border:0;background:rgba(255,255,255,.25);color:inherit;font-size:15px;flex:none}",
    ".msg:not(.mio) .cp-voce button{background:var(--accent-soft);color:var(--accent)}",
    ".msg .cp-onda{flex:1;height:26px;display:flex;align-items:center;gap:2px}.msg .cp-onda b{flex:1;background:currentColor;opacity:.45;border-radius:2px}.msg .cp-onda b.su{opacity:1}",
    ".msg .cp-dur{font-size:12px;opacity:.75;min-width:30px;text-align:right}",
    ".msg{position:relative}.msg .cp-reaz{position:absolute;bottom:-11px;right:8px;background:var(--card);border-radius:12px;padding:1px 6px;font-size:14px;box-shadow:0 2px 6px rgba(0,0,0,.18);line-height:1.4}",
    ".msg.mio .cp-reaz{right:auto;left:8px}.msg.con-reaz{margin-bottom:12px}",
    "#cp-barra{position:fixed;z-index:40;display:flex;gap:4px;background:var(--card);border-radius:26px;padding:6px 8px;box-shadow:0 10px 30px rgba(0,0,0,.25)}",
    "#cp-barra button{border:0;background:none;font-size:26px;width:42px;height:42px;border-radius:50%;padding:0}#cp-barra button.sel{background:var(--accent-soft)}",
    "#cp-grande{position:fixed;inset:0;z-index:45;background:rgba(0,0,0,.92);display:flex;align-items:center;justify-content:center}#cp-grande img{max-width:100%;max-height:100%}",
    ".cp-invio{align-self:flex-end;font-size:13px;color:var(--muted);padding:6px 10px}"
  ].join("\n");
  document.head.appendChild(st);
  var form = $("chat-form"), testo = $("chat-testo");
  var foto = el("button", "cp-btn"); foto.type = "button"; foto.id = "cp-foto"; foto.setAttribute("aria-label", "Foto"); foto.textContent = "📷";
  var inp = el("input"); inp.type = "file"; inp.accept = "image/*"; inp.hidden = true; inp.id = "cp-file";
  var mic = el("button", "cp-btn"); mic.type = "button"; mic.id = "cp-mic"; mic.setAttribute("aria-label", "Tieni premuto per un vocale"); mic.textContent = "🎤";
  form.insertBefore(foto, testo); form.appendChild(inp); form.insertBefore(mic, $("chat-invia"));
  var r = el("div"); r.id = "cp-reg"; r.innerHTML = "<i></i><span>Registro… <b>0:00</b></span><small>rilascia per inviare · trascina via per annullare</small>";
  form.parentNode.insertBefore(r, form);
  foto.onclick = function () { if (!token || !chiaveCripto) { alert("Sblocca prima con la password."); return; } inp.click(); };
  inp.onchange = function () { var f = this.files[0]; this.value = ""; if (f) inviaFoto(f); };
  preparaMicrofono(mic);
  testo.addEventListener("input", function () { mic.hidden = !!testo.value.trim(); });
})();

// ---------------------------------------------------------------- file cifrati nella cassaforte
function cpCarica(blob) {
  var nome = nuovoId() + ".bin";
  return blob.arrayBuffer().then(function (b) { return cifraByte(b); }).then(function (c) {
    return gh("PUT", "/contents/chat/" + nome, { message: "Chat", content: b64DaByte(c), branch: RAMO });
  }).then(function (r) { if (!r.ok) throw new Error("HTTP " + r.status); return r.json().then(function (j) { return { name: nome, sha: j.content.sha }; }); });
}
function cpScarica(file, tipo) {   // Promise di un indirizzo blob: (tenuto in memoria)
  if (CP.cache[file.sha]) return Promise.resolve(CP.cache[file.sha]);
  return gh("GET", "/git/blobs/" + file.sha).then(function (r) { if (!r.ok) throw new Error("HTTP " + r.status); return r.json(); })
    .then(function (j) { return decifraByte(byteDaB64(j.content)); })
    .then(function (b) { return (CP.cache[file.sha] = URL.createObjectURL(new Blob([b], { type: tipo }))); });
}
function cpTogliFile(file) { gh("DELETE", "/contents/chat/" + file.name, { message: "Chat: via", sha: file.sha, branch: RAMO }).catch(function () {}); }
function cpManda(campi) {   // come inviaChat, ma con il file
  var ora = Date.now(), id = nuovoId();
  reg["msg." + id] = { v: Object.assign({ da: io, testo: "", t: ora }, campi), t: ora };
  var l = messaggi();
  l.slice(0, Math.max(0, l.length - CHAT_MAX)).forEach(function (m) { if (m.file) cpTogliFile(m.file); reg[m.k] = { d: 1, t: ora }; });
  salva("cucina_registro", reg); disegnaChat.prima = true; disegnaChat(); sincronizza().then(disegnaChat);
}
function cpInvio(testo) { var x = { testo: testo }; CP.invio.push(x); disegnaChat.prima = true; disegnaChat(); return function () { CP.invio = CP.invio.filter(function (y) { return y !== x; }); disegnaChat(); }; }

// ---------------------------------------------------------------- foto
function inviaFoto(f) {
  var fatto = cpInvio("📷 invio la foto…");
  new Promise(function (ok) {   // più piccola di quelle del carosello: 1280 px
    var img = new Image(), u = URL.createObjectURL(f);
    img.onload = function () {
      var k = Math.min(1, 1280 / Math.max(img.width, img.height)), c = document.createElement("canvas");
      c.width = Math.round(img.width * k); c.height = Math.round(img.height * k); c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(u); c.toBlob(function (b) { ok({ b: b, w: c.width, h: c.height }); }, "image/jpeg", .8);
    };
    img.onerror = function () { URL.revokeObjectURL(u); ok(null); };
    img.src = u;
  }).then(function (x) {
    if (!x || !x.b) throw new Error("foto");
    return cpCarica(x.b).then(function (file) { CP.cache[file.sha] = URL.createObjectURL(x.b); fatto(); cpManda({ tipo: "foto", file: file, w: x.w, h: x.h }); });
  }).catch(function () { fatto(); alert("Non sono riuscito a mandare la foto, riprova."); });
}

// ---------------------------------------------------------------- vocali: tieni premuto il microfono
function preparaMicrofono(mic) {
  var rec = null, pezzi = [], inizio = 0, timer = null, annulla = false, flusso = null, x0 = 0, y0 = 0, premuto = false;
  function formato() { var l = ["audio/webm;codecs=opus", "audio/mp4", "audio/webm", "audio/ogg;codecs=opus"]; for (var i = 0; i < l.length; i++) if (window.MediaRecorder && MediaRecorder.isTypeSupported(l[i])) return l[i]; return ""; }
  mic.addEventListener("contextmenu", function (e) { e.preventDefault(); });
  mic.addEventListener("pointerdown", function (e) {
    e.preventDefault();
    if (!token || !chiaveCripto) { alert("Sblocca prima con la password."); return; }
    if (!formato()) { alert("Questo telefono non sa registrare vocali dal browser."); return; }
    x0 = e.clientX; y0 = e.clientY; annulla = false; pezzi = []; premuto = true;
    try { mic.setPointerCapture(e.pointerId); } catch (x) {}
    navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } }).then(function (s) {
      if (annulla || !premuto) { s.getTracks().forEach(function (t) { t.stop(); }); return; }   // già lasciato (es. la prima volta, per il permesso)
      flusso = s; rec = new MediaRecorder(s, { mimeType: formato(), audioBitsPerSecond: 32000 });
      rec.ondataavailable = function (ev) { if (ev.data.size) pezzi.push(ev.data); };
      rec.onstop = fine;
      rec.start(250); inizio = Date.now(); mic.classList.add("rec"); $("cp-reg").classList.add("on");
      if (navigator.vibrate) navigator.vibrate(30);
      timer = setInterval(function () {
        var s2 = Math.floor((Date.now() - inizio) / 1000); $("cp-reg").querySelector("b").textContent = Math.floor(s2 / 60) + ":" + due(s2 % 60);
        if (s2 >= CP.durMax) ferma();
      }, 250);
    }, function () { alert("Serve il permesso del microfono per i vocali."); });
  });
  mic.addEventListener("pointermove", function (e) {
    if (!rec) return;
    var via = Math.abs(e.clientX - x0) > 90 || y0 - e.clientY > 90;
    $("cp-reg").querySelector("span").firstChild.textContent = via ? "Rilascia per annullare " : "Registro… ";
    annulla = via;
  });
  function ferma() { clearInterval(timer); if (rec && rec.state !== "inactive") rec.stop(); }
  mic.addEventListener("pointerup", function () { premuto = false; if (!rec) { annulla = true; return; } ferma(); });
  mic.addEventListener("pointercancel", function () { premuto = false; annulla = true; ferma(); });
  function fine() {
    var dur = (Date.now() - inizio) / 1000, tipo = rec.mimeType || formato();
    rec = null; mic.classList.remove("rec"); $("cp-reg").classList.remove("on");
    if (flusso) flusso.getTracks().forEach(function (t) { t.stop(); }); flusso = null;
    if (annulla || dur < .8) return;   // troppo corto o annullato
    var blob = new Blob(pezzi, { type: tipo.split(";")[0] }), fatto = cpInvio("🎤 invio il vocale…");
    cpCarica(blob).then(function (file) { CP.cache[file.sha] = URL.createObjectURL(blob); fatto(); cpManda({ tipo: "voce", file: file, dur: Math.round(dur), mime: tipo.split(";")[0] }); },
      function () { fatto(); alert("Non sono riuscito a mandare il vocale, riprova."); });
  }
}
var cpAudio = null;
function suonaVocale(m, box) {
  var b = box.querySelector("button"), onda = box.querySelectorAll(".cp-onda b"), dur = box.querySelector(".cp-dur");
  if (cpAudio && cpAudio.m === m.k) { if (cpAudio.paused) cpAudio.play(); else cpAudio.pause(); return; }
  if (cpAudio) { cpAudio.pause(); if (cpAudio.fine) cpAudio.fine(); }
  b.textContent = "…";
  cpScarica(m.file, m.mime || "audio/webm").then(function (u) {
    var a = cpAudio = new Audio(u); a.m = m.k;
    a.fine = function () { b.textContent = "▶"; onda.forEach(function (x) { x.classList.remove("su"); }); dur.textContent = durata(m.dur); };
    a.onplay = function () { b.textContent = "❚❚"; }; a.onpause = function () { b.textContent = "▶"; };
    a.onended = function () { a.fine(); cpAudio = null; };
    a.ontimeupdate = function () { var p = a.currentTime / (m.dur || a.duration || 1); onda.forEach(function (x, i) { x.classList.toggle("su", i / onda.length <= p); }); dur.textContent = durata(Math.max(0, (m.dur || 0) - a.currentTime)); };
    a.play().catch(function () { b.textContent = "▶"; });
  }, function () { b.textContent = "▶"; alert("Non riesco a scaricare il vocale."); });
}
function durata(s) { s = Math.round(s || 0); return Math.floor(s / 60) + ":" + due(s % 60); }

// ---------------------------------------------------------------- contenuto delle bolle (chiamato da disegnaChat)
function contenutoMedia(m, b) {
  b.classList.add("media");
  if (m.tipo === "foto") {
    var img = el("img", "cp-foto"); img.alt = "Foto";
    if (m.w && m.h) img.style.aspectRatio = m.w + " / " + m.h;
    img.onclick = function () { if (!img.src) return; var g = el("div"); g.id = "cp-grande"; var i2 = el("img"); i2.src = img.src; g.appendChild(i2); g.onclick = function () { g.remove(); }; document.body.appendChild(g); };
    cpScarica(m.file, "image/jpeg").then(function (u) { img.src = u; }, function () { img.alt = "foto non disponibile"; });
    b.appendChild(img);
  } else if (m.tipo === "voce") {
    var v = el("div", "cp-voce"), p = el("button"); p.type = "button"; p.textContent = "▶";
    var onda = el("div", "cp-onda"), n = 22, seme = (m.file && m.file.name ? parseInt(m.file.name, 10) : 7) % 1000;
    for (var i = 0; i < n; i++) { var x = el("b"); x.style.height = (25 + Math.abs(Math.sin(seme + i * 1.7)) * 75) + "%"; onda.appendChild(x); }
    var d = el("span", "cp-dur"); d.textContent = durata(m.dur);
    v.appendChild(p); v.appendChild(onda); v.appendChild(d);
    p.onclick = function (e) { e.stopPropagation(); suonaVocale(m, v); };
    b.appendChild(v);
  }
}
function bolleInInvio(box) { CP.invio.forEach(function (x) { var d = el("div", "cp-invio"); d.textContent = x.testo; box.appendChild(d); }); }

// ---------------------------------------------------------------- reazioni
function idMsg(m) { return m.k.slice(4); }
function reazioniDi(m) {
  var r = []; [0, 1].forEach(function (p) { var e = reg && reg["reaz." + idMsg(m) + "." + p]; if (e && !e.d && e.v && e.v.e) r.push({ p: p, e: e.v.e }); });
  return r;
}
function reagisci(m, emo) {
  var k = "reaz." + idMsg(m) + "." + io, prima = reg[k], ora = Date.now();
  reg[k] = prima && !prima.d && prima.v && prima.v.e === emo ? { d: 1, t: ora } : { v: { e: emo, t: ora }, t: ora };   // stessa emoji: la tolgo
  salva("cucina_registro", reg); if (navigator.vibrate) navigator.vibrate(20); disegnaChat(); sincronizza().then(disegnaChat);
}
function mostraReazioni(m, b) {
  var r = reazioniDi(m); if (!r.length) return;
  b.classList.add("con-reaz"); var s = el("span", "cp-reaz"); s.textContent = r.map(function (x) { return x.e; }).join(""); b.appendChild(s);
}
function gestiBolla(m, b) {   // tieni premuto = scegli la reazione; doppio tocco = ❤️
  var t = null, ultimoTocco = 0, x0 = 0, y0 = 0;
  b.addEventListener("pointerdown", function (e) {
    if (e.target.closest("button")) return;
    x0 = e.clientX; y0 = e.clientY;
    t = setTimeout(function () { t = null; barraReazioni(m, b); }, 450);
  });
  b.addEventListener("pointermove", function (e) { if (t && (Math.abs(e.clientX - x0) > 10 || Math.abs(e.clientY - y0) > 10)) { clearTimeout(t); t = null; } });
  b.addEventListener("pointerup", function (e) {
    if (t) { clearTimeout(t); t = null; if (e.target.closest("button") || e.target.classList.contains("cp-foto")) return; var ora = Date.now(); if (ora - ultimoTocco < 320) reagisci(m, "❤️"); ultimoTocco = ora; }
  });
  b.addEventListener("pointercancel", function () { clearTimeout(t); t = null; });
  b.addEventListener("contextmenu", function (e) { e.preventDefault(); });
}
function barraReazioni(m, b) {
  var vecchia = $("cp-barra"); if (vecchia) vecchia.remove();
  if (navigator.vibrate) navigator.vibrate(25);
  var bar = el("div"), mia = reazioniDi(m).filter(function (x) { return x.p === io; })[0]; bar.id = "cp-barra";
  CP.reazioni.forEach(function (emo) {
    var x = el("button", mia && mia.e === emo ? "sel" : ""); x.type = "button"; x.textContent = emo;
    x.onclick = function (e) { e.stopPropagation(); bar.remove(); reagisci(m, emo); };
    bar.appendChild(x);
  });
  document.body.appendChild(bar);
  var r = b.getBoundingClientRect(), w = bar.offsetWidth;
  bar.style.left = Math.max(8, Math.min(innerWidth - w - 8, r.left + r.width / 2 - w / 2)) + "px";
  bar.style.top = Math.max(8, r.top - 58) + "px";
  setTimeout(function () { document.addEventListener("pointerdown", function via(e) { if (!bar.contains(e.target)) { bar.remove(); document.removeEventListener("pointerdown", via, true); } }, true); }, 50);
}
function pulisciReazioni() {   // le reazioni dei messaggi che non ci sono più
  if (!reg) return;
  var ok = {}; messaggi().forEach(function (m) { ok[idMsg(m)] = 1; });
  var ora = Date.now(), cambi = false;
  Object.keys(reg).forEach(function (k) { if (k.indexOf("reaz.") === 0 && !reg[k].d && !ok[k.split(".")[1]]) { reg[k] = { d: 1, t: ora }; cambi = true; } });
  if (cambi) salva("cucina_registro", reg);
}
