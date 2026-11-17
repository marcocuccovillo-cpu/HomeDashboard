// Home2Love — parte comune delle telecamere (pagina sorveglianza.html e comodino).
// Tutto passa dal tablet di casa (strumenti/telecamere.py in Termux), in casa e da fuori: nessun servizio esterno.
// Chiave e codice di accesso si ricavano dalla password delle telecamere (PBKDF2): la password non lascia il telefono.
// Il tablet riceve solo dati cifrati con la chiave, che non conosce: inoltra e basta.
// Il video è un vero video (MediaRecorder → pezzi da ¼ di secondo, cifrati) che il visore rimonta in diretta.
// Regole: la telecamera si accende solo a mano su quel telefono, e chi la ospita mostra sempre che è attiva.

var TCAM = (function () {
  var S = { chiave: null, accesso: "", base: "", es: null, errori: 0, id: Math.random().toString(36).slice(2, 10) };
  function b64u(buf) { return btoa(String.fromCharCode.apply(null, new Uint8Array(buf))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, ""); }
  function daB64u(s) { s = s.replace(/-/g, "+").replace(/_/g, "/"); while (s.length % 4) s += "="; return Uint8Array.from(atob(s), function (c) { return c.charCodeAt(0); }); }
  function esa(n) { return Array.from(crypto.getRandomValues(new Uint8Array(n))).map(function (x) { return x.toString(16).padStart(2, "0"); }).join(""); }
  function preparaChiave(pw) {
    var enc = new TextEncoder();
    return crypto.subtle.importKey("raw", enc.encode(pw), "PBKDF2", false, ["deriveBits", "deriveKey"]).then(function (base) {
      return Promise.all([
        crypto.subtle.deriveKey({ name: "PBKDF2", salt: enc.encode("home2love-telecamere-chiave"), iterations: 300000, hash: "SHA-256" }, base, { name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]),
        crypto.subtle.deriveBits({ name: "PBKDF2", salt: enc.encode("home2love-telecamere-accesso"), iterations: 300000, hash: "SHA-256" }, base, 128)
      ]);
    }).then(function (r) { S.chiave = r[0]; S.accesso = b64u(r[1]); });
  }
  function cifraByte(bytes) {
    var iv = crypto.getRandomValues(new Uint8Array(12));
    return crypto.subtle.encrypt({ name: "AES-GCM", iv: iv }, S.chiave, bytes).then(function (c) { var t = new Uint8Array(12 + c.byteLength); t.set(iv); t.set(new Uint8Array(c), 12); return t; });
  }
  function decifraByte(buf) { var b = new Uint8Array(buf); return crypto.subtle.decrypt({ name: "AES-GCM", iv: b.slice(0, 12) }, S.chiave, b.slice(12)); }
  function cifra(o) { return cifraByte(new TextEncoder().encode(JSON.stringify(o))).then(b64u); }
  function decifra(s) { return decifraByte(daB64u(s)).then(function (p) { return JSON.parse(new TextDecoder().decode(p)); }); }

  // ---------------------------------------------------------------- dov'è il tablet
  // cam_server = { casa: "192.168.1.20", fuori: "" (vuoto = automatico), porta: 8443 }
  function impostazioni() { try { return JSON.parse(localStorage.getItem("cam_server") || "null") || {}; } catch (e) { return {}; } }
  function salvaImpostazioni(o) { try { localStorage.setItem("cam_server", JSON.stringify(o)); } catch (e) {} }
  function ipCasa() {   // l'indirizzo internet di casa, che il tablet condivide (cifrato) con i telefoni dell'app
    try {
      var r = JSON.parse(localStorage.getItem("cucina_registro") || "null"), v = r && r["rete.casa"] && r["rete.casa"].v;
      return v && v.ip && v.ip.indexOf(":") < 0 ? v.ip : "";
    } catch (e) { return ""; }
  }
  function indirizzi() {
    var o = impostazioni(), p = o.porta || 8443, l = [];
    if (window.TCAM_LOCALE) l.push("127.0.0.1");   // la pagina gira sul tablet stesso
    if (o.casa) l.push(o.casa);
    if (o.fuori || ipCasa()) l.push(o.fuori || ipCasa());
    return l.map(function (h) { h = h.trim().replace(/^https?:\/\//, "").replace(/\/.*$/, ""); return "https://" + (/:\d+$/.test(h) ? h : h + ":" + p) + "/"; })
      .filter(function (x, i, a) { return a.indexOf(x) === i; });
  }
  function prova(base) {
    var ac = new AbortController(), t = setTimeout(function () { ac.abort(); }, 4000);
    return fetch(base + "ping", { headers: { "X-Casa": S.accesso }, signal: ac.signal, cache: "no-store" }).then(function (r) {
      clearTimeout(t); if (r.status === 403) throw new Error("password"); if (!r.ok) throw new Error("no"); return base;
    });
  }
  function trovaServer() {   // prima l'indirizzo di casa, poi quello da fuori
    var l = indirizzi(), i = 0, password = false;
    if (!l.length) { var e0 = new Error("Manca l'indirizzo del tablet: impostalo in «⚙ Server di casa» nella pagina Telecamere."); e0.indirizzi = []; return Promise.reject(e0); }
    return (function giro() {
      if (i >= l.length) {
        var e = new Error(password ? "Il tablet non riconosce questa password: dev'essere la stessa messa in Termux (telecamere.py --configura)."
                                   : "Non raggiungo il tablet. È acceso con il server delle telecamere? Se è la prima volta su questo telefono, apri l'indirizzo qui sotto e accetta l'avviso.");
        e.indirizzi = password ? [] : l; throw e;
      }
      var b = l[i++];
      return prova(b).then(function (x) { S.base = x; return x; }, function (e) { if (e && e.message === "password") password = true; return giro(); });
    })();
  }
  function intestazioni() { return { "X-Casa": S.accesso }; }

  // ---------------------------------------------------------------- messaggi di presentazione (cifrati) attraverso il tablet
  function pubblica(o) { return cifra(o).then(function (c) { return fetch(S.base + "eventi", { method: "POST", headers: intestazioni(), body: c }); }).catch(function () {}); }
  function ascolta(fn) {
    if (S.es) S.es.close();
    var es = S.es = new EventSource(S.base + "eventi?k=" + encodeURIComponent(S.accesso));
    es.onmessage = function (e) { decifra(e.data).then(fn, function () {}); };
    es.onerror = function () {   // tablet irraggiungibile da qui (es. uscito di casa): riprovo anche l'altro indirizzo
      if (S.es !== es || ++S.errori < 3) return;
      S.errori = 0; es.close();
      (function riprova() {
        if (S.es !== es) return;
        trovaServer().then(function () { if (S.es === es) ascolta(fn); }, function () { setTimeout(riprova, 10000); });
      })();
    };
    return new Promise(function (ok) { es.onopen = function () { S.errori = 0; ok(); }; setTimeout(ok, 5000); });
  }

  // ---------------------------------------------------------------- telecamera
  var T = { stream: null, nome: "", verso: "environment", rec: {}, video: null, onStato: null, attiva: false };
  function apriFotocamera() {
    if (T.stream) T.stream.getTracks().forEach(function (t) { t.stop(); });
    return navigator.mediaDevices.getUserMedia({ video: { facingMode: T.verso, width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 25 } }, audio: false }).then(function (s) {
      T.stream = s; if (T.video) T.video.srcObject = s;
    }, function () { throw new Error("Serve il permesso della fotocamera."); });
  }
  function spettatori() { return Object.keys(T.rec).length; }
  function formato() {
    var l = ["video/webm;codecs=vp8", "video/webm;codecs=vp9", "video/webm", "video/mp4"];
    for (var i = 0; i < l.length; i++) if (window.MediaRecorder && MediaRecorder.isTypeSupported(l[i])) return l[i];
    return "";
  }
  function trasmetti(vid, canale) {   // un video per ogni telefono che guarda
    if (T.rec[vid]) T.rec[vid].chiudi();
    var mime = formato(); if (!mime || !T.stream) return;
    var st = T.rec[vid] = { attivo: true, coda: [], invio: false, catena: Promise.resolve() }, mr;
    function chiudi() {
      if (!st.attivo) return; st.attivo = false;
      try { if (mr && mr.state !== "inactive") mr.stop(); } catch (e) {}
      if (T.rec[vid] === st) delete T.rec[vid];
      stato();
    }
    st.chiudi = chiudi;
    function manda() {
      if (!st.attivo || st.invio || !st.coda.length) return;
      if (st.coda.length > 40) return chiudi();   // dieci secondi indietro: la rete non regge, chi guarda riprova
      st.invio = true;
      cifraByte(st.coda.shift()).then(function (d) { return fetch(S.base + "pezzo/" + canale, { method: "POST", headers: intestazioni(), body: d }); })
        .then(function (r) { st.invio = false; if (!r.ok) return chiudi(); manda(); }, function () { st.invio = false; chiudi(); });
    }
    st.coda.push(new TextEncoder().encode(JSON.stringify({ mime: mime })));   // primo pezzo: il formato del video
    try { mr = new MediaRecorder(T.stream, { mimeType: mime, videoBitsPerSecond: 1500000 }); } catch (e) { return chiudi(); }
    mr.ondataavailable = function (e) {
      if (!st.attivo || !e.data || !e.data.size) return;
      var b = e.data; st.catena = st.catena.then(function () { return b.arrayBuffer(); }).then(function (x) { st.coda.push(x); manda(); });
    };
    mr.onerror = chiudi;
    mr.start(250); manda(); stato();
  }
  function stato() { if (T.onStato) T.onStato({ attiva: T.attiva, spettatori: spettatori(), nome: T.nome }); }
  function messaggioTele(m) {
    if (!T.attiva) return;
    if (m.tipo === "chi") pubblica({ tipo: "ci-sono", cid: S.id, nome: T.nome, vid: m.vid });
    if (m.tipo === "guarda" && m.cid === S.id && /^[0-9a-f]{16,64}$/.test(m.canale || "")) trasmetti(m.vid, m.canale);
    if (m.tipo === "basta" && m.cid === S.id && T.rec[m.vid]) T.rec[m.vid].chiudi();
  }
  function avvia(pw, nome, opz) {
    opz = opz || {}; T.video = opz.video || null; T.onStato = opz.onStato || null; T.nome = nome;
    if (!window.MediaRecorder || !formato()) return Promise.reject(new Error("Questo telefono non sa registrare video dal browser: usa Chrome aggiornato."));
    return preparaChiave(pw).then(trovaServer).then(apriFotocamera).then(function () { return ascolta(messaggioTele); })
      .then(function () { T.attiva = true; stato(); return pubblica({ tipo: "ci-sono", cid: S.id, nome: T.nome, vid: "*" }); });
  }
  function ferma() {
    T.attiva = false;
    Object.keys(T.rec).forEach(function (k) { T.rec[k].chiudi(); });
    if (T.stream) T.stream.getTracks().forEach(function (t) { t.stop(); }); T.stream = null;
    if (S.es) { S.es.close(); S.es = null; }
    stato();
  }
  function gira() {   // la registrazione è legata alla fotocamera: chi guarda si ricollega da solo
    T.verso = T.verso === "environment" ? "user" : "environment";
    return apriFotocamera().then(function () {
      Object.keys(T.rec).forEach(function (vid) { T.rec[vid].chiudi(); pubblica({ tipo: "rifai", cid: S.id, vid: vid }); });
    });
  }
  return { S: S, esa: esa, decifraByte: decifraByte, preparaChiave: preparaChiave, trovaServer: trovaServer, indirizzi: indirizzi, ipCasa: ipCasa,
           impostazioni: impostazioni, salvaImpostazioni: salvaImpostazioni, intestazioni: intestazioni, pubblica: pubblica, ascolta: ascolta,
           avvia: avvia, ferma: ferma, gira: gira, attiva: function () { return T.attiva; } };
})();
