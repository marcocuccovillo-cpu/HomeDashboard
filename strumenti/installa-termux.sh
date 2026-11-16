#!/data/data/com.termux/files/usr/bin/bash
# HomeDashboard — installa sul tablet (in Termux) il lettore dei dispositivi della Vodafone Station.
# Uso, dentro Termux:
#   curl -fsSLo installa.sh https://marcocuccovillo-cpu.github.io/HomeDashboard/strumenti/installa-termux.sh && bash installa.sh
set -e
SITO="https://marcocuccovillo-cpu.github.io/HomeDashboard"
CARTELLA="$HOME/homedashboard"

echo
echo "== HomeDashboard: lettore dei dispositivi della Vodafone Station =="
echo "   Ci vogliono 10-20 minuti la prima volta (alcuni pezzi si compilano sul tablet)."
echo

echo "-> Installo Python e gli strumenti necessari…"
pkg update -y
pkg install -y python clang rust binutils libffi openssl
# per compilare orjson (usato da aiovodafone) Android vuole sapere la sua versione
export ANDROID_API_LEVEL="$(getprop ro.build.version.sdk)"

echo "-> Installo aiovodafone…"
pip install --upgrade aiovodafone

echo "-> Scarico il lettore…"
mkdir -p "$CARTELLA"
curl -fsSL "$SITO/strumenti/dispositivi.py" -o "$CARTELLA/dispositivi.py"

echo
python "$CARTELLA/dispositivi.py" --configura

echo "-> Provo a leggere il router…"
if python "$CARTELLA/dispositivi.py" --prova; then
  echo "   Funziona."
else
  echo
  echo "   Non sono riuscito a leggere il router: controlla utente e password e rilancia"
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
echo "Registro: $CARTELLA/registro.txt"
echo
