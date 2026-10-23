#!/usr/bin/env bash
# The inside of a throwaway test session. tools/theme-test.sh runs this under its own dbus-run-session; never run it by hand.
# Everything that changes settings lives here, behind a guard, so that nothing can ever touch your real session.
set -euo pipefail

# Refuse to run on the bus of the session that started the test: that would be your real session.
if [ -z "${ISOBAR_OUTER_BUS:-}" ] || [ "$DBUS_SESSION_BUS_ADDRESS" = "$ISOBAR_OUTER_BUS" ]; then
    echo "refusing to run: this is not a throwaway session" >&2
    exit 2
fi

gsettings set org.gnome.shell disable-user-extensions false
# ISOBAR_DCONF="/path/key=value /path/key=value": settings to write first, for example to switch an extension styling off
for pair in ${ISOBAR_DCONF:-}; do
    dconf write "${pair%%=*}" "${pair#*=}"
done
# ISOBAR_DCONF_LOAD=<file>: a dump of extension settings (dconf dump /org/gnome/shell/extensions/) to replay here
if [ -n "${ISOBAR_DCONF_LOAD:-}" ]; then
    dconf load /org/gnome/shell/extensions/ < "$ISOBAR_DCONF_LOAD"
fi
# a flat ground colour instead of the wallpaper, so the screenshots show the theme and not a photo
gsettings set org.gnome.desktop.interface color-scheme "${ISOBAR_COLOR_SCHEME:-default}"
gsettings set org.gnome.desktop.background picture-options none
gsettings set org.gnome.desktop.background picture-uri ""
gsettings set org.gnome.desktop.background picture-uri-dark ""
gsettings set org.gnome.desktop.background primary-color "${ISOBAR_GROUND:-#C8E0D8}"
gsettings set org.gnome.shell enabled-extensions "['isobar-theme-driver@gijs.dev'$ISOBAR_EXTRA_JSON]"
# the real session runs in the ubuntu mode, whose Yaru stylesheet is the default under every user theme, so tests do too
gnome-shell --mode=${ISOBAR_SHELL_MODE:-ubuntu} --headless --virtual-monitor 1280x800 &
SHELL_PID=$!
trap 'kill $SHELL_PID 2>/dev/null' EXIT
for _ in $(seq 120); do
    [ -e "$ISOBAR_DRIVER_OUT/done" ] && break
    sleep 1
done
cat "$ISOBAR_DRIVER_OUT/driver.log"
[ -e "$ISOBAR_DRIVER_OUT/done" ] || { echo "FAIL the driver did not finish within 120 s"; exit 1; }
! grep -q FAIL "$ISOBAR_DRIVER_OUT/driver.log"
