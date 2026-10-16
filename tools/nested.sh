#!/usr/bin/env bash
# Run Isobar in a throwaway nested GNOME Shell. The real session, its dconf and
# its extensions are untouched: data and config live in a temp dir.
set -euo pipefail

ROOT=$(cd "$(dirname "$0")/.." && pwd)
TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT

mkdir -p "$TMP/data/gnome-shell/extensions" "$TMP/config"
ln -s "$ROOT" "$TMP/data/gnome-shell/extensions/isobar@gijs.dev"
export XDG_DATA_HOME="$TMP/data" XDG_CONFIG_HOME="$TMP/config" ROOT

dbus-run-session -- bash -c '
  gsettings set org.gnome.desktop.interface toolkit-accessibility true
  gsettings set org.gnome.shell disable-user-extensions false
  gsettings set org.gnome.shell enabled-extensions "[\"isobar@gijs.dev\"]"
  gnome-shell --nested --wayland &
  SHELL_PID=$!
  trap "kill $SHELL_PID 2>/dev/null" EXIT
  if [ "${1:-}" = "--check" ]; then
    sleep 10
    python3 "$ROOT/tools/check.py"
  else
    wait $SHELL_PID
  fi
' _ "$@"
