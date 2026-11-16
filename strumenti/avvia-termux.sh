#!/data/data/com.termux/files/usr/bin/bash
# HomeDashboard — fa partire il lettore dei dispositivi e lo imposta per l'avvio automatico.
# Uso, dentro Termux:
#   curl -fsSLo avvia.sh https://marcocuccovillo-cpu.github.io/HomeDashboard/strumenti/avvia-termux.sh && bash avvia.sh
CARTELLA="$HOME/homedashboard"
SITO="https://marcocuccovillo-cpu.github.io/HomeDashboard"

if [ ! -f "$HOME/.homedashboard.json" ]; then
  echo "Manca la configurazione: prima esegui  python $CARTELLA/dispositivi.py --configura"
  exit 1
fi

echo "-> Strumenti per leggere la batteria (serve anche l'app Termux:API da F-Droid)…"
pkg install -y termux-api >/dev/null 2>&1 || echo "   (non riesco a installare termux-api: la batteria non verrà letta)"

echo "-> Aggiorno il lettore…"
mkdir -p "$CARTELLA"
curl -fsSL "$SITO/strumenti/dispositivi.py?t=$(date +%s)" -o "$CARTELLA/dispositivi.py"
curl -fsSL "$SITO/strumenti/orjson.py?t=$(date +%s)" -o "$CARTELLA/orjson.py"

echo "-> Avvio automatico all'accensione del tablet (app Termux:Boot)…"
mkdir -p "$HOME/.termux/boot"
cat > "$HOME/.termux/boot/homedashboard" <<FINE
#!/data/data/com.termux/files/usr/bin/sh
termux-wake-lock
cd "$CARTELLA" && exec python -u dispositivi.py >> "$CARTELLA/registro.txt" 2>&1
FINE
chmod +x "$HOME/.termux/boot/homedashboard"

echo "-> Faccio partire il lettore adesso…"
pkill -f "dispositivi.py" 2>/dev/null || true
nohup sh "$HOME/.termux/boot/homedashboard" >/dev/null 2>&1 &

echo "   Aspetto 40 secondi e ti mostro cosa ha fatto…"
sleep 40
echo
tail -n 8 "$CARTELLA/registro.txt" 2>/dev/null || echo "   (ancora nessun messaggio nel registro)"
echo
if ! grep -q "servizio aerei" "$CARTELLA/registro.txt" 2>/dev/null; then
  echo "Attenzione: il lettore scaricato è una versione vecchia (manca il servizio aerei). Riprova tra qualche minuto."
fi
if pgrep -f "dispositivi.py" >/dev/null; then
  echo "Il lettore è acceso. Se sopra c'è \"pubblicati … dispositivi\", tra un minuto li vedi nella dashboard."
else
  echo "Il lettore si è fermato: guarda il messaggio sopra."
fi
