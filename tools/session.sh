#!/usr/bin/env bash
# The inside of the throwaway session; tools/test.sh runs it under its own dbus-run-session. Never run it by hand.
set -euo pipefail
if [ -z "${MIST_OUTER_BUS:-}" ] || [ "$DBUS_SESSION_BUS_ADDRESS" = "$MIST_OUTER_BUS" ]; then
    echo "refusing to run: this is not a throwaway session" >&2
    exit 2
fi
gsettings set org.gnome.shell disable-user-extensions false
gsettings set org.gnome.desktop.interface color-scheme "${MIST_COLOR_SCHEME:-default}"
if [ -n "${MIST_WALLPAPER:-}" ]; then
    gsettings set org.gnome.desktop.background picture-options zoom
    gsettings set org.gnome.desktop.background picture-uri "file://$MIST_WALLPAPER"
    gsettings set org.gnome.desktop.background picture-uri-dark "file://$MIST_WALLPAPER"
else
    gsettings set org.gnome.desktop.background picture-options none
    gsettings set org.gnome.desktop.background primary-color "#DDE2E6"
fi
gsettings set org.gnome.desktop.interface icon-theme "${MIST_ICON_THEME:-Papirus-Light}"
gsettings set org.gnome.desktop.interface cursor-theme "${MIST_CURSOR_THEME:-DMZ-Black}"
# MIST_DCONF="/path/key=value ...": settings to write first, for example the dock
for pair in ${MIST_DCONF:-}; do dconf write "${pair%%=*}" "${pair#*=}"; done
# MIST_DISABLE_EXT="uuid ...": switch these default extensions off (for example the desktop icons, for cleaner screenshots)
DIS=""; for u in ${MIST_DISABLE_EXT:-}; do DIS="$DIS, '$u'"; done; gsettings set org.gnome.shell disabled-extensions "[${DIS#, }]"
# MIST_DOCK_JSON='{"autohide": false}': Isobar's dock override file, for example to keep the dock visible in screenshots
[ -z "${MIST_DOCK_JSON:-}" ] || { mkdir -p "$XDG_CONFIG_HOME/isobar"; printf %s "$MIST_DOCK_JSON" > "$XDG_CONFIG_HOME/isobar/dock.json"; }
gsettings set org.gnome.shell enabled-extensions "['mist@gijs.dev', 'mist-driver@gijs.dev']"
gnome-shell --mode=ubuntu --headless --virtual-monitor ${MIST_SIZE:-1280x800} &
SHELL_PID=$!
trap 'kill $SHELL_PID 2>/dev/null' EXIT
for _ in $(seq 120); do [ -e "$MIST_OUT/done" ] && break; sleep 1; done
cat "$MIST_OUT/driver.log" 2>/dev/null || true
[ -e "$MIST_OUT/done" ] || { echo "FAIL the driver did not finish within 120 s"; exit 1; }
! grep -q FAIL "$MIST_OUT/driver.log"
