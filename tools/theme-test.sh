#!/usr/bin/env bash
# Load an Isobar shell theme in a throwaway headless GNOME Shell and drive it. Touches nothing of your session.
# Usage: ISOBAR_DRIVER_OUT=<dir> tools/theme-test.sh <theme css file> <palette name>
set -euo pipefail
ROOT=$(cd "$(dirname "$0")/.." && pwd)
export ISOBAR_THEME_FILE=$(readlink -f "$1")
PALETTE=${2:-mint}
export ISOBAR_THEME_PALETTE=$(gjs -m "$(dirname "$0")/palette_json.js" "$PALETTE")
export ISOBAR_GROUND=$(printf %s "$ISOBAR_THEME_PALETTE" | python3 -c "import json,sys; print(json.load(sys.stdin)[\"ground\"])")
TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT
mkdir -p "$TMP/data/gnome-shell/extensions" "$TMP/config"
ln -s "$ROOT/tools/theme-driver" "$TMP/data/gnome-shell/extensions/isobar-theme-driver@gijs.dev"
export XDG_DATA_HOME="$TMP/data" XDG_CONFIG_HOME="$TMP/config" ROOT

dbus-run-session -- bash -c '
  gsettings set org.gnome.shell disable-user-extensions false
  # a flat ground colour instead of the wallpaper, so the screenshots show the theme and not a photo
  gsettings set org.gnome.desktop.background picture-options none
  gsettings set org.gnome.desktop.background picture-uri ""
  gsettings set org.gnome.desktop.background picture-uri-dark ""
  gsettings set org.gnome.desktop.background primary-color "${ISOBAR_GROUND:-#C8E0D8}"
  gsettings set org.gnome.shell enabled-extensions "[\"isobar-theme-driver@gijs.dev\"]"
  gnome-shell --headless --virtual-monitor 1280x800 &
  SHELL_PID=$!
  trap "kill $SHELL_PID 2>/dev/null" EXIT
  for _ in $(seq 120); do [ -e "$ISOBAR_DRIVER_OUT/done" ] && break; sleep 1; done
  cat "$ISOBAR_DRIVER_OUT/driver.log"
  [ -e "$ISOBAR_DRIVER_OUT/done" ] || { echo "FAIL the driver did not finish within 120 s"; exit 1; }
  ! grep -q FAIL "$ISOBAR_DRIVER_OUT/driver.log"
'
