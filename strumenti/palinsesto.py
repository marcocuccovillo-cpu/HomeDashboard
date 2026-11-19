#!/usr/bin/env python3
"""Home2Love — palinsesto del digitale terrestre per la pagina tv.html.

Gira su GitHub (Actions) ogni 6 ore: chiede la guida TV dei canali in chiaro a Tivùsat
(services.tivulaguida.it, la stessa fonte usata dal progetto open source iptv-org/epg); per i canali che lì
non hanno dati (es. LA7) ripiega su Sky Guida TV. Tiene da 3 ore fa alle prossime 60 (così "domani sera"
c'è sempre) e scrive palinsesto.json. Sono dati pubblici: niente da cifrare.

Uso:  python3 strumenti/palinsesto.py [file di uscita]   (predefinito: palinsesto.json)
"""

import json
import sys
import time
import urllib.request
from datetime import datetime, timedelta, timezone
from zoneinfo import ZoneInfo

ROMA = ZoneInfo("Europe/Rome")
# numero sul telecomando (LCN, digitale terrestre) · nome · codice del canale nella guida Tivùsat
CANALI = [
    (1, "Rai 1", 42), (2, "Rai 2", 43), (3, "Rai 3", 44), (4, "Rete 4", 155), (5, "Canale 5", 145), (6, "Italia 1", 148),
    (7, "LA7", 149), (8, "TV8", 279), (9, "Nove", 140), (20, "20 Mediaset", 249), (21, "Rai 4", 89), (22, "Iris", 11),
    (23, "Rai 5", 120), (24, "Rai Movie", 106), (25, "Rai Premium", 107), (26, "Cielo", 280), (27, "Twentyseven", 292),
    (28, "TV2000", 16), (29, "LA7 Cinema", 17), (30, "La5", 18), (31, "Real Time", 19), (32, "QVC", 130),
    (33, "Food Network", 263), (34, "Cine34", 273), (35, "Focus", 253), (36, "RTL 102.5 TV", 157), (38, "Giallo", 259),
    (39, "Top Crime", 25), (40, "Boing", 29), (41, "K2", 67), (42, "Rai Gulp", 133), (43, "Rai Yoyo", 134),
    (44, "Frisbee", 68), (46, "Cartoonito", 84), (47, "Super!", 141), (48, "Rai News 24", 131), (49, "Italia 2", 23),
    (51, "TGCom24", 118), (52, "DMAX", 32), (54, "Rai Storia", 132), (55, "Mediaset Extra", 24), (56, "HGTV", 287),
    (57, "Rai Scuola", 135), (58, "Rai Sport", 88),
]
API = "https://services.tivulaguida.it/api/epg/channels/{id}/date/{giorno}"
# ripiego: codici degli stessi canali su Sky Guida TV
SKY = {1: 899, 2: 898, 3: 897, 4: 10464, 5: 10354, 6: 10454, 7: 319, 8: 8195, 20: 10458, 21: 6622, 22: 10467, 23: 6607,
       24: 6608, 25: 6623, 26: 8133, 27: 11342, 28: 7588, 30: 10466, 32: 6626, 34: 10893, 35: 10470, 40: 6628,
       42: 6629, 47: 6460, 48: 895, 55: 10465, 58: 807}
API_SKY = "https://apid.sky.it/gtv/v1/events?from={da}&to={a}&pageSize=999&pageNum=0&env=DTH&channels={id}"


def scarica(url):
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 (Home2Love palinsesto)", "Accept": "application/json"})
    errore = None
    for prova in range(3):
        try:
            with urllib.request.urlopen(req, timeout=30) as r:
                return json.loads(r.read().decode("utf-8"))
        except Exception as e:   # riprova con calma
            errore = e
            time.sleep(2 + prova * 3)
    raise errore


def quando(s):   # "19-11-2026 21:25" (ora italiana) → millisecondi
    return int(datetime.strptime(s, "%d-%m-%Y %H:%M").replace(tzinfo=ROMA).timestamp() * 1000)


