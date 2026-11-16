#!/usr/bin/env python3
"""HomeDashboard — lettore dei dispositivi connessi alla Vodafone Station.

Gira in casa (sul tablet con Termux, o su un PC/Raspberry sempre acceso): ogni pochi minuti
entra nel router, legge la lista dei dispositivi e la pubblica in dispositivi.json nel ramo
"dati" del repository GitHub, da dove la dashboard la mostra nella seconda schermata.

Uso:
  python dispositivi.py --configura   chiede router, utente, password e codice GitHub (una volta)
  python dispositivi.py --prova       legge il router una volta e stampa la lista, senza pubblicare
  python dispositivi.py               continua a leggere e pubblicare (lasciarlo acceso)

Per il router usa la libreria aiovodafone (la stessa dell'integrazione Home Assistant).
Non pubblica gli indirizzi MAC: il repository è pubblico.
"""

import argparse
import asyncio
import base64
import getpass
import json
import os
import sys
import time
import urllib.error
import urllib.request
from datetime import datetime, timezone

CONFIG = os.path.expanduser("~/.homedashboard.json")
FILE = "dispositivi.json"
RAMO = "dati"
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
        "token": chiedi("Codice GitHub (dal tablet: ⚙ → Collega un altro telefono → Codice)", segreto=True) or vecchia.get("token", ""),
        "repo": chiedi("Repository", vecchia.get("repo", "marcocuccovillo-cpu/HomeDashboard")),
        "ogni": int(chiedi("Ogni quanti secondi leggere il router", str(vecchia.get("ogni", 300)))),
    }
    with open(CONFIG, "w", encoding="utf-8") as f:
        json.dump(c, f, indent=1)
    os.chmod(CONFIG, 0o600)   # password e codice: leggibili solo da questo utente
    print(f"\nSalvata in {CONFIG}\n")


# ---------------------------------------------------------------- router
async def leggi_router(c):
    """Restituisce (modello, [dispositivi]) leggendo la Vodafone Station."""
    import aiohttp
    from aiovodafone.exceptions import AlreadyLogged, CannotAuthenticate, CannotConnect, GenericLoginError, ModelNotSupported
    from aiovodafone.models import get_device_type, init_device_class

    # unsafe=True: serve per tenere i cookie di sessione con un indirizzo IP (192.168.1.1)
    async with aiohttp.ClientSession(cookie_jar=aiohttp.CookieJar(unsafe=True)) as sessione:
        try:
            modello, url = await get_device_type(c["router"], sessione)
        except CannotConnect:
            raise RuntimeError(f"Non raggiungo il router {c['router']}: sei sulla rete di casa?")
        except ModelNotSupported:
            raise RuntimeError("Il router risponde ma il modello non è riconosciuto da aiovodafone.")
        api = init_device_class(url, modello, {"username": c["utente"], "password": c["password"]}, sessione)
        try:
            try:
                entrato = await api.login()
            except AlreadyLogged:   # qualcuno ha il pannello del router aperto: chiudo quella sessione
                entrato = await api.login(force_logout=True)
            if not entrato:
                raise RuntimeError("Il router ha rifiutato utente o password.")
        except (CannotAuthenticate, GenericLoginError):
            raise RuntimeError("Il router ha rifiutato utente o password (prova l'utente 'vodafone' o 'admin').")
        try:
            dati = await api.get_devices_data()
        finally:
            try:
                await api.logout()   # libera la sessione: il pannello del router resta usabile
            except Exception:
                pass

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


# ---------------------------------------------------------------- GitHub
def github(c, metodo, percorso, corpo=None):
    req = urllib.request.Request(
        f"https://api.github.com/repos/{c['repo']}{percorso}",
        method=metodo,
        data=json.dumps(corpo).encode() if corpo is not None else None,
        headers={"Authorization": f"Bearer {c['token']}", "Accept": "application/vnd.github+json",
                 "Content-Type": "application/json", "User-Agent": "homedashboard-dispositivi"},
    )
    try:
        with urllib.request.urlopen(req, timeout=20) as r:
            return r.status, json.loads(r.read() or b"{}")
    except urllib.error.HTTPError as e:
        return e.code, {}


def pubblica(c, contenuto):
    stato, attuale = github(c, "GET", f"/contents/{FILE}?ref={RAMO}")
    if stato == 401:
        raise RuntimeError("Il codice GitHub non è valido o è scaduto: rifai  --configura")
    corpo = {"message": "Aggiorna dispositivi", "branch": RAMO,
             "content": base64.b64encode(json.dumps(contenuto, ensure_ascii=False, indent=1).encode()).decode()}
    if stato == 200:
        corpo["sha"] = attuale["sha"]
    stato, _ = github(c, "PUT", f"/contents/{FILE}", corpo)
    if stato == 404:
        raise RuntimeError("Il ramo 'dati' non esiste ancora: collega prima il tablet in ⚙ → Condivisione.")
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
    a = p.parse_args()
    if a.configura:
        configura()
        return
    c = leggi_config()
    if a.prova:
        modello, lista = asyncio.run(leggi_router(c))
        stampa(modello, lista)
        return

    print(f"{ora()}  lettore avviato: leggo il router ogni {c.get('ogni', 300)} secondi")
    ultima_lista, ultima_pubblicazione, attesa_errore = None, 0, 60
    while True:
        try:
            modello, lista = asyncio.run(leggi_router(c))
            cambiata = lista != ultima_lista
            if cambiata or time.time() - ultima_pubblicazione > BATTITO:
                pubblica(c, {"aggiornato": ora(), "modello": modello, "ogni": c.get("ogni", 300),
                             "dispositivi": lista, "errore": ""})
                ultima_lista, ultima_pubblicazione = lista, time.time()
                print(f"{ora()}  pubblicati {sum(d['attivo'] for d in lista)} dispositivi connessi")
            attesa_errore = 60
            time.sleep(max(60, int(c.get("ogni", 300))))
        except KeyboardInterrupt:
            return
        except Exception as e:   # router spento, Wi-Fi caduto, password cambiata…: riprova più tardi
            print(f"{ora()}  errore: {e}")
            try:   # lo segnala anche alla dashboard, mantenendo l'ultima lista nota
                pubblica(c, {"aggiornato": ora(), "modello": "", "ogni": c.get("ogni", 300),
                             "dispositivi": ultima_lista or [], "errore": str(e)})
            except Exception:
                pass
            time.sleep(attesa_errore)
            attesa_errore = min(attesa_errore * 2, 15 * 60)


if __name__ == "__main__":
    main()
