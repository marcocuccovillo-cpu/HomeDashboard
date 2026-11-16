#!/usr/bin/env python3
"""HomeDashboard — lettore dei dispositivi connessi alla Vodafone Station.

Gira in casa (sul tablet con Termux, o su un PC/Raspberry sempre acceso): ogni pochi minuti
entra nel router, legge la lista dei dispositivi e la pubblica, cifrata con la password di casa,
in dispositivi.json nel ramo "cassaforte" del repository GitHub. La dashboard la mostra nella
seconda schermata. Con la password ricava anche il codice GitHub (salvato cifrato in chiave.json).

Uso:
  python dispositivi.py --configura   chiede router, utente e password del router e la password di casa
  python dispositivi.py --prova       legge il router una volta e stampa la lista, senza pubblicare
  python dispositivi.py               continua a leggere e pubblicare (lasciarlo acceso)

Per il router usa la libreria aiovodafone (la stessa dell'integrazione Home Assistant).
Non pubblica gli indirizzi MAC.
"""

import argparse
import asyncio
import base64
import getpass
import hashlib
import json
import os
import shutil
import subprocess
import threading
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import parse_qs, urlparse
import sys
import time
import urllib.error
import urllib.request
from datetime import datetime, timezone

CONFIG = os.path.expanduser("~/.homedashboard.json")
FILE = "dispositivi.json"
RAMO = "cassaforte"
CHIAVE = "chiave.json"
BATTITO = 30 * 60   # anche se non cambia niente, pubblica almeno ogni 30 minuti (così si vede che è vivo)


def leggi_config():
    try:
        with open(CONFIG, encoding="utf-8") as f:
            return json.load(f)
    except FileNotFoundError:
        sys.exit("Manca la configurazione: esegui prima  python dispositivi.py --configura")


def chiedi(testo, predefinito="", segreto=False):
    """Domanda dal terminale (funziona anche se lo script arriva da una pipe)."""
    try:
        tty = open("/dev/tty", "r+", encoding="utf-8")
    except OSError:
        tty = None
    etichetta = f"{testo}" + (f" [{predefinito}]" if predefinito and not segreto else "") + ": "
    if segreto:
        valore = getpass.getpass(etichetta, stream=tty) if tty else getpass.getpass(etichetta)
    elif tty:
        tty.write(etichetta)
        tty.flush()
        valore = tty.readline().strip()
    else:
        valore = input(etichetta).strip()
    return valore or predefinito


def salva_strategia(nome):
    try:
        with open(CONFIG, encoding="utf-8") as f:
            c = json.load(f)
        c["strategia"] = nome
        with open(CONFIG, "w", encoding="utf-8") as f:
            json.dump(c, f, indent=1)
    except OSError:
        pass


def configura():
    vecchia = {}
    if os.path.exists(CONFIG):
        with open(CONFIG, encoding="utf-8") as f:
            vecchia = json.load(f)
    print("\nConfigurazione del lettore dispositivi (premi Invio per tenere il valore tra parentesi).\n")
    c = {
        "router": chiedi("Indirizzo del router", vecchia.get("router", "192.168.1.1")),
        "utente": chiedi("Utente del router (di solito 'vodafone' o 'admin')", vecchia.get("utente", "vodafone")),
        "password": chiedi("Password del router (quella dell'etichetta o quella che hai impostato)", segreto=True) or vecchia.get("password", ""),
        "segreto": chiedi("Password di casa (quella che usate per entrare nella dashboard)", segreto=True) or vecchia.get("segreto", ""),
        "repo": chiedi("Repository", vecchia.get("repo", "marcocuccovillo-cpu/HomeDashboard")),
        "ogni": int(chiedi("Ogni quanti secondi leggere il router", str(vecchia.get("ogni", 300)))),
    }
    with open(CONFIG, "w", encoding="utf-8") as f:
        json.dump(c, f, indent=1)
    os.chmod(CONFIG, 0o600)   # password: leggibili solo da questo utente
    print(f"\nSalvata in {CONFIG}\n")


# ---------------------------------------------------------------- router
# Modi diversi di tenere la sessione con il router: alcuni firmware della Vodafone Station
# rimandano al login se i cookie vengono "ritoccati" o se si passa da https a http.
# Si provano in ordine e quello che funziona viene ricordato nella configurazione.
STRATEGIE = [
    {"nome": "normale"},
    {"nome": "cookie-grezzi", "grezzi": True, "pausa": 1},
    {"nome": "http", "grezzi": True, "pausa": 1, "schema": "http"},
    {"nome": "https", "grezzi": True, "pausa": 1, "schema": "https"},
]


