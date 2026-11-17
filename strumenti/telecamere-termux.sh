#!/data/data/com.termux/files/usr/bin/bash
# Home2Love — installa (o aggiorna) sul tablet il server delle telecamere e lo fa partire all'accensione.
# Uso, dentro Termux:
#   curl -fsSLo telecamere.sh https://marcocuccovillo-cpu.github.io/HomeDashboard/strumenti/telecamere-termux.sh && bash telecamere.sh
# Per cambiare la password delle telecamere:  bash telecamere.sh --configura
set -e
SITO="https://marcocuccovillo-cpu.github.io/HomeDashboard"
CARTELLA="$HOME/homedashboard"

echo "-> Controllo Python e openssl…"
command -v python >/dev/null 2>&1 && command -v openssl >/dev/null 2>&1 || pkg install -y python openssl-tool

echo "-> Scarico il server delle telecamere…"
mkdir -p "$CARTELLA"
curl -fsSL "$SITO/strumenti/telecamere.py?t=$(date +%s)" -o "$CARTELLA/telecamere.py"

if [ "$1" = "--configura" ] || [ ! -f "$HOME/.home2love_telecamere/config.json" ]; then
  python "$CARTELLA/telecamere.py" --configura
fi

echo "-> Avvio automatico all'accensione del tablet (app Termux:Boot)…"
mkdir -p "$HOME/.termux/boot"
cat > "$HOME/.termux/boot/telecamere" <<FINE
#!/data/data/com.termux/files/usr/bin/sh
termux-wake-lock
cd "$CARTELLA" && exec python -u telecamere.py >> "$CARTELLA/telecamere.txt" 2>&1
FINE
chmod +x "$HOME/.termux/boot/telecamere"

echo "-> Faccio partire il server adesso…"
pkill -f "telecamere.py" 2>/dev/null || true
nohup sh "$HOME/.termux/boot/telecamere" >/dev/null 2>&1 &
sleep 3
if pgrep -f "telecamere.py" >/dev/null; then
  echo "   Acceso."
  python "$CARTELLA/telecamere.py" --indirizzi
else
  echo "   Non è partito:"; tail -n 8 "$CARTELLA/telecamere.txt" 2>/dev/null
fi
