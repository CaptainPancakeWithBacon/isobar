#!/usr/bin/env bash
# Run Mist in a throwaway headless GNOME Shell (ubuntu mode, like the real session) and drive it.
# Touches nothing of your session. Usage: MIST_WALLPAPER=<image> tools/test.sh
set -euo pipefail
ROOT=$(cd "$(dirname "$0")/.." && pwd)
export ROOT MIST_OUT=${MIST_OUT:-$(mktemp -d)}
TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT
mkdir -p "$TMP/data/gnome-shell/extensions" "$TMP/config"
ln -s "$ROOT/extension" "$TMP/data/gnome-shell/extensions/mist@gijs.dev"
ln -s "$ROOT/tools/driver" "$TMP/data/gnome-shell/extensions/mist-driver@gijs.dev"
export XDG_DATA_HOME="$TMP/data" XDG_CONFIG_HOME="$TMP/config" XDG_CACHE_HOME="$TMP/cache"
export MIST_OUTER_BUS="$DBUS_SESSION_BUS_ADDRESS"
dbus-run-session -- bash "$ROOT/tools/session.sh"