class RouterNonLegge(Exception):
    """Login riuscito ma il router non dà la lista: si prova la strategia successiva."""


# Rete Wi-Fi ospiti (nome, password, QR) per il riquadro della dashboard: letta al massimo una volta l'ora.
_ospiti = {"quando": 0, "dati": None}


async def leggi_ospiti(api):
    from aiovodafone.const import WIFI_DATA, WifiBand, WifiType
    w = await api.get_wifi_data()
    info = (w.get(WIFI_DATA) or w).get("guest") or {}
    if not info:
        return None
    o = {"ssid": info.get("ssid", ""), "attivo": bool(int(info.get("on", 0) or 0))}
    try:   # la password non è nel risultato ma nei dati appena decifrati dalla libreria
        frmt = await api._get_wifi_format(WifiType.GUEST, WifiBand.BAND_2_4_GHZ)
        piano = getattr(api, "_wifi_plain_data", {}) or {}
        o["password"] = piano.get(f"wifi_password{frmt}", "")
        o["sicurezza"] = piano.get(f"wifi_protection{frmt}", "")
    except Exception:
        pass
    qr = info.get("qr_code")
    if qr is not None:
        try:
            o["qr"] = base64.b64encode(qr.getvalue()).decode()
        except Exception:
            pass
    return o


async def _leggi_con(c, s):
    import aiohttp
    from aiovodafone.exceptions import AlreadyLogged, CannotAuthenticate, CannotConnect, GenericLoginError, ModelNotSupported
    from aiovodafone.models import get_device_type, init_device_class

    def barattolo():   # unsafe=True: serve per tenere i cookie con un indirizzo IP (192.168.1.1)
        return aiohttp.CookieJar(unsafe=True, quote_cookie=not s.get("grezzi"))

    async with aiohttp.ClientSession(cookie_jar=barattolo()) as prova:
        try:
            modello, url = await get_device_type(c["router"], prova)
        except CannotConnect:
            raise RuntimeError(f"Non raggiungo il router {c['router']}: sei sulla rete di casa?")
        except ModelNotSupported:
            raise RuntimeError("Il router risponde ma il modello non è riconosciuto da aiovodafone.")
    if s.get("schema"):
        url = url.with_scheme(s["schema"])

    # sessione nuova e pulita per l'accesso vero e proprio
    async with aiohttp.ClientSession(cookie_jar=barattolo()) as sessione:
        api = init_device_class(url, modello, {"username": c["utente"], "password": c["password"]}, sessione)
        try:
            try:
                entrato = await api.login()
            except AlreadyLogged:   # una sessione è rimasta aperta (pannello o tentativo precedente): la chiudo
                entrato = await api.login(force_logout=True)
            if not entrato:
                raise RuntimeError("Il router ha rifiutato utente o password.")
        except (CannotAuthenticate, GenericLoginError):
            raise RuntimeError("Il router ha rifiutato utente o password (prova l'utente 'vodafone' o 'admin').")
        try:
            if s.get("pausa"):
                await asyncio.sleep(s["pausa"])
            try:
                dati = await api.get_devices_data()
            except CannotAuthenticate as e:
                raise RouterNonLegge(str(e))
            if c.get("_vuoi_wifi"):
                try:
                    _ospiti["dati"] = await leggi_ospiti(api)
                    _ospiti["quando"] = time.time()
                except Exception as e:   # non indispensabile: riprovo tra un'ora
                    _ospiti["quando"] = time.time()
                    print(f"{ora()}  rete ospiti non letta: {type(e).__name__}: {e}")
        finally:
            try:
                await api.logout()   # libera la sessione: il pannello del router resta usabile
            except Exception:
                pass
    return str(modello), dati


