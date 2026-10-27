#!/usr/bin/env bash
# Loads the built login theme in a throwaway shell and locks its screen. Touches nothing of your session.
set -euo pipefail
ROOT=$(cd "$(dirname "$0")/.." && pwd)
export ROOT MIST_OUT=${MIST_OUT:-$(mktemp -d)} MIST_GDM_RESOURCE=${MIST_GDM_RESOURCE:-$ROOT/gdm/build/gnome-shell-theme.gresource}
TMP=$(mktemp -d); trap 'rm -rf "$TMP"' EXIT
mkdir -p "$TMP/data/gnome-shell/extensions" "$TMP/config"
ln -s "$ROOT/tools/gdm-driver" "$TMP/data/gnome-shell/extensions/mist-gdm-driver@gijs.dev"
export XDG_DATA_HOME="$TMP/data" XDG_CONFIG_HOME="$TMP/config" XDG_CACHE_HOME="$TMP/cache" MIST_OUTER_BUS="$DBUS_SESSION_BUS_ADDRESS"
dbus-run-session -- bash -c '
set -euo pipefail
[ "$DBUS_SESSION_BUS_ADDRESS" != "$MIST_OUTER_BUS" ] || { echo "refusing: not a throwaway session" >&2; exit 2; }
gsettings set org.gnome.shell disable-user-extensions false
gsettings set org.gnome.shell enabled-extensions "[\"mist-gdm-driver@gijs.dev\"]"
gnome-shell --mode=ubuntu --headless --virtual-monitor 1280x800 &
PID=$!; trap "kill $PID 2>/dev/null" EXIT
for _ in $(seq 90); do [ -e "$MIST_OUT/done" ] && break; sleep 1; done
cat "$MIST_OUT/driver.log" 2>/dev/null || true
[ -e "$MIST_OUT/done" ] && ! grep -q FAIL "$MIST_OUT/driver.log"'
