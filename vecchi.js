// Home2Love — rattoppi per i browser vecchi (es. l'iPad mini con iOS 9: Safari 9 non ha fetch,
// Object.assign, closest…). Sui dispositivi moderni non fa nulla. Va caricato per primo.
(function () {
  if (!Object.assign) Object.assign = function (t) { for (var i = 1; i < arguments.length; i++) { var s = arguments[i]; if (s) for (var k in s) if (Object.prototype.hasOwnProperty.call(s, k)) t[k] = s[k]; } return t; };
  var E = window.Element && Element.prototype;
  if (E && !E.matches) E.matches = E.webkitMatchesSelector || E.msMatchesSelector;
  if (E && !E.closest) E.closest = function (sel) { var n = this; while (n && n.nodeType === 1) { if (n.matches(sel)) return n; n = n.parentNode; } return null; };
  if (E && !E.remove) E.remove = function () { if (this.parentNode) this.parentNode.removeChild(this); };
  if (window.NodeList && !NodeList.prototype.forEach) NodeList.prototype.forEach = Array.prototype.forEach;
  var A = Array.prototype;
  if (!A.find) A.find = function (f, t) { for (var i = 0; i < this.length; i++) if (f.call(t, this[i], i, this)) return this[i]; };
  if (!A.findIndex) A.findIndex = function (f, t) { for (var i = 0; i < this.length; i++) if (f.call(t, this[i], i, this)) return i; return -1; };
  if (!A.includes) A.includes = function (x) { return this.indexOf(x) >= 0; };
  var S = String.prototype;
  if (!S.includes) S.includes = function (x, i) { return this.indexOf(x, i) >= 0; };
  if (!S.startsWith) S.startsWith = function (x, i) { i = i || 0; return this.substr(i, x.length) === x; };
  if (!S.endsWith) S.endsWith = function (x) { return this.slice(-x.length) === x; };
  if (!S.padStart) S.padStart = function (n, c) { var s = String(this); c = c || " "; while (s.length < n) s = c + s; return s.slice(-n); };
  // canvas: ellipse()
  var C = window.CanvasRenderingContext2D && CanvasRenderingContext2D.prototype;
  if (C && !C.ellipse) C.ellipse = function (x, y, rx, ry, rot, a0, a1, acw) {
    this.save(); this.translate(x, y); this.rotate(rot); this.scale(rx, ry); this.arc(0, 0, 1, a0, a1, acw); this.restore();
  };
  // fetch() con XMLHttpRequest (quanto basta per GET/PUT con JSON)
  if (!window.fetch && window.Promise) window.fetch = function (url, o) {
    o = o || {};
    return new Promise(function (ok, ko) {
      var x = new XMLHttpRequest(); x.open(o.method || "GET", url, true);
      var h = o.headers || {}; for (var k in h) if (h.hasOwnProperty(k)) x.setRequestHeader(k, h[k]);
      x.onload = function () {
        var testo = x.responseText;
        ok({ ok: x.status >= 200 && x.status < 300, status: x.status, statusText: x.statusText,
             headers: { get: function (n) { return x.getResponseHeader(n); } },
             text: function () { return Promise.resolve(testo); },
             json: function () { return new Promise(function (s, r) { try { s(JSON.parse(testo)); } catch (e) { r(e); } }); } });
      };
      x.onerror = function () { ko(new TypeError("Rete non raggiungibile")); };
      x.ontimeout = x.onerror;
      x.send(o.body == null ? null : o.body);
    });
  };
})();