async def leggi_router(c):
    """Restituisce (modello, [dispositivi]) leggendo la Vodafone Station."""
    preferita = c.get("strategia")
    ordine = sorted(STRATEGIE, key=lambda s: s["nome"] != preferita)
    ultimo = None
    for s in ordine:
        try:
            modello, dati = await _leggi_con(c, s)
        except RouterNonLegge as e:
            ultimo = e
            print(f"   (modo '{s['nome']}': il router chiede di nuovo il login, provo un altro modo)")
            await asyncio.sleep(2)
            continue
        if s["nome"] != preferita:
            c["strategia"] = s["nome"]
            salva_strategia(s["nome"])
        break
    else:
        raise RuntimeError("Il router accetta la password ma poi non dà la lista dei dispositivi. "
                           "Lancia  python dispositivi.py --diagnosi  e manda la foto del risultato.")

    lista = []
    for d in dati.values():
        tipo = (d.connection_type or "").lower()
        if "guest" in tipo:
            via = "ospiti"
        elif "wifi" in tipo or "wi-fi" in tipo or "wlan" in tipo:
            via = "wifi"
        elif "eth" in tipo or "lan" in tipo:
            via = "cavo"
        else:
            via = tipo or "?"
        lista.append({
            "nome": (d.name or "").strip() or "Senza nome",
            "ip": d.ip_address or "",
            "via": via,
            "banda": (d.wifi or "").strip(),
            "attivo": bool(d.connected),
            "tipo": (d.type or "").strip(),
        })
    lista.sort(key=lambda x: (not x["attivo"], x["nome"].lower()))
    return str(modello), lista


# ---------------------------------------------------------------- cifratura
# Stesso formato della dashboard: base64( IV 12 byte + testo cifrato AES-GCM + tag 16 byte ),
# chiave AES-256 ricavata dalla password con PBKDF2-SHA256.
def _aes():
    try:   # pycryptodome (arriva con aiovodafone, anche su Termux)
        from Crypto.Cipher import AES

        def cifra(k, iv, dati):
            ct, tag = AES.new(k, AES.MODE_GCM, nonce=iv).encrypt_and_digest(dati)
            return ct + tag

        def decifra(k, iv, dati):
            return AES.new(k, AES.MODE_GCM, nonce=iv).decrypt_and_verify(dati[:-16], dati[-16:])
    except ImportError:   # in alternativa la libreria "cryptography"
        from cryptography.hazmat.primitives.ciphers.aead import AESGCM

        def cifra(k, iv, dati):
            return AESGCM(k).encrypt(iv, dati, None)

        def decifra(k, iv, dati):
            return AESGCM(k).decrypt(iv, dati, None)
    return cifra, decifra


def cifra_testo(chiave, testo):
    cifra, _ = _aes()
    iv = os.urandom(12)
    return base64.b64encode(iv + cifra(chiave, iv, testo.encode())).decode()


def decifra_testo(chiave, b64):
    _, decifra = _aes()
    dati = base64.b64decode(b64)
    return decifra(chiave, dati[:12], dati[12:]).decode()


def apri_cassaforte(c):
    """Legge chiave.json (pubblico), ricava la chiave dalla password e decifra il codice GitHub."""
    url = f"https://api.github.com/repos/{c['repo']}/contents/{CHIAVE}?ref={RAMO}"
    try:
        req = urllib.request.Request(url, headers={"Accept": "application/vnd.github+json", "User-Agent": "homedashboard-dispositivi"})
        with urllib.request.urlopen(req, timeout=20) as r:
            cassa = json.loads(base64.b64decode(json.loads(r.read())["content"]))
    except urllib.error.HTTPError as e:
        if e.code == 404:
            raise RuntimeError("La dashboard non ha ancora una password: creala prima sul tablet.")
        raise RuntimeError(f"Non riesco a leggere la cassaforte (GitHub {e.code}).")
    if not c.get("segreto"):
        raise RuntimeError("Manca la password di casa: rifai  --configura")
    chiave = hashlib.pbkdf2_hmac("sha256", c["segreto"].encode(), base64.b64decode(cassa["sale"]), int(cassa["giri"]), 32)
    try:
        token = decifra_testo(chiave, cassa["token"])
    except Exception:
        raise RuntimeError("La password di casa non è giusta: rifai  --configura")
    return chiave, token


# ---------------------------------------------------------------- GitHub
def github(c, metodo, percorso, corpo=None):
    req = urllib.request.Request(
        f"https://api.github.com/repos/{c['repo']}{percorso}",
        method=metodo,
        data=json.dumps(corpo).encode() if corpo is not None else None,
        headers={"Authorization": f"Bearer {c['_token']}", "Accept": "application/vnd.github+json",
                 "Content-Type": "application/json", "User-Agent": "homedashboard-dispositivi"},
    )
    try:
        with urllib.request.urlopen(req, timeout=20) as r:
            return r.status, json.loads(r.read() or b"{}")
    except urllib.error.HTTPError as e:
        return e.code, {}


