#!/usr/bin/env bash
# Does the launcher work in a throwaway ubuntu-mode shell? MIST_DISABLE="uuid uuid" switches those extensions off first.
set -euo pipefail
ROOT=$(cd "$(dirname "$0")/.." && pwd)
export ROOT MIST_OUT=${MIST_OUT:-$(mktemp -d)} MIST_DISABLE=${MIST_DISABLE:-} MIST_DCONF_LOAD=${MIST_DCONF_LOAD:-}
TMP=$(mktemp -d); trap 'rm -rf "$TMP"' EXIT
mkdir -p "$TMP/data/gnome-shell/extensions" "$TMP/config"
ln -s "$ROOT/tools/launcher-driver" "$TMP/data/gnome-shell/extensions/mist-launcher-driver@gijs.dev"
# MIST_EXTRA="uuid uuid": also enable these of your own extensions (linked, not copied); MIST_DCONF_LOAD=<file>: replay a dump of their settings
EXTRA_JSON=""
for u in ${MIST_EXTRA:-}; do
    for base in "$HOME/.local/share/gnome-shell/extensions" /usr/share/gnome-shell/extensions; do
        [ -d "$base/$u" ] && { ln -s "$base/$u" "$TMP/data/gnome-shell/extensions/$u"; EXTRA_JSON="$EXTRA_JSON, '$u'"; break; }
    done
done
export MIST_EXTRA_JSON="$EXTRA_JSON"
export XDG_DATA_HOME="$TMP/data" XDG_CONFIG_HOME="$TMP/config" XDG_CACHE_HOME="$TMP/cache" MIST_OUTER_BUS="$DBUS_SESSION_BUS_ADDRESS"
dbus-run-session -- bash -c '
set -euo pipefail
[ "$DBUS_SESSION_BUS_ADDRESS" != "$MIST_OUTER_BUS" ] || { echo "refusing: not a throwaway session" >&2; exit 2; }
gsettings set org.gnome.shell disable-user-extensions false
DIS=""; for u in $MIST_DISABLE; do DIS="$DIS, \"$u\""; done
gsettings set org.gnome.shell disabled-extensions "[${DIS#, }]"
[ -z "${MIST_DCONF_LOAD:-}" ] || dconf load /org/gnome/shell/extensions/ < "$MIST_DCONF_LOAD"
gsettings set org.gnome.shell enabled-extensions "[\"mist-launcher-driver@gijs.dev\"$MIST_EXTRA_JSON]"
gnome-shell --mode=ubuntu --headless --virtual-monitor 1280x800 &
PID=$!; trap "kill $PID 2>/dev/null; pkill -u $UID -x gnome-calculator 2>/dev/null; pkill -u $UID -x nautilus 2>/dev/null; pkill -u $UID -x gnome-clocks 2>/dev/null || true" EXIT
for _ in $(seq 100); do [ -e "$MIST_OUT/done" ] && break; sleep 1; done
cat "$MIST_OUT/driver.log" 2>/dev/null || true
[ -e "$MIST_OUT/done" ] && ! grep -q FAIL "$MIST_OUT/driver.log"' 2>&1 | grep -vE "DING|dbus-daemon|Tracker|GVFS|evolution|localsearch|portal|a11y|^$" || true
