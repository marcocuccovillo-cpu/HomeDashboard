#!/data/data/com.termux/files/usr/bin/bash
# HomeDashboard — installa sul tablet (in Termux) il lettore dei dispositivi della Vodafone Station.
# Uso, dentro Termux:
#   curl -fsSLo installa.sh https://marcocuccovillo-cpu.github.io/HomeDashboard/strumenti/installa-termux.sh && bash installa.sh
set -e
SITO="https://marcocuccovillo-cpu.github.io/HomeDashboard"
CARTELLA="$HOME/homedashboard"

echo
echo "== HomeDashboard: lettore dei dispositivi della Vodafone Station =="
echo "   Ci vogliono 5-10 minuti la prima volta."
echo

echo "-> Installo Python e gli strumenti necessari…"
pkg update -y
pkg install -y python clang libffi openssl

# Le librerie di rete in versione "solo Python": niente da compilare, funziona anche su Android a 32 bit
export AIOHTTP_NO_EXTENSIONS=1 MULTIDICT_NO_EXTENSIONS=1 YARL_NO_EXTENSIONS=1 FROZENLIST_NO_EXTENSIONS=1 PROPCACHE_NO_EXTENSIONS=1

echo "-> Installo le librerie…"
pip install --upgrade aiohttp beautifulsoup4 pycryptodome segno
# aiovodafone senza orjson: orjson richiede Rust e non si compila su Android a 32 bit (armv8l).
# Al suo posto c'è orjson.py, scaricato qui sotto accanto al lettore.
pip install --upgrade --no-deps aiovodafone

echo "-> Scarico il lettore…"
mkdir -p "$CARTELLA"
curl -fsSL "$SITO/strumenti/dispositivi.py" -o "$CARTELLA/dispositivi.py"
curl -fsSL "$SITO/strumenti/orjson.py" -o "$CARTELLA/orjson.py"

echo
python "$CARTELLA/dispositivi.py" --configura

echo "-> Provo a leggere il router…"
if python "$CARTELLA/dispositivi.py" --prova; then
  echo "   Funziona."
else
  echo
  echo "   Qualcosa non va (vedi il messaggio sopra): controlla utente e password e rilancia"
  echo "     python $CARTELLA/dispositivi.py --configura"
  echo "     python $CARTELLA/dispositivi.py --prova"
  exit 1
fi

echo "-> Avvio automatico all'accensione del tablet (serve l'app Termux:Boot)…"
mkdir -p "$HOME/.termux/boot"
cat > "$HOME/.termux/boot/homedashboard" <<FINE
#!/data/data/com.termux/files/usr/bin/sh
termux-wake-lock
cd "$CARTELLA" && exec python dispositivi.py >> "$CARTELLA/registro.txt" 2>&1
FINE
chmod +x "$HOME/.termux/boot/homedashboard"

echo "-> Avvio il lettore adesso…"
pkill -f "python dispositivi.py" 2>/dev/null || true
nohup sh "$HOME/.termux/boot/homedashboard" >/dev/null 2>&1 &

echo
echo "Fatto. Entro qualche minuto i dispositivi compaiono nella seconda schermata della dashboard."
echo "(Se cambiate la password di casa: python $CARTELLA/dispositivi.py --configura)"
echo "Registro: $CARTELLA/registro.txt"
echo
