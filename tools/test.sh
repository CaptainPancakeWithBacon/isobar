#!/usr/bin/env bash
# Run Isobar in a throwaway headless GNOME Shell (ubuntu mode, like the real session) and drive it.
# Touches nothing of your session. Usage: MIST_WALLPAPER=<image> tools/test.sh
set -euo pipefail
ROOT=$(cd "$(dirname "$0")/.." && pwd)
# MIST_EXT_DIR / MIST_EXT_UUID: test another build of the extension, for example the unpacked listing edition (with MIST_EDITION=ego)
EXT_DIR=${MIST_EXT_DIR:-$(cd "$(dirname "$0")/.." && pwd)/extension}
export ROOT MIST_OUT=${MIST_OUT:-$(mktemp -d)} MIST_EXT_UUID=${MIST_EXT_UUID:-mist@gijs.dev} MIST_EDITION=${MIST_EDITION:-full}
[ -f "$EXT_DIR/schemas/gschemas.compiled" ] || glib-compile-schemas "$EXT_DIR/schemas"
TMP=$(mktemp -d)
# the throwaway document portal may still hold its FUSE mount in $TMP/run/doc a moment after the session ends
trap 'fusermount3 -u -z "$TMP/run/doc" 2>/dev/null || true; rm -rf "$TMP"' EXIT
mkdir -p "$TMP/data/gnome-shell/extensions" "$TMP/config"
ln -s "$EXT_DIR" "$TMP/data/gnome-shell/extensions/$MIST_EXT_UUID"
ln -s "$ROOT/tools/driver" "$TMP/data/gnome-shell/extensions/mist-driver@gijs.dev"
# Its own runtime dir too: portals started on the throwaway bus (the document portal's FUSE mount at $XDG_RUNTIME_DIR/doc)
# would otherwise reach the real session's, and unmount it. Flatpak apps such as Zen then fail to start.
mkdir -m 700 "$TMP/run"
export XDG_DATA_HOME="$TMP/data" XDG_CONFIG_HOME="$TMP/config" XDG_CACHE_HOME="$TMP/cache" XDG_RUNTIME_DIR="$TMP/run"
export MIST_OUTER_BUS="$DBUS_SESSION_BUS_ADDRESS"
dbus-run-session -- bash "$ROOT/tools/session.sh"