def pubblica(c, contenuto):
    stato, attuale = github(c, "GET", f"/contents/{FILE}?ref={RAMO}")
    if stato == 401:   # il codice è stato cambiato dalla dashboard: rileggo quello nuovo dalla cassaforte
        c["_chiave"], c["_token"] = apri_cassaforte(c)
        stato, attuale = github(c, "GET", f"/contents/{FILE}?ref={RAMO}")
    if stato == 401:
        raise RuntimeError("Il codice GitHub della dashboard non è valido: in ⚙ premi \"Nuovo codice GitHub\".")
    cifrato = cifra_testo(c["_chiave"], json.dumps(contenuto, ensure_ascii=False))
    corpo = {"message": "Aggiorna dispositivi", "branch": RAMO,
             "content": base64.b64encode(json.dumps({"v": 2, "dati": cifrato}).encode()).decode()}
    if stato == 200:
        corpo["sha"] = attuale["sha"]
    stato, _ = github(c, "PUT", f"/contents/{FILE}", corpo)
    if stato == 404:
        raise RuntimeError("Il ramo 'cassaforte' non esiste: crea prima la password sul tablet.")
    if stato not in (200, 201):
        raise RuntimeError(f"GitHub ha risposto {stato} alla pubblicazione.")


# ---------------------------------------------------------------- giro
def stampa(modello, lista):
    attivi = [d for d in lista if d["attivo"]]
    print(f"\nRouter: Vodafone Station ({modello}) · {len(attivi)} connessi su {len(lista)} conosciuti\n")
    for d in lista:
        via = {"wifi": "Wi-Fi", "cavo": "cavo", "ospiti": "Wi-Fi ospiti"}.get(d["via"], d["via"])
        print(f"  {'●' if d['attivo'] else '○'} {d['nome']:<28} {d['ip']:<16} {via} {d['banda']}")
    print()


def ora():
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def main():
    p = argparse.ArgumentParser(description="Lettore dispositivi Vodafone Station per HomeDashboard")
    p.add_argument("--configura", action="store_true", help="chiede le impostazioni e le salva")
    p.add_argument("--prova", action="store_true", help="legge una volta e stampa, senza pubblicare")
    p.add_argument("--diagnosi", action="store_true", help="come --prova ma salva un registro dettagliato in diagnosi.txt")
    a = p.parse_args()
    if a.configura:
        configura()
        return
    c = leggi_config()
    if a.diagnosi:
        diagnosi(c)
        return
    if a.prova:
        try:
            prova(c)
        except RuntimeError as e:
            sys.exit(f"\n{e}\n")
        return
    corri(c)


def diagnosi(c):
    """Registro dettagliato della conversazione con il router (senza password) in diagnosi.txt."""
    import logging
    percorso = os.path.join(os.path.dirname(os.path.abspath(__file__)), "diagnosi.txt")

    class SenzaSegreti(logging.Filter):
        def filter(self, r):
            testo = r.getMessage()
            for segreto in (c.get("password"), c.get("segreto")):
                if segreto:
                    testo = testo.replace(segreto, "***")
            r.msg, r.args = testo, ()
            return True

    h = logging.FileHandler(percorso, mode="w", encoding="utf-8")
    h.addFilter(SenzaSegreti())
    h.setFormatter(logging.Formatter("%(asctime)s %(name)s %(levelname)s %(message)s"))
    for nome in ("aiovodafone", "aiohttp.client"):
        lg = logging.getLogger(nome)
        lg.setLevel(logging.DEBUG)
        lg.addHandler(h)
    import aiovodafone
    print(f"aiovodafone {aiovodafone.__version__}, Python {sys.version.split()[0]}")
    try:
        prova(c)
    except Exception as e:
        print(f"\n{type(e).__name__}: {e}\n")
    print(f"Registro salvato in {percorso}")
    print("Per vedere le ultime righe:  tail -n 40 " + percorso)


