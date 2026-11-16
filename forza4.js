// HomeDashboard — Forza 4 a distanza tra le due persone di casa.
// La partita sta in cfg.forza4 e si sincronizza (cifrata) come i turni: ognuno muove quando vuole.
// Stato: celle = 42 caratteri (riga per riga dall'alto, "." vuota, "0"/"1" pedina), turno, vincitore, punti.

var F4 = { C: 7, R: 6 };
function f4Nuova(primo) {
  var p = cfg.forza4 && cfg.forza4.punti || [0, 0];
  return { celle: new Array(43).join("."), turno: primo || 0, primo: primo || 0, vincitore: null, vincenti: [], punti: p, ultima: -1 };
}
function f4Stato() {
  // partita vuota solo da mostrare: si salva alla prima mossa, così non copre una mossa dell'altro non ancora arrivata
  return cfg.forza4 && typeof cfg.forza4.celle === "string" && cfg.forza4.celle.length === 42 ? cfg.forza4 : f4Nuova(0);
}
function f4Cella(s, r, c) { return s.celle.charAt(r * F4.C + c); }
function f4Quattro(celle, i) {   // le 4 celle allineate che passano da i, se ci sono
  var r = Math.floor(i / F4.C), c = i % F4.C, chi = celle.charAt(i);
  var dir = [[0, 1], [1, 0], [1, 1], [1, -1]];
  for (var k = 0; k < dir.length; k++) {
    var linea = [i];
    for (var verso = -1; verso <= 1; verso += 2) {
      var rr = r + dir[k][0] * verso, cc = c + dir[k][1] * verso;
      while (rr >= 0 && rr < F4.R && cc >= 0 && cc < F4.C && celle.charAt(rr * F4.C + cc) === chi) {
        linea.push(rr * F4.C + cc); rr += dir[k][0] * verso; cc += dir[k][1] * verso;
      }
    }
    if (linea.length >= 4) return linea;
  }
  return null;
}
function f4Muovi(c) {   // fa cadere la pedina di chi è di turno nella colonna c
  var s = f4Stato(); if (s.vincitore !== null) return false;
  for (var r = F4.R - 1; r >= 0; r--) {
    var i = r * F4.C + c;
    if (s.celle.charAt(i) !== ".") continue;
    var n = JSON.parse(JSON.stringify(s));
    n.celle = s.celle.substr(0, i) + s.turno + s.celle.substr(i + 1); n.ultima = i;
    var vinta = f4Quattro(n.celle, i);
    if (vinta) { n.vincitore = s.turno; n.vincenti = vinta; n.punti[s.turno]++; }
    else if (n.celle.indexOf(".") < 0) n.vincitore = "pari";
    else n.turno = 1 - s.turno;
    cfg.forza4 = n; salvaCfg();
    return true;
  }
  return false;   // colonna piena
}
function f4Rivincita() {   // inizia chi ha perso (o, se pari, l'altro)
  var s = f4Stato(), primo = s.vincitore === 0 ? 1 : s.vincitore === 1 ? 0 : 1 - s.primo;
  cfg.forza4 = f4Nuova(primo); salvaCfg();
}
// Disegna la griglia dentro "box" (tablet o telefono): le colonne si toccano per giocare.
function f4Disegna(box, info) {
  if (!box) return;
  var s = f4Stato(), html = "", nuova = s.ultima !== box.ultimaVista && box.ultimaVista !== undefined;
  box.ultimaVista = s.ultima;
  for (var r = 0; r < F4.R; r++) for (var c = 0; c < F4.C; c++) {
    var v = f4Cella(s, r, c), i = r * F4.C + c, cls = "f4c";
    if (v !== ".") cls += " p" + v + (s.vincenti.indexOf(i) >= 0 ? " vince" : "") + (i === s.ultima && nuova ? " ultima" : "");
    html += '<i class="' + cls + '" data-c="' + c + '"></i>';
  }
  box.innerHTML = html;
  [].forEach.call(box.children, function (cella) {
    cella.onclick = function () { if (f4Muovi(+cella.getAttribute("data-c"))) f4Disegna(box, info); };
  });
  if (info) {
    var nomi = cfg.nomi;
    info.innerHTML = "";
    var t = document.createElement("span");
    t.textContent = s.vincitore === "pari" ? "Pareggio!" : s.vincitore !== null ? "Ha vinto " + nomi[s.vincitore] + "!" : "Tocca a " + nomi[s.turno];
    t.className = "f4-turno" + (s.vincitore === null ? " p" + s.turno : s.vincitore === "pari" ? "" : " p" + s.vincitore);
    var p = document.createElement("span"); p.className = "f4-punti";
    p.textContent = nomi[0] + " " + s.punti[0] + " – " + s.punti[1] + " " + nomi[1];
    info.appendChild(t); info.appendChild(p);
    if (s.vincitore !== null) {
      var b = document.createElement("button"); b.type = "button"; b.className = "btn-piccolo f4-rivincita"; b.textContent = "Rivincita";
      b.onclick = function () { f4Rivincita(); f4Disegna(box, info); };
      info.appendChild(b);
    }
  }
}
