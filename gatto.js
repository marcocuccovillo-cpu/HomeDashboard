// HomeDashboard — il gatto di casa: pixel art che vive sopra tutta l'interfaccia (come i bigliettini).
// Gira, si siede, dorme di notte e quando lavorate tutti e due, trema se fuori piove o nevica,
// è felice nei giorni liberi insieme, fa le fusa se lo tocchi e salta quando suona un timer.

var G = { W: 24, H: 18, S: 5, x: 200, y: 400, tx: 200, ty: 400, verso: 1, stato: "seduto", fino: 0, f: 0, coccole: 0, salto: 0 };
var COL = { O: "#e8913f", D: "#b8622a", W: "#fff1e0", K: "#2b1d14", P: "#f4a6ae" };

function pix(g, c, x, y, w, h) { g.fillStyle = COL[c]; g.fillRect(x, y, w || 1, h || 1); }
function disegnaGatto(g, posa, f) {
  g.clearRect(0, 0, G.W, G.H);
  if (posa === "dorme") {   // acciambellato, con la coda davanti
    pix(g, "O", 5, 11, 13, 5); pix(g, "O", 6, 10, 11, 1); pix(g, "D", 8, 11, 1, 2); pix(g, "D", 11, 11, 1, 2);
    pix(g, "O", 13, 8, 6, 5); pix(g, "O", 13, 7, 1, 1); pix(g, "O", 18, 7, 1, 1); pix(g, "P", 13, 8); pix(g, "P", 18, 8);
    pix(g, "K", 14, 10, 2, 1); pix(g, "K", 17, 10, 1, 1); pix(g, "W", 15, 11, 3, 2);
    var r = f % 40 < 20 ? 0 : 1;   // respiro
    pix(g, "O", 5, 16 - r, 9, 1); pix(g, "W", 4, 15 - r, 2, 1);
    return;
  }
  if (posa === "seduto") {
    pix(g, "O", 8, 8, 7, 7); pix(g, "W", 11, 10, 3, 5); pix(g, "D", 9, 9, 1, 2); pix(g, "D", 9, 12, 1, 2);
    pix(g, "O", 9, 2, 7, 6); pix(g, "O", 9, 1, 1, 1); pix(g, "O", 15, 1, 1, 1); pix(g, "P", 10, 2); pix(g, "P", 14, 2);
    var occhi = f % 60 < 3 ? "O" : "K";   // ogni tanto sbatte le palpebre
    pix(g, occhi, 11, 4); pix(g, occhi, 14, 4); pix(g, "W", 12, 5, 3, 2); pix(g, "P", 13, 5);
    pix(g, "W", 11, 15, 1, 1); pix(g, "W", 13, 15, 1, 1);
    var c = Math.round(Math.sin(f / 6) * 1.5);   // coda che si muove
    pix(g, "O", 3, 14, 6, 2); pix(g, "O", 2, 12 + c, 2, 3); pix(g, "D", 2, 11 + c, 1, 1);
    return;
  }
  // in piedi / cammina (verso destra)
  pix(g, "O", 4, 8, 12, 5); pix(g, "D", 6, 8, 1, 2); pix(g, "D", 9, 8, 1, 2); pix(g, "D", 12, 8, 1, 2); pix(g, "W", 13, 10, 3, 3);
  pix(g, "O", 14, 3, 7, 6); pix(g, "O", 15, 2, 1, 1); pix(g, "O", 19, 2, 1, 1); pix(g, "P", 15, 3); pix(g, "P", 19, 3);
  pix(g, "K", 16, 5); pix(g, "K", 19, 5); pix(g, "W", 18, 6, 3, 2); pix(g, "P", 20, 6);
  var a = posa === "cammina" && f % 8 < 4;   // zampe alternate
  [[5, a], [7, !a], [12, !a], [14, a]].forEach(function (z) { pix(g, "O", z[0], 13, 1, z[1] ? 3 : 2); pix(g, "W", z[0], z[1] ? 15 : 14); });
  var t = Math.round(Math.sin(f / 4));
  pix(g, "O", 3, 8); pix(g, "O", 2, 7); pix(g, "O", 2, 6); pix(g, "O", 1 + t, 5); pix(g, "D", 1 + t, 4);
}

