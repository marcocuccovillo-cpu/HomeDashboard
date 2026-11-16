# Dispositivi connessi alla Vodafone Station

La dashboard è una pagina web e il browser non le permette di parlare con il router.
Per questo c'è un piccolo programma, `dispositivi.py`, che gira **sul tablet** dentro Termux:
ogni 5 minuti entra nella Vodafone Station, legge la lista dei dispositivi e la pubblica, cifrata
con la password di casa, in `dispositivi.json` nel ramo `cassaforte` del repository.
La dashboard la mostra nella seconda schermata.

Per leggere il router usa [aiovodafone](https://github.com/chemelli74/aiovodafone), la stessa
libreria dell'integrazione "Vodafone Station" di Home Assistant.

## Cosa serve

- La **password del router** (di solito sull'etichetta sotto la Vodafone Station, se non l'avete cambiata).
- La **password di casa** della dashboard (deve essere già stata creata sul tablet).

## Installazione (una volta sola, sul tablet)

1. Installa **F-Droid** (https://f-droid.org) e da lì le app **Termux**, **Termux:Boot** e **Termux:API**
   (quest'ultima serve per batteria e temperatura del tablet). Quelle del Play Store sono vecchie e non funzionano.
2. Apri **Termux:Boot** una volta (serve ad attivarlo), poi apri **Termux**.
3. In Termux incolla questo comando e premi Invio. **Non serve scriverlo**: nella dashboard del tablet
   apri ⚙ → *Lettore in Termux* e tocca **Copia**; in Termux tieni premuto sullo schermo e scegli **Incolla**.

   ```
   curl -fsSLo installa.sh https://marcocuccovillo-cpu.github.io/HomeDashboard/strumenti/installa-termux.sh && bash installa.sh
   ```

4. Rispondi alle domande: indirizzo del router (Invio per `192.168.1.1`), utente (`vodafone`; se non va, `admin`),
   password del router, password di casa.
5. Nelle impostazioni di Android togli Termux dall'**ottimizzazione della batteria**, così non viene chiuso.

Alla fine il programma legge il router una volta e mostra la lista: se la vedi, funziona.
Si riavvia da solo quando il tablet si accende.

## Comandi utili

Tutti si trovano anche nella dashboard, in ⚙ → *Lettore in Termux*, con il tasto **Copia**.

- Aggiornare e far ripartire il lettore:
  `curl -fsSLo avvia.sh https://marcocuccovillo-cpu.github.io/HomeDashboard/strumenti/avvia-termux.sh && bash avvia.sh`

## Se qualcosa non va

- Rifare le impostazioni: `python ~/homedashboard/dispositivi.py --configura`
- Provare senza pubblicare: `python ~/homedashboard/dispositivi.py --prova`
- Vedere cosa è successo: `tail -n 20 ~/homedashboard/registro.txt`
- Registro dettagliato della conversazione con il router (senza password): `python ~/homedashboard/dispositivi.py --diagnosi`

## Privacy

La lista viene cifrata con la password di casa prima di essere pubblicata: sul repository (che è pubblico)
c'è solo testo illeggibile. Gli indirizzi MAC non vengono pubblicati comunque. Password del router e
password di casa restano solo sul tablet, in `~/.homedashboard.json`, leggibile solo da Termux.

## Se avevi già installato la versione precedente

Scarica il programma aggiornato e rifai la configurazione (ora chiede la password di casa invece del codice GitHub):

```
curl -fsSL https://marcocuccovillo-cpu.github.io/HomeDashboard/strumenti/dispositivi.py -o ~/homedashboard/dispositivi.py
python ~/homedashboard/dispositivi.py --configura
python ~/homedashboard/dispositivi.py --prova
```

Poi riavvia il tablet (o chiudi e riapri Termux) per far ripartire il lettore.
