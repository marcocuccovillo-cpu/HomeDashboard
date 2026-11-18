#!/usr/bin/env python3
"""Home2Love — server delle telecamere, gira sul tablet in Termux.

Il video dei telefoni-telecamera passa da qui per arrivare al tuo telefono, in casa e fuori casa
(con una porta aperta sulla Vodafone Station). Nessun servizio esterno.

- Tutto quello che passa è già cifrato dai telefoni con la password delle telecamere: questo server
  non conosce la chiave e non può vedere il video. Inoltra soltanto.
- Per usarlo serve un "codice di accesso" che i telefoni ricavano dalla stessa password (ma con un sale
  diverso dalla chiave): qui è salvata solo la sua impronta. Chi non ha la password riceve 403.
- Collegamento https con un certificato creato qui (ogni telefono lo accetta una volta).

Uso:
  python telecamere.py --configura   chiede la password delle telecamere e crea il certificato
  python telecamere.py --indirizzi   mostra gli indirizzi da mettere nella pagina Telecamere
  python telecamere.py               accende il server (lasciarlo acceso)
"""

import argparse
import base64
import getpass
import hashlib
import hmac
import json
import os
import re
import socket
import ssl
import subprocess
import sys
import threading
import time
from collections import deque
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import parse_qs, urlparse

CARTELLA = os.path.expanduser("~/.home2love_telecamere")
CONFIG = os.path.join(CARTELLA, "config.json")
CERT = os.path.join(CARTELLA, "cert.pem")
CHIAVE = os.path.join(CARTELLA, "chiave.pem")
PORTA = 8443

MAX_EVENTO = 64 * 1024          # un messaggio di presentazione
MAX_PEZZO = 4 * 1024 * 1024     # un pezzo di video (circa un quarto di secondo)
MAX_CODA = 24 * 1024 * 1024     # video in attesa per un canale: oltre, chi guarda non sta dietro e si chiude
MAX_CANALI = 16
MAX_ASCOLTI = 40
CANALE_RE = re.compile(r"[0-9a-f]{16,64}")


def ora():
    return time.strftime("%H:%M:%S")


def accesso_da_password(pw):   # identico a TCAM.preparaChiave nel browser
    b = hashlib.pbkdf2_hmac("sha256", pw.encode(), b"home2love-telecamere-accesso", 300000, 16)
    return base64.urlsafe_b64encode(b).rstrip(b"=").decode()


def impronta(a):
    return hashlib.sha256(a.encode()).hexdigest()


def ip_di_casa():
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        s.connect(("192.168.1.1", 80))   # non manda nulla: serve solo a sapere quale indirizzo usa il tablet
        return s.getsockname()[0]
    except OSError:
        return "?"
    finally:
        s.close()


def leggi_config():
    try:
        with open(CONFIG) as f:
            return json.load(f)
    except (OSError, ValueError):
        return None


def configura():
    os.makedirs(CARTELLA, exist_ok=True)
    os.chmod(CARTELLA, 0o700)
    print("\n== Server delle telecamere ==")
    print("Scrivi la password delle telecamere (la stessa che usi nella pagina Telecamere).")
    print("Non viene salvata: qui resta solo un'impronta per riconoscere i tuoi telefoni.\n")
    while True:
        pw = getpass.getpass("Password delle telecamere: ")
        if len(pw) < 8:
            print("Almeno 8 caratteri.")
            continue
        if getpass.getpass("Ripetila: ") != pw:
            print("Non coincidono, riprova.")
            continue
        break
    vecchia = leggi_config() or {}
    porta = vecchia.get("porta", PORTA)
    print("Calcolo l'impronta (qualche secondo)…")
    c = {"impronta": impronta(accesso_da_password(pw)), "porta": porta}
    with open(CONFIG, "w") as f:
        json.dump(c, f)
    os.chmod(CONFIG, 0o600)
    if not (os.path.exists(CERT) and os.path.exists(CHIAVE)):
        crea_certificato()
    print("Fatto.")
    mostra_indirizzi(c)


