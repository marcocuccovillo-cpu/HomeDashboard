// Home2Love — suoni generati al momento (niente file audio): "Pensavo a te".
// I browser fanno suonare una pagina solo dopo che l'avete toccata: il primo tocco "sblocca" l'audio.

var SUONI = { ac: null, volume: 0.6 };
function audioCtx() {
  try {
    if (!SUONI.ac) SUONI.ac = new (window.AudioContext || window.webkitAudioContext)();
    if (SUONI.ac.state === "suspended") SUONI.ac.resume();
  } catch (e) { return null; }
  return SUONI.ac;
}
["pointerdown", "keydown", "touchstart"].forEach(function (ev) { document.addEventListener(ev, function () { audioCtx(); }, { passive: true }); });
function volumeOra() { var h = new Date().getHours(); return SUONI.volume * (h >= 23 || h < 7 ? .35 : 1); }   // di notte più piano
function uscita(ac, vol) { var g = ac.createGain(); g.gain.value = vol * volumeOra(); g.connect(ac.destination); return g; }

// ---------------------------------------------------------------- "Pensavo a te"
function suonaPensieroInviato() {   // un "pop" morbido di conferma
  var ac = audioCtx(); if (!ac) return; var t = ac.currentTime, out = uscita(ac, .35);
  var o = ac.createOscillator(), g = ac.createGain(); o.type = "sine";
  o.frequency.setValueAtTime(660, t); o.frequency.exponentialRampToValueAtTime(1320, t + .09);
  g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(1, t + .01); g.gain.exponentialRampToValueAtTime(.0001, t + .22);
  o.connect(g); g.connect(out); o.start(t); o.stop(t + .25);
}
function campanella(ac, out, f, t, dur, vol) {   // nota di carillon: fondamentale + armonica che sfuma
  [[1, 1], [2.01, .35], [3.98, .12]].forEach(function (h) {
    var o = ac.createOscillator(), g = ac.createGain(); o.type = "sine"; o.frequency.value = f * h[0];
    g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(vol * h[1], t + .008); g.gain.exponentialRampToValueAtTime(.0001, t + dur / h[0]);
    o.connect(g); g.connect(out); o.start(t); o.stop(t + dur + .05);
  });
}
function battito(ac, out, t) {   // tum-tum
  [0, .19].forEach(function (d, i) {
    var o = ac.createOscillator(), g = ac.createGain(); o.type = "sine";
    o.frequency.setValueAtTime(95, t + d); o.frequency.exponentialRampToValueAtTime(45, t + d + .15);
    g.gain.setValueAtTime(.0001, t + d); g.gain.exponentialRampToValueAtTime(i ? .7 : 1, t + d + .012); g.gain.exponentialRampToValueAtTime(.0001, t + d + .2);
    o.connect(g); g.connect(out); o.start(t + d); o.stop(t + d + .25);
  });
}
function suonaPensiero() {   // carillon che sale e un battito di cuore
  var ac = audioCtx(); if (!ac) return; var t = ac.currentTime + .02, out = uscita(ac, .5);
  [[1046.5, 0], [1318.5, .13], [1568, .26], [2093, .42]].forEach(function (n) { campanella(ac, out, n[0], t + n[1], 1.4, .45); });
  battito(ac, out, t + 1.0); battito(ac, out, t + 1.7);
}

// ---------------------------------------------------------------- "Sto tornando": un din-don da campanello, diverso dal timer
function suonaRientro() {
  var ac = audioCtx(); if (!ac) return; var t = ac.currentTime + .02, out = uscita(ac, .55);
  [0, 1.6].forEach(function (d) {   // din-don, due volte
    campanella(ac, out, 659.25, t + d, 1.8, .5);         // mi
    campanella(ac, out, 523.25, t + d + .55, 2.2, .5);   // do
  });
}
