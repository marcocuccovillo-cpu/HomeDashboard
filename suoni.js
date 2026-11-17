// Home2Love — suoni generati al momento (niente file audio): "Pensavo a te", miagolii e fusa del gatto.
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

// ---------------------------------------------------------------- il gatto
// Miagolio: un'onda ricca (dente di sega) passa per due filtri che si spostano come le vocali "i → a → o",
// con l'intonazione che sale e scende e un filo di vibrato. "mrrp" è corto e trillato, "forte" è un MIAO deciso.
function miagola(tipo) {
  var ac = audioCtx(); if (!ac) return;
  tipo = tipo || "miao";
  var t = ac.currentTime + .01, dur = tipo === "mrrp" ? .32 : tipo === "forte" ? .75 : .58, out = uscita(ac, tipo === "forte" ? .55 : .4);
  var alt = 1 + (Math.random() - .5) * .16;   // ogni miagolio è un po' diverso
  var o = ac.createOscillator(); o.type = "sawtooth";
  var f0 = 480 * alt, picco = (tipo === "forte" ? 820 : 720) * alt, fine = 400 * alt;
  o.frequency.setValueAtTime(f0, t); o.frequency.linearRampToValueAtTime(picco, t + dur * .35); o.frequency.linearRampToValueAtTime(fine, t + dur);
  var vib = ac.createOscillator(), vg = ac.createGain(); vib.frequency.value = 6.5; vg.gain.value = 9; vib.connect(vg); vg.connect(o.frequency);
  var env = ac.createGain(); env.gain.setValueAtTime(.0001, t);
  env.gain.exponentialRampToValueAtTime(1, t + .05); env.gain.setValueAtTime(1, t + dur * .7); env.gain.exponentialRampToValueAtTime(.0001, t + dur);
  if (tipo === "mrrp") {   // trillo: l'ampiezza vibra veloce
    var tr = ac.createOscillator(), tg = ac.createGain(); tr.frequency.value = 28; tg.gain.value = .45; tr.connect(tg); tg.connect(env.gain); tr.start(t); tr.stop(t + dur);
  }
  o.connect(env);
  [[[700, 1100, 650], 6, 1], [[2300, 1500, 1000], 9, .55]].forEach(function (fm) {   // formanti: "i" → "a" → "o"
    var bp = ac.createBiquadFilter(), g = ac.createGain(); bp.type = "bandpass"; bp.Q.value = fm[1]; g.gain.value = fm[2] * 3;
    bp.frequency.setValueAtTime(fm[0][0], t); bp.frequency.linearRampToValueAtTime(fm[0][1], t + dur * .4); bp.frequency.linearRampToValueAtTime(fm[0][2], t + dur);
    env.connect(bp); bp.connect(g); g.connect(out);
  });
  o.start(t); vib.start(t); o.stop(t + dur + .05); vib.stop(t + dur + .05);
}
function fusa(secondi) {   // ronfare: impulsi bassi e rapidi, filtrati
  var ac = audioCtx(); if (!ac) return; secondi = secondi || 2.4;
  var t = ac.currentTime + .01, out = uscita(ac, .5);
  var o = ac.createOscillator(); o.type = "sawtooth"; o.frequency.value = 26;
  var lp = ac.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 340; lp.Q.value = 1;
  var am = ac.createOscillator(), ag = ac.createGain(), env = ac.createGain(); am.frequency.value = 2.1; ag.gain.value = .35;   // inspira/espira
  env.gain.setValueAtTime(.0001, t); env.gain.exponentialRampToValueAtTime(.8, t + .3); env.gain.setValueAtTime(.8, t + secondi - .5); env.gain.exponentialRampToValueAtTime(.0001, t + secondi);
  am.connect(ag); ag.connect(env.gain);
  o.connect(lp); lp.connect(env); env.connect(out);
  o.start(t); am.start(t); o.stop(t + secondi + .05); am.stop(t + secondi + .05);
}
