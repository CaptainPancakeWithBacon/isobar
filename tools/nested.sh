#!/usr/bin/env bash
# Run Isobar in a throwaway nested GNOME Shell. The real session, its dconf and
# its extensions are untouched: data and config live in a temp dir.
set -euo pipefail

ROOT=$(cd "$(dirname "$0")/.." && pwd)
# ISOBAR_EXT_DIR: run the extension from somewhere else, e.g. an unpacked zip, instead of this checkout
EXT_DIR=${ISOBAR_EXT_DIR:-$ROOT}
glib-compile-schemas "$EXT_DIR/schemas"
TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT

mkdir -p "$TMP/data/gnome-shell/extensions" "$TMP/config"
ln -s "$EXT_DIR" "$TMP/data/gnome-shell/extensions/isobar@gijs.dev"
ln -s "$ROOT/tools/driver" "$TMP/data/gnome-shell/extensions/isobar-driver@gijs.dev"
export XDG_DATA_HOME="$TMP/data" XDG_CONFIG_HOME="$TMP/config" ROOT

dbus-run-session -- bash -c '
  gsettings set org.gnome.desktop.interface toolkit-accessibility true
  gsettings set org.gnome.shell disable-user-extensions false
  if [ "${1:-}" = "--drive" ]; then EXT="[\"isobar@gijs.dev\", \"isobar-driver@gijs.dev\"]"; else EXT="[\"isobar@gijs.dev\"]"; fi
  gsettings set org.gnome.shell enabled-extensions "$EXT"
  # ISOBAR_HEADLESS=1: no window on your screen, so your mouse cannot disturb the driver
  if [ -n "${ISOBAR_HEADLESS:-}" ]; then
    gnome-shell --headless --virtual-monitor 1280x800 &
  else
    gnome-shell --nested --wayland &
  fi
  SHELL_PID=$!
  trap "kill $SHELL_PID 2>/dev/null" EXIT
  if [ "${1:-}" = "--check" ]; then
    sleep 10
    python3 "$ROOT/tools/check.py"
  elif [ "${1:-}" = "--drive" ]; then
    for _ in $(seq 240); do [ -e "$ISOBAR_DRIVER_OUT/done" ] && break; sleep 1; done
    cat "$ISOBAR_DRIVER_OUT/driver.log"
    # a driver that never finished has not tested everything, so that is a failure too
    [ -e "$ISOBAR_DRIVER_OUT/done" ] || { echo "FAIL the driver did not finish within 240 s"; exit 1; }
    ! grep -q FAIL "$ISOBAR_DRIVER_OUT/driver.log" || exit 1
    # the benchmark takes no screenshots, so it has no pixels to check
    [ -n "${ISOBAR_BENCH:-}${ISOBAR_ONLY:-}" ] || { python3 "$ROOT/tools/no_orange.py" "$ISOBAR_DRIVER_OUT" && gjs -m "$ROOT/tools/golden.js" "$ISOBAR_DRIVER_OUT" && python3 "$ROOT/tools/focus_lines.py" "$ISOBAR_DRIVER_OUT"; }
  else
    wait $SHELL_PID
  fi
' _ "$@"