def crea_certificato():
    print("Creo il certificato https del tablet…")
    try:
        subprocess.run(["openssl", "req", "-x509", "-newkey", "ec", "-pkeyopt", "ec_paramgen_curve:prime256v1", "-nodes",
                        "-keyout", CHIAVE, "-out", CERT, "-days", "3650", "-subj", "/CN=Home2Love telecamere"],
                       check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    except (OSError, subprocess.CalledProcessError):
        sys.exit("Non riesco a creare il certificato: installa openssl con   pkg install openssl-tool   e riprova.")
    os.chmod(CHIAVE, 0o600)


def mostra_indirizzi(c):
    print("\nNella pagina Telecamere (⚙ Server di casa) scrivi:")
    print(f"   indirizzo in casa:  {ip_di_casa()}")
    print(f"   porta:              {c.get('porta', PORTA)}")
    print("Sulla Vodafone Station, in Port Mapping, inoltra la porta", c.get("porta", PORTA), "(TCP) a", ip_di_casa())
    print("e fissa l'indirizzo del tablet (DHCP statico), così non cambia.\n")


# ---------------------------------------------------------------- bacheca: messaggi cifrati di presentazione
class Bacheca:
    def __init__(self):
        self.cond = threading.Condition()
        self.msg = deque(maxlen=200)
        self.n = 0
        self.ascolti = 0

    def metti(self, testo):
        with self.cond:
            self.n += 1
            self.msg.append((self.n, testo))
            self.cond.notify_all()

    def dopo(self, n, attesa):
        with self.cond:
            if self.n <= n:
                self.cond.wait(attesa)
            return [m for m in self.msg if m[0] > n]


# ---------------------------------------------------------------- canali: il video di una telecamera per un telefono
class Canale:
    def __init__(self):
        self.cond = threading.Condition()
        self.pezzi = deque()
        self.byte = 0
        self.lettore = False
        self.chiuso = False
        self.nato = self.visto = time.time()

    def chiudi(self):
        with self.cond:
            self.chiuso = True
            self.pezzi.clear()
            self.byte = 0
            self.cond.notify_all()


BACHECA = Bacheca()
CANALI = {}
CANALI_LOCK = threading.Lock()


def canale(nome, crea=True):
    with CANALI_LOCK:
        c = CANALI.get(nome)
        if c is None and crea:
            if len(CANALI) >= MAX_CANALI:
                return None
            c = CANALI[nome] = Canale()
        return c


def pulizia():
    while True:
        time.sleep(15)
        adesso = time.time()
        with CANALI_LOCK:
            for k in list(CANALI):
                c = CANALI[k]
                if c.chiuso or adesso - c.visto > 60:
                    c.chiudi()
                    del CANALI[k]


class Gestore(BaseHTTPRequestHandler):
    protocol_version = "HTTP/1.1"
    server_version = "Home2Love"
    sys_version = ""
    impronta = ""

    def log_message(self, *a):
        pass

    def _testa(self, stato, tipo="application/json", lunghezza=None, flusso=False):
        self.send_response(stato)
        self.send_header("Content-Type", tipo)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Private-Network", "true")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "X-Casa, Content-Type")
        self.send_header("Access-Control-Max-Age", "600")
        self.send_header("Cache-Control", "no-store")
        if flusso:
            self.send_header("Connection", "close")
            self.close_connection = True
        else:
            self.send_header("Content-Length", str(lunghezza or 0))
        self.end_headers()

    def _rispondi(self, stato, corpo=b"", tipo="application/json"):
        try:
            self._testa(stato, tipo, len(corpo))
            if corpo:
                self.wfile.write(corpo)
        except OSError:
            self.close_connection = True

    def _autorizzato(self, q):
        k = self.headers.get("X-Casa") or q.get("k", [""])[0]
        return bool(k) and hmac.compare_digest(impronta(k), self.impronta)

    def _corpo(self, massimo):
        try:
            n = int(self.headers.get("Content-Length", "0"))
        except ValueError:
            n = -1
        if n < 0 or n > massimo:
            self.close_connection = True
            return None
        return self.rfile.read(n)

    def do_OPTIONS(self):
        self._rispondi(204)

    def do_GET(self):
        u = urlparse(self.path)
        q = parse_qs(u.query)
        if u.path == "/":   # pagina per accettare il certificato
            return self._rispondi(200, PAGINA.encode(), "text/html; charset=utf-8")
        if not self._autorizzato(q):
            return self._rispondi(403)
        if u.path == "/ping":
            return self._rispondi(200, b'{"ok":true,"versione":1}')
        if u.path == "/eventi":
            return self._eventi()
        m = re.fullmatch(r"/flusso/(.+)", u.path)
        if m and CANALE_RE.fullmatch(m.group(1)):
            return self._flusso(m.group(1))
        self._rispondi(404)

    def do_POST(self):
        u = urlparse(self.path)
        if not self._autorizzato(parse_qs(u.query)):
            self.close_connection = True
            return self._rispondi(403)
        if u.path == "/eventi":
            corpo = self._corpo(MAX_EVENTO)
            if corpo is None:
                return self._rispondi(413)
            try:
                testo = corpo.decode("ascii")
            except UnicodeDecodeError:
                return self._rispondi(400)
            if not re.fullmatch(r"[A-Za-z0-9_-]+", testo):
                return self._rispondi(400)
            BACHECA.metti(testo)
            return self._rispondi(204)
        m = re.fullmatch(r"/pezzo/(.+)", u.path)
        if m and CANALE_RE.fullmatch(m.group(1)):
            corpo = self._corpo(MAX_PEZZO)
            if corpo is None:
                return self._rispondi(413)
            c = canale(m.group(1))
            if c is None:
                return self._rispondi(503)
            with c.cond:
                adesso = time.time()
                if not c.lettore and adesso - c.nato > 20:   # nessuno è venuto a guardare
                    c.chiuso = True
                if c.byte + len(corpo) > MAX_CODA:          # chi guarda non sta dietro
                    c.chiuso = True
                if c.chiuso:
                    c.pezzi.clear()
                    c.cond.notify_all()
                    return self._rispondi(410)
                c.pezzi.append(corpo)
                c.byte += len(corpo)
                c.visto = adesso
                c.cond.notify_all()
            return self._rispondi(204)
        self._rispondi(404)

    def _eventi(self):   # Server-Sent Events: i messaggi nuovi, a tutti quelli collegati
        with BACHECA.cond:
            if BACHECA.ascolti >= MAX_ASCOLTI:
                return self._rispondi(503)
            BACHECA.ascolti += 1
        try:
            self._testa(200, "text/event-stream", flusso=True)
            self.wfile.write(b"retry: 3000\n\n")
            self.wfile.flush()
            ultimo = BACHECA.n
            while True:
                nuovi = BACHECA.dopo(ultimo, 15)
                if not nuovi:
                    self.wfile.write(b": ok\n\n")
                for n, testo in nuovi:
                    self.wfile.write(b"data: " + testo.encode() + b"\n\n")
                    ultimo = n
                self.wfile.flush()
        except OSError:
            pass
        finally:
            with BACHECA.cond:
                BACHECA.ascolti -= 1

    def _flusso(self, nome):   # il video di un canale: pezzi preceduti dalla lunghezza (4 byte)
        c = canale(nome)
        if c is None:
            return self._rispondi(503)
        with c.cond:
            if c.lettore or c.chiuso:
                return self._rispondi(409)
            c.lettore = True
        try:
            self._testa(200, "application/octet-stream", flusso=True)
            self.wfile.flush()
            while True:
                with c.cond:
                    if not c.pezzi and not c.chiuso:
                        c.cond.wait(15)
                    if c.chiuso:
                        break
                    pezzi = list(c.pezzi)
                    c.pezzi.clear()
                    c.byte = 0
                    c.visto = time.time()
                if not pezzi:
                    self.wfile.write(b"\0\0\0\0")   # segno di vita
                for p in pezzi:
                    self.wfile.write(len(p).to_bytes(4, "big") + p)
                self.wfile.flush()
        except OSError:
            pass
        finally:
            c.chiudi()   # chi guardava se n'è andato: la telecamera smette di mandare


class Server(ThreadingHTTPServer):
    daemon_threads = True
    contesto = None

    def handle_error(self, request, client_address):   # telefoni che rifiutano il certificato, connessioni cadute: niente tracce
        pass

    def finish_request(self, request, client_address):
        # Sulla stessa porta: https normale, oppure http (indirizzo scritto senza "s") → rimando a https.
        request.settimeout(20)
        try:
            primo = request.recv(1, socket.MSG_PEEK)
        except OSError:
            return
        if primo == b"\x16":   # inizio di una connessione https
            tls = self.contesto.wrap_socket(request, server_side=True)
            tls.settimeout(None)
            return super().finish_request(tls, client_address)
        try:
            dati = request.recv(4096).decode("latin-1")
            host = re.search(r"(?im)^host:\s*([^\s]+)", dati)
            host = host.group(1) if host else f"{ip_di_casa()}:{self.server_address[1]}"
            if not re.fullmatch(r"[\w.\-\[\]:]+", host):
                host = f"{ip_di_casa()}:{self.server_address[1]}"
            request.sendall(f"HTTP/1.1 301 Moved Permanently\r\nLocation: https://{host}/\r\nContent-Length: 0\r\nConnection: close\r\n\r\n".encode())
        except OSError:
            pass


PAGINA = """<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Home2Love · tablet</title><body style="background:#0b0d12;color:#eef1f6;font:17px sans-serif;padding:24px">
<h2 style="color:#4fd18b">✓ Collegamento con il tablet riuscito</h2>
<p>Il certificato del tablet è accettato su questo telefono. Chiudi questa scheda e torna alla pagina Telecamere.</p></body>"""


def main():
    ap = argparse.ArgumentParser(description="Home2Love — server delle telecamere")
    ap.add_argument("--configura", action="store_true")
    ap.add_argument("--indirizzi", action="store_true")
    a = ap.parse_args()
    if a.configura:
        return configura()
    c = leggi_config()
    if not c:
        sys.exit("Manca la configurazione: esegui prima  python telecamere.py --configura")
    if a.indirizzi:
        return mostra_indirizzi(c)
    if not (os.path.exists(CERT) and os.path.exists(CHIAVE)):
        crea_certificato()
    Gestore.impronta = c["impronta"]
    porta = int(c.get("porta", PORTA))
    httpd = Server(("0.0.0.0", porta), Gestore)
    ctx = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
    ctx.minimum_version = ssl.TLSVersion.TLSv1_2
    ctx.load_cert_chain(CERT, CHIAVE)
    httpd.contesto = ctx
    threading.Thread(target=pulizia, daemon=True).start()
    print(f"{ora()} server delle telecamere acceso: https://{ip_di_casa()}:{porta}", flush=True)
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        pass


if __name__ == "__main__":
    main()
