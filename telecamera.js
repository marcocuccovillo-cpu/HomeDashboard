// Home2Love — parte comune delle telecamere (pagina sorveglianza.html e comodino).
// Chiave e "stanza" si ricavano dalla password delle telecamere (PBKDF2): la password non va a nessun server.
// Per presentarsi telecamera e visore si scambiano messaggi cifrati su ntfy.sh; il video poi va diretto (WebRTC).
// Regole: la telecamera si accende solo a mano su quel telefono, e chi la ospita mostra sempre che è attiva.

var TCAM = (function () {
  var NTFY = window.NTFY_BASE || "https://ntfy.sh/", STUN = [{ urls: "stun:stun.l.google.com:19302" }, { urls: "stun:stun1.l.google.com:19302" }];
  var S = { chiave: null, stanza: "", es: null, id: Math.random().toString(36).slice(2, 10) };
  function b64u(buf) { return btoa(String.fromCharCode.apply(null, new Uint8Array(buf))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, ""); }
  function daB64u(s) { s = s.replace(/-/g, "+").replace(/_/g, "/"); while (s.length % 4) s += "="; return Uint8Array.from(atob(s), function (c) { return c.charCodeAt(0); }); }
  function preparaChiave(pw) {
    var enc = new TextEncoder();
    return crypto.subtle.importKey("raw", enc.encode(pw), "PBKDF2", false, ["deriveBits", "deriveKey"]).then(function (base) {
      return Promise.all([
        crypto.subtle.deriveKey({ name: "PBKDF2", salt: enc.encode("home2love-telecamere-chiave"), iterations: 300000, hash: "SHA-256" }, base, { name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]),
        crypto.subtle.deriveBits({ name: "PBKDF2", salt: enc.encode("home2love-telecamere-stanza"), iterations: 300000, hash: "SHA-256" }, base, 128)
      ]);
    }).then(function (r) { S.chiave = r[0]; S.stanza = "h2l-cam-" + b64u(r[1]); });
  }
  function cifra(o) {
    var iv = crypto.getRandomValues(new Uint8Array(12));
    return crypto.subtle.encrypt({ name: "AES-GCM", iv: iv }, S.chiave, new TextEncoder().encode(JSON.stringify(o))).then(function (c) {
      var t = new Uint8Array(12 + c.byteLength); t.set(iv); t.set(new Uint8Array(c), 12); return b64u(t);
    });
  }
  function decifra(s) { var b = daB64u(s); return crypto.subtle.decrypt({ name: "AES-GCM", iv: b.slice(0, 12) }, S.chiave, b.slice(12)).then(function (p) { return JSON.parse(new TextDecoder().decode(p)); }); }
  function pubblica(o) { return cifra(o).then(function (c) { return fetch(NTFY + S.stanza, { method: "POST", body: c }); }); }
  function ascolta(fn) {
    if (S.es) S.es.close();
    S.es = new EventSource(NTFY + S.stanza + "/sse");
    S.es.onmessage = function (e) { var m; try { m = JSON.parse(e.data); } catch (x) { return; } if (m.message) decifra(m.message).then(fn, function () {}); };
    return new Promise(function (ok) { S.es.onopen = ok; setTimeout(ok, 4000); });
  }
  // server di inoltro (TURN): se il collegamento diretto non passa, il video fa il giro da lì (sempre cifrato)
  function serverIce(turn) {
    var l = STUN.slice();
    if (turn && turn.url) l.push({ urls: turn.url.split(/[\s,]+/).filter(Boolean), username: turn.utente || "", credential: turn.password || "" });
    return l;
  }
  function attendiIce(pc) {
    return new Promise(function (ok) {
      if (pc.iceGatheringState === "complete") return ok();
      var t = setTimeout(ok, 3000);
      pc.addEventListener("icegatheringstatechange", function () { if (pc.iceGatheringState === "complete") { clearTimeout(t); ok(); } });
    });
  }

  // ---------------------------------------------------------------- telecamera
  var T = { stream: null, nome: "", verso: "environment", pcs: {}, video: null, onStato: null, attiva: false };
  function apriFotocamera() {
    if (T.stream) T.stream.getTracks().forEach(function (t) { t.stop(); });
    return navigator.mediaDevices.getUserMedia({ video: { facingMode: T.verso, width: { ideal: 1280 }, height: { ideal: 960 } }, audio: false }).then(function (s) {
      T.stream = s; if (T.video) T.video.srcObject = s;
      Object.keys(T.pcs).forEach(function (k) {   // chi sta guardando passa alla nuova fotocamera
        var snd = T.pcs[k].getSenders().filter(function (x) { return x.track && x.track.kind === "video"; })[0];
        if (snd) snd.replaceTrack(s.getVideoTracks()[0]);
      });
    }, function () { throw new Error("Serve il permesso della fotocamera."); });
  }
  function spettatori() { return Object.keys(T.pcs).filter(function (k) { return T.pcs[k].connectionState === "connected"; }).length; }
  function stato() { if (T.onStato) T.onStato({ attiva: T.attiva, spettatori: spettatori(), nome: T.nome }); }
  function messaggioTele(m) {
    if (!T.attiva) return;
    if (m.tipo === "chi") pubblica({ tipo: "ci-sono", cid: S.id, nome: T.nome, vid: m.vid });
    if (m.tipo === "guarda" && m.cid === S.id) offri(m.vid, m.turn);
    if (m.tipo === "risposta" && m.cid === S.id && T.pcs[m.vid] && T.pcs[m.vid].signalingState === "have-local-offer") T.pcs[m.vid].setRemoteDescription({ type: "answer", sdp: m.sdp }).catch(function () {});
  }
  function offri(vid, turn) {
    if (T.pcs[vid]) try { T.pcs[vid].close(); } catch (e) {}
    var pc = new RTCPeerConnection({ iceServers: serverIce(turn), iceTransportPolicy: turn && turn.sempre && turn.url ? "relay" : "all" }); T.pcs[vid] = pc;
    T.stream.getTracks().forEach(function (t) { pc.addTrack(t, T.stream); });
    pc.onconnectionstatechange = function () { if (/failed|closed/.test(pc.connectionState)) delete T.pcs[vid]; stato(); };
    pc.createOffer().then(function (o) { return pc.setLocalDescription(o); }).then(function () { return attendiIce(pc); })
      .then(function () { return pubblica({ tipo: "offerta", cid: S.id, vid: vid, sdp: pc.localDescription.sdp }); });
  }
  function avvia(pw, nome, opz) {
    opz = opz || {}; T.video = opz.video || null; T.onStato = opz.onStato || null; T.nome = nome;
    return preparaChiave(pw).then(apriFotocamera).then(function () { return ascolta(messaggioTele); })
      .then(function () { T.attiva = true; stato(); return pubblica({ tipo: "ci-sono", cid: S.id, nome: T.nome, vid: "*" }); });
  }
  function ferma() {
    T.attiva = false;
    Object.keys(T.pcs).forEach(function (k) { try { T.pcs[k].close(); } catch (e) {} }); T.pcs = {};
    if (T.stream) T.stream.getTracks().forEach(function (t) { t.stop(); }); T.stream = null;
    if (S.es) { S.es.close(); S.es = null; }
    stato();
  }
  function gira() { T.verso = T.verso === "environment" ? "user" : "environment"; return apriFotocamera(); }
  return { S: S, STUN: STUN, serverIce: serverIce, preparaChiave: preparaChiave, pubblica: pubblica, ascolta: ascolta, attendiIce: attendiIce,
           avvia: avvia, ferma: ferma, gira: gira, attiva: function () { return T.attiva; } };
})();
