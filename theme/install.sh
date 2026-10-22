#!/usr/bin/env bash
# Copy the Isobar shell themes to ~/.local/share/themes (or $XDG_DATA_HOME/themes).
# Usage: theme/install.sh [mint|sand|sky|blush|stone ...]   no argument installs all five
# It only copies files. To switch to one, with the User Themes extension enabled:
#   gsettings set org.gnome.shell.extensions.user-theme name 'Isobar-Mint'
set -euo pipefail
HERE=$(cd "$(dirname "$0")" && pwd)
DEST="${XDG_DATA_HOME:-$HOME/.local/share}/themes"
mkdir -p "$DEST"
names=("$@")
[ ${#names[@]} -gt 0 ] || names=(mint sand sky blush stone)
for n in "${names[@]}"; do
    src="$HERE/Isobar-$(tr '[:lower:]' '[:upper:]' <<<"${n:0:1}")${n:1}"
    [ -d "$src" ] || { echo "no such palette: $n" >&2; exit 1; }
    rm -rf "$DEST/$(basename "$src")"
    cp -r "$src" "$DEST/"
    echo "installed $(basename "$src") in $DEST"
done
