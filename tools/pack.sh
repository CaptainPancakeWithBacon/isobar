#!/usr/bin/env bash
# Build the zip for extensions.gnome.org and check what is in it: only what runs in the shell, nothing from tools/, tests/, docs/.
set -euo pipefail
ROOT=$(cd "$(dirname "$0")/.." && pwd)
OUT=${1:-$ROOT/dist}
mkdir -p "$OUT"
cd "$ROOT"
gnome-extensions pack --force --out-dir "$OUT" \
    --extra-source=lib --extra-source=palettes --extra-source=island.js --extra-source=music.js \
    --extra-source=notifications.js --extra-source=terrain-layer.js .
ZIP=$OUT/isobar@gijs.dev.shell-extension.zip
echo "== $ZIP"
unzip -l "$ZIP" | awk 'NR>3 && $4 {print $4}' | grep -v '^$' | sort
# nothing may be in the zip that is not code the shell runs, its style, schema or metadata
if unzip -Z1 "$ZIP" | grep -E '^(tools|tests|docs|brand|prototype|hooks)/|\.compiled$'; then
    echo "FAIL: unexpected files in the zip"; exit 1
fi
# every relative import in the zipped code must resolve inside the zip
TMP=$(mktemp -d); trap 'rm -rf "$TMP"' EXIT
unzip -q "$ZIP" -d "$TMP"
for f in $(cd "$TMP" && find . -name '*.js'); do
    { grep -ohE "from '\.\.?/[^']+'" "$TMP/$f" || true; } | sed -E "s/from '//; s/'$//" | while read -r rel; do
        [ -e "$(dirname "$TMP/$f")/$rel" ] || { echo "FAIL: $f imports $rel, which is not in the zip"; exit 1; }
    done
done
echo "ok: the zip holds only extension files and every import resolves"