def prova(c):
    """Legge il router una volta, stampa la lista e controlla la password di casa."""
    c["_vuoi_wifi"] = True
    modello, lista = asyncio.run(leggi_router(c))
    stampa(modello, lista)
    o = _ospiti["dati"]
    if o:
        print(f"Rete ospiti: {o.get('ssid')} ({'accesa' if o.get('attivo') else 'spenta'}), "
              f"password {'letta' if o.get('password') else 'non letta'}, QR {'pronto' if o.get('qr') else 'assente'}")
    else:
        print("Rete ospiti: non letta (il QR non comparirà nella dashboard)")
    try:
        n = len(aerei(44.4949, 11.3426, 17).get("ac") or [])
        print(f"Aerei: {n} entro 30 km da Bologna (il lettore li passerà alla dashboard)")
    except Exception as e:
        print(f"Aerei: non riesco a leggerli ({e})")
    t = stato_tablet()
    if "batteria" in t:
        print(f"Tablet: batteria {t['batteria']}% · {t.get('temperatura')} °C · {t.get('stato')} · salute {t.get('salute')}")
    else:
        print("Tablet: batteria non leggibile (serve l'app Termux:API e  pkg install termux-api)")
    apri_cassaforte(c)   # se la password di casa è sbagliata qui si ferma con il messaggio
    print("Password di casa giusta: la lista arriverà alla dashboard.\n")


# ---------------------------------------------------------------- salute del tablet
_pieno_da = None


def stato_tablet():
    """Batteria (con l'app Termux:API), RAM, spazio e da quanto è acceso. Quello che manca si salta."""
    global _pieno_da
    t = {"quando": ora()}
    if shutil.which("termux-battery-status"):
        try:
            b = json.loads(subprocess.run(["termux-battery-status"], capture_output=True, text=True, timeout=20).stdout)
            t.update(batteria=b.get("percentage"), stato=b.get("status"), presa=b.get("plugged"),
                     salute=b.get("health"), temperatura=b.get("temperature"))
        except Exception:
            pass
    try:
        mem = {}
        with open("/proc/meminfo") as f:
            for riga in f:
                k, v = riga.split(":", 1)
                mem[k] = int(v.split()[0])
        t["ram_totale"], t["ram_libera"] = mem["MemTotal"] // 1024, mem.get("MemAvailable", mem.get("MemFree", 0)) // 1024
    except Exception:
        pass
    try:
        st = os.statvfs(os.path.expanduser("~"))
        t["disco_totale"], t["disco_libero"] = round(st.f_blocks * st.f_frsize / 1e9, 1), round(st.f_bavail * st.f_frsize / 1e9, 1)
    except Exception:
        pass
    try:
        with open("/proc/uptime") as f:
            t["acceso_da"] = int(float(f.read().split()[0]))
    except Exception:
        pass
    in_presa = t.get("presa") not in (None, "UNPLUGGED")
    if t.get("batteria") == 100 and in_presa:
        _pieno_da = _pieno_da or time.time()
        t["pieno_da"] = int(_pieno_da)
    else:
        _pieno_da = None
    return t


def impronta_tablet(t):
    """Quello che conta per decidere se ripubblicare (la temperatura a passi di 2 gradi)."""
    temp = t.get("temperatura")
    return (t.get("batteria"), t.get("stato"), t.get("presa"), t.get("salute"), None if temp is None else round(temp / 2))


# ---------------------------------------------------------------- aerei per la dashboard
# Alcuni servizi ADS-B non permettono a una pagina web di un altro sito di leggere i dati (CORS).
# Il lettore li chiede lui e li passa alla dashboard da http://127.0.0.1:8789 (solo dal tablet stesso).
PORTA_AEREI = 8789
_aerei_cache = {"chiave": None, "quando": 0, "dati": None}


def _scarica_json(url):
    req = urllib.request.Request(url, headers={"User-Agent": "homedashboard", "Accept": "application/json"})
    with urllib.request.urlopen(req, timeout=8) as r:
        return json.loads(r.read())


def aerei(lat, lon, nm):
    chiave = (round(lat, 3), round(lon, 3), nm)
    if _aerei_cache["chiave"] == chiave and time.time() - _aerei_cache["quando"] < 10:
        return _aerei_cache["dati"]
    dati, errori = None, []
    for url in (f"https://api.adsb.lol/v2/point/{lat}/{lon}/{nm}", f"https://api.airplanes.live/v2/point/{lat}/{lon}/{nm}"):
        try:
            dati = _scarica_json(url)
            break
        except Exception as e:
            errori.append(f"{url.split('/')[2]}: {e}")
    if dati is None:   # OpenSky: stati → stesso formato
        try:
            d = nm * 1.852 / 111
            j = _scarica_json(f"https://opensky-network.org/api/states/all?lamin={lat-d}&lomin={lon-d*1.4}&lamax={lat+d}&lomax={lon+d*1.4}")
            dati = {"ac": [{"hex": s[0], "flight": s[1], "lat": s[6], "lon": s[5],
                            "alt_baro": "ground" if s[8] else (s[7] / 0.3048 if s[7] is not None else None),
                            "gs": s[9] * 1.94384 if s[9] is not None else None, "track": s[10]} for s in (j.get("states") or [])]}
        except Exception as e:
            errori.append(f"opensky: {e}")
    if dati is None:
        raise RuntimeError(" · ".join(errori))
    _aerei_cache.update(chiave=chiave, quando=time.time(), dati=dati)
    return dati


