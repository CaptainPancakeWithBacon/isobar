#!/usr/bin/env bash
# Builds a login-screen theme: Yaru's own, plus Mist's overrides and your current wallpaper (darkened, blurred).
# Needs nothing from root. Output: gdm/build/gnome-shell-theme.gresource
# Usage: gdm/build.sh [wallpaper image]   (default: the current wallpaper)
set -euo pipefail
HERE=$(cd "$(dirname "$0")" && pwd)
SRC=${MIST_YARU_GRESOURCE:-/usr/share/gnome-shell/theme/Yaru/gnome-shell-theme.gresource}
OUT="$HERE/build"
rm -rf "$OUT" && mkdir -p "$OUT/root"

# a gsettings file URI as a path, with %20 and friends decoded
uri_path() { gsettings get org.gnome.desktop.background "$1" | sed "s|^'file://||; s|'$||" | python3 -c 'import sys, urllib.parse as u; print(u.unquote(sys.stdin.read().strip()))'; }
WALL=${1:-$(uri_path picture-uri-dark)}
[ -f "$WALL" ] || WALL=$(uri_path picture-uri)
[ -f "$WALL" ] || { echo "no wallpaper image to use: $WALL" >&2; exit 1; }

# every file of Yaru's theme, same paths
PREFIX=/org/gnome/shell/theme
for res in $(gresource list "$SRC"); do
    dest="$OUT/root${res#$PREFIX}"
    mkdir -p "$(dirname "$dest")"
    gresource extract "$SRC" "$res" > "$dest"
done
cat "$HERE/mist-login.css" >> "$OUT/root/gdm.css"

# the login background: dark enough for white text, soft enough to stay a wallpaper
magick "$WALL" -resize "2256x1504^" -gravity center -extent 2256x1504 -gaussian-blur 0x14 -fill '#0b0f12' -colorize 48% -quality 82 "$OUT/root/mist-login.jpg"

{
    echo '<?xml version="1.0" encoding="UTF-8"?><gresources><gresource prefix="'$PREFIX'">'
    (cd "$OUT/root" && find . -type f | sed 's|^\./||' | sort) | while read -r f; do echo "<file>$f</file>"; done
    echo '</gresource></gresources>'
} > "$OUT/theme.gresource.xml"
glib-compile-resources --sourcedir="$OUT/root" --target="$OUT/gnome-shell-theme.gresource" "$OUT/theme.gresource.xml"
echo "built $OUT/gnome-shell-theme.gresource ($(du -h "$OUT/gnome-shell-theme.gresource" | cut -f1)) from $WALL"
