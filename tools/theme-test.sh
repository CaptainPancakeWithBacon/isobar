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
# ISOBAR_EXTRA_EXTENSIONS="uuid uuid": also enable these extensions (copied by link from your own or the system folders), to see how the theme behaves next to them
EXTRA_JSON=""
for uuid in ${ISOBAR_EXTRA_EXTENSIONS:-}; do
    for base in ${ISOBAR_EXTENSION_DIRS:-} "$HOME/.local/share/gnome-shell/extensions" /usr/share/gnome-shell/extensions; do
        [ -d "$base/$uuid" ] && { ln -s "$base/$uuid" "$TMP/data/gnome-shell/extensions/$uuid"; EXTRA_JSON="$EXTRA_JSON, '$uuid'"; break; }
    done
done
export ISOBAR_EXTRA_JSON="$EXTRA_JSON"
export XDG_DATA_HOME="$TMP/data" XDG_CONFIG_HOME="$TMP/config" ROOT

# the bus of the session this runs from, so the inside can refuse to run on it
export ISOBAR_OUTER_BUS="$DBUS_SESSION_BUS_ADDRESS"
dbus-run-session -- bash "$ROOT/tools/theme-test-session.sh"