class _Aerei(BaseHTTPRequestHandler):
    def _intestazioni(self, stato, tipo="application/json"):
        self.send_response(stato)
        self.send_header("Content-Type", tipo)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Private-Network", "true")   # Chrome: pagina internet → tablet
        self.send_header("Access-Control-Allow-Methods", "GET, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "*")
        self.send_header("Cache-Control", "no-store")
        self.end_headers()

    def do_OPTIONS(self):
        self._intestazioni(204)

    def do_GET(self):
        u = urlparse(self.path)
        if u.path != "/aerei":
            self._intestazioni(404)
            return
        q = parse_qs(u.query)
        try:
            lat, lon = float(q["lat"][0]), float(q["lon"][0])
            nm = max(1, min(60, int(q.get("nm", ["17"])[0])))
            corpo = json.dumps(aerei(lat, lon, nm)).encode()
            self._intestazioni(200)
            self.wfile.write(corpo)
        except Exception as e:
            self._intestazioni(502)
            self.wfile.write(json.dumps({"errore": str(e)}).encode())

    def log_message(self, *a):   # niente righe nel registro per ogni richiesta
        pass


def avvia_servizio_aerei():
    try:
        srv = ThreadingHTTPServer(("127.0.0.1", PORTA_AEREI), _Aerei)
    except OSError as e:
        print(f"{ora()}  servizio aerei non avviato (porta {PORTA_AEREI} occupata?): {e}")
        return
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    print(f"{ora()}  servizio aerei per la dashboard su http://127.0.0.1:{PORTA_AEREI}")


def corri(c):
    """Continua a leggere il router e a pubblicare la lista cifrata."""
    avvia_servizio_aerei()
    while True:   # all'accensione la rete può non esserci ancora
        try:
            c["_chiave"], c["_token"] = apri_cassaforte(c)
            break
        except RuntimeError as e:
            print(f"{ora()}  {e}")
            if "password" in str(e) or "non ha ancora" in str(e):
                sys.exit(1)
            time.sleep(60)
        except OSError as e:
            print(f"{ora()}  rete non pronta ({e}), riprovo tra un minuto")
            time.sleep(60)
    print(f"{ora()}  lettore avviato: leggo il router ogni {c.get('ogni', 300)} secondi")
    ultima_lista, ultima_impronta, ultima_pubblicazione, attesa_errore = None, None, 0, 60
    while True:
        try:
            tablet = stato_tablet()
            c["_vuoi_wifi"] = time.time() - _ospiti["quando"] > 3600
            modello, lista = asyncio.run(leggi_router(c))
            o = _ospiti["dati"] or {}
            impronta = (impronta_tablet(tablet), o.get("ssid"), o.get("password"), o.get("attivo"))
            cambiata = lista != ultima_lista or impronta != ultima_impronta
            if cambiata or time.time() - ultima_pubblicazione > BATTITO:
                pubblica(c, {"aggiornato": ora(), "modello": modello, "ogni": c.get("ogni", 300),
                             "dispositivi": lista, "errore": "", "tablet": tablet, "ospiti": _ospiti["dati"]})
                ultima_lista, ultima_impronta, ultima_pubblicazione = lista, impronta, time.time()
                print(f"{ora()}  pubblicati {sum(d['attivo'] for d in lista)} dispositivi connessi")
            attesa_errore = 60
            time.sleep(max(60, int(c.get("ogni", 300))))
        except KeyboardInterrupt:
            return
        except Exception as e:   # router spento, Wi-Fi caduto, password cambiata…: riprova più tardi
            print(f"{ora()}  errore: {e}")
            try:   # lo segnala anche alla dashboard, mantenendo l'ultima lista nota
                pubblica(c, {"aggiornato": ora(), "modello": "", "ogni": c.get("ogni", 300),
                             "dispositivi": ultima_lista or [], "errore": str(e), "tablet": stato_tablet(),
                             "ospiti": _ospiti["dati"]})
            except Exception:
                pass
            time.sleep(attesa_errore)
            attesa_errore = min(attesa_errore * 2, 15 * 60)


if __name__ == "__main__":
    main()