def testo(x):
    return (x or "").strip() if isinstance(x, str) else ""


def da_sky(cid, adesso, da, a):
    j = scarica(API_SKY.format(da=(adesso - timedelta(days=1)).strftime("%Y-%m-%dT00:00:00Z"),
                               a=(adesso + timedelta(days=3)).strftime("%Y-%m-%dT00:00:00Z"), id=cid))
    l = []
    for ev in (j or {}).get("events") or []:
        if not ev.get("starttime") or not ev.get("endtime"):
            continue
        i = int(datetime.fromisoformat(ev["starttime"].replace("Z", "+00:00")).timestamp() * 1000)
        f = int(datetime.fromisoformat(ev["endtime"].replace("Z", "+00:00")).timestamp() * 1000)
        if f < da or i > a:
            continue
        cont = ev.get("content") or {}
        genere = testo((cont.get("subgenre") or {}).get("name")) or testo((cont.get("genre") or {}).get("name"))
        desc = testo(ev.get("eventSynopsis"))
        l.append({"t": testo(ev.get("eventTitle")), "i": i, "f": f, "g": genere, "d": desc[:180] + ("…" if len(desc) > 180 else "")})
    return l


def main():
    uscita = sys.argv[1] if len(sys.argv) > 1 else "palinsesto.json"
    adesso = datetime.now(timezone.utc)
    da, a = (adesso - timedelta(hours=3)).timestamp() * 1000, (adesso + timedelta(hours=60)).timestamp() * 1000
    oggi = adesso.astimezone(ROMA).date()
    giorni = [oggi - timedelta(days=1), oggi, oggi + timedelta(days=1), oggi + timedelta(days=2)]   # ieri: per i programmi iniziati prima di mezzanotte
    canali, falliti = [], []
    for lcn, nome, cid in CANALI:
        visti, programmi = set(), []
        for g in giorni:
            try:
                j = scarica(API.format(id=cid, giorno=g.isoformat()))
            except Exception as e:
                falliti.append(f"{nome} {g}: {e}")
                continue
            for ev in (j or {}).get("events") or []:
                pr = ev.get("program") or {}
                if not pr or not ev.get("date_start") or not ev.get("date_end"):
                    continue
                try:
                    i, f = quando(ev["date_start"]), quando(ev["date_end"])
                except ValueError:
                    continue
                if f <= i:
                    f += 864e5   # finisce dopo mezzanotte
                if f < da or i > a or (i, f) in visti:
                    continue
                visti.add((i, f))
                genere = pr.get("genre") or pr.get("category") or ""
                if isinstance(genere, dict):
                    genere = genere.get("name") or genere.get("title") or ""
                desc = testo(pr.get("description"))
                programmi.append({"t": testo(pr.get("title")), "i": i, "f": int(f), "g": testo(genere),
                                  "d": desc[:180] + ("…" if len(desc) > 180 else "")})
            time.sleep(.3)   # gentili con il server
        if not programmi and lcn in SKY:   # Tivùsat non ha dati per questo canale: provo Sky Guida TV
            try:
                programmi = da_sky(SKY[lcn], adesso, da, a)
                if programmi:
                    print(f"{nome}: preso da Sky Guida TV")
            except Exception as e:
                falliti.append(f"{nome} (Sky): {e}")
        programmi.sort(key=lambda p: p["i"])
        canali.append({"lcn": lcn, "nome": nome, "programmi": programmi})
    print(f"{sum(len(c['programmi']) for c in canali)} programmi su {len(canali)} canali" + (f"; non riusciti: {falliti[:6]}" if falliti else ""))
    if not any(c["programmi"] for c in canali):
        sys.exit("Nessun programma scaricato: lascio il file com'era.")
    with open(uscita, "w", encoding="utf-8") as f:
        json.dump({"aggiornato": int(adesso.timestamp() * 1000), "fonte": "Tivùsat", "canali": canali}, f, ensure_ascii=False, separators=(",", ":"))


if __name__ == "__main__":
    main()