// ---------------------------------------------------------------- umore: da ora, turni, meteo
function umore() {
  var h = new Date().getHours(), notte = h >= 23 || h < 7;
  var tutti = window.statoAdesso && statoAdesso(0).stato === "lavoro" && statoAdesso(1).stato === "lavoro";
  var freddo = ["pioggia", "neve", "temporale"].indexOf(window.meteoAdesso) >= 0;
  var festa = window.insieme && insieme(new Date()) === "giorno";
  return { sonno: notte || tutti, freddo: freddo, festa: festa, perche: notte ? "è notte" : tutti ? "siete al lavoro" : "" };
}
function fumetto(testo, ms) {
  var b = $("gatto-fumetto"); b.textContent = testo; b.hidden = false;
  clearTimeout(fumetto.t); fumetto.t = setTimeout(function () { b.hidden = true; }, ms || 2500);
}
function cuoricino() {
  var c = el("span", "gatto-cuore"); c.textContent = "♥";
  c.style.left = (G.x + 30 + Math.random() * 40) + "px"; c.style.top = (G.y + 10) + "px";
  $("gatto-strato").appendChild(c); setTimeout(function () { c.remove(); }, 1800);
}
function nuovaMeta() {
  var w = innerWidth - G.W * G.S, h = innerHeight - G.H * G.S;
  G.tx = Math.random() * w; G.ty = h * 0.25 + Math.random() * h * 0.72;
}
function passoGatto() {
  var u = umore(), ora = Date.now(); G.f++;
  if (G.salto > 0) G.salto--;
  if (G.coccole > ora) G.stato = "seduto";
  else if (u.sonno) { if (G.stato !== "dorme") { G.stato = "dorme"; } }
  else if (G.stato === "dorme") { G.stato = "seduto"; G.fino = ora + 3000; fumetto("miao?"); }
  else if (G.stato === "seduto" && ora > G.fino) { nuovaMeta(); G.stato = "cammina"; }
  else if (G.stato === "cammina") {
    var dx = G.tx - G.x, dy = G.ty - G.y, d = Math.sqrt(dx * dx + dy * dy), v = 5;
    if (d < v) { G.stato = "seduto"; G.fino = ora + 4000 + Math.random() * 9000; }
    else { G.x += dx / d * v; G.y += dy / d * v; G.verso = dx >= 0 ? 1 : -1; }
  }
  // effetti dell'umore
  if (G.stato !== "dorme" && u.festa && G.f % 70 === 0) cuoricino();
  if (G.stato === "seduto" && u.freddo && G.f % 90 === 0) fumetto("brrr… piove");
  var tremo = G.stato === "seduto" && u.freddo && G.f % 4 < 2 ? 1 : 0;
  var corpo = $("gatto"), salto = G.salto ? -Math.sin(G.salto / 10 * Math.PI) * 40 : 0;
  corpo.style.transform = "translate(" + Math.round(G.x + tremo) + "px," + Math.round(G.y + salto) + "px) scaleX(" + G.verso + ")";
  $("gatto-zzz").hidden = G.stato !== "dorme";
  $("gatto-zzz").style.transform = "translate(" + Math.round(G.x + 70) + "px," + Math.round(G.y - 6) + "px)";
  $("gatto-fumetto").style.transform = "translate(" + Math.round(G.x + 20) + "px," + Math.round(G.y - 34) + "px)";
  $("gatto").title = G.stato === "dorme" ? "Dorme: " + u.perche : "Accarezzami";
  disegnaGatto($("gatto").getContext("2d"), G.stato, G.f);
}
function coccola() {
  G.coccole = Date.now() + 6000; G.stato = "seduto"; G.fino = Date.now() + 6000;
  fumetto(umore().sonno ? "prrr… zzz" : "prrr ♥"); for (var i = 0; i < 4; i++) setTimeout(cuoricino, i * 250);
}
function saltaGatto() { G.salto = 10; G.stato = "seduto"; G.fino = Date.now() + 5000; fumetto("MIAO! Il timer!", 4000); }

function avviaGatto() {
  var acceso = leggi("gatto_acceso", true);
  $("gatto-strato").hidden = !acceso;
  if (!acceso || avviaGatto.fatto) return;
  avviaGatto.fatto = true;
  var c = $("gatto"); c.width = G.W; c.height = G.H; c.style.width = G.W * G.S + "px"; c.style.height = G.H * G.S + "px";
  G.x = innerWidth * 0.6; G.y = innerHeight * 0.75; nuovaMeta(); G.fino = Date.now() + 2000;
  c.addEventListener("click", coccola);
  setInterval(passoGatto, 100);
}
