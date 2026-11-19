#!/usr/bin/env python3
"""Home2Love — palinsesto del digitale terrestre per la pagina TV.

Gira su GitHub (Actions) ogni 6 ore: chiede la guida TV dei canali in chiaro a Sky Guida TV
(la stessa fonte usata dal progetto open source iptv-org/epg), tiene da 3 ore fa alle prossime 36
e scrive palinsesto.json, che la pagina tv.html legge. Sono dati pubblici: niente da cifrare.

Uso:  python3 strumenti/palinsesto.py [file di uscita]   (predefinito: palinsesto.json)
"""

import json
import sys
import time
import urllib.request
from datetime import datetime, timedelta, timezone

# numero sul telecomando (LCN, digitale terrestre) · nome · codice del canale su Sky Guida TV
CANALI = [
    (1, "Rai 1", 899), (2, "Rai 2", 898), (3, "Rai 3", 897), (4, "Rete 4", 10464), (5, "Canale 5", 10354),
    (6, "Italia 1", 10454), (7, "LA7", 319), (8, "TV8", 8195), (20, "20 Mediaset", 10458), (21, "Rai 4", 6622),
    (22, "Iris", 10467), (23, "Rai 5", 6607), (24, "Rai Movie", 6608), (25, "Rai Premium", 6623), (26, "Cielo", 8133),
    (27, "Twentyseven", 11342), (28, "TV2000", 7588), (29, "LA7d", 6624), (30, "La5", 10466), (34, "Cine34", 10893),
    (35, "Focus", 10470), (40, "Boing", 6628), (42, "Rai Gulp", 6629), (47, "Super!", 6460), (48, "Rai News 24", 895),
    (55, "Mediaset Extra", 10465), (58, "Rai Sport", 807), (64, "SuperTennis", 6000),
]
API = "https://apid.sky.it/gtv/v1/events?from={da}&to={a}&pageSize=999&pageNum=0&env=DTH&channels={id}"


def ms(s):
    return int(datetime.fromisoformat(s.replace("Z", "+00:00")).timestamp() * 1000)


def scarica(url):
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 (Home2Love palinsesto)", "Accept": "application/json"})
    for prova in range(3):
        try:
            with urllib.request.urlopen(req, timeout=30) as r:
                return json.loads(r.read().decode("utf-8"))
        except Exception as e:   # riprova con calma
            errore = e
            time.sleep(2 + prova * 3)
    raise errore


def main():
    uscita = sys.argv[1] if len(sys.argv) > 1 else "palinsesto.json"
    adesso = datetime.now(timezone.utc)
    da, a = adesso - timedelta(hours=3), adesso + timedelta(hours=36)
    canali, falliti = [], []
    for lcn, nome, cid in CANALI:
        programmi = []
        try:
            j = scarica(API.format(da=(adesso - timedelta(days=1)).strftime("%Y-%m-%dT00:00:00Z"),
                                   a=(adesso + timedelta(days=2)).strftime("%Y-%m-%dT00:00:00Z"), id=cid))
            for ev in j.get("events") or []:
                if not ev.get("starttime") or not ev.get("endtime"):
                    continue
                i, f = ms(ev["starttime"]), ms(ev["endtime"])
                if f < da.timestamp() * 1000 or i > a.timestamp() * 1000:
                    continue
                cont = ev.get("content") or {}
                genere = ((cont.get("genre") or {}).get("name") or "").strip()
                sotto = ((cont.get("subgenre") or {}).get("name") or "").strip()
                desc = (ev.get("eventSynopsis") or "").strip()
                programmi.append({"t": (ev.get("eventTitle") or "").strip(), "i": i, "f": f,
                                  "g": sotto or genere, "d": desc[:180] + ("…" if len(desc) > 180 else "")})
        except Exception as e:
            falliti.append(f"{nome}: {e}")
        programmi.sort(key=lambda p: p["i"])
        canali.append({"lcn": lcn, "nome": nome, "programmi": programmi})
        time.sleep(.4)   # gentili con il server
    print(f"{sum(len(c['programmi']) for c in canali)} programmi su {len(canali)} canali" + (f"; non riusciti: {falliti}" if falliti else ""))
    if not any(c["programmi"] for c in canali):
        sys.exit("Nessun programma scaricato: lascio il file com'era.")
    with open(uscita, "w", encoding="utf-8") as f:
        json.dump({"aggiornato": int(adesso.timestamp() * 1000), "fonte": "Sky Guida TV", "canali": canali}, f, ensure_ascii=False, separators=(",", ":"))


if __name__ == "__main__":
    main()
