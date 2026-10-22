#!/usr/bin/env bash
# Run the theme checks and the colour-leak scan for every palette. Usage: tools/theme-test-all.sh [output dir]
set -uo pipefail
ROOT=$(cd "$(dirname "$0")/.." && pwd)
OUT=${1:-$(mktemp -d)}
fail=0
for dir in "$ROOT"/theme/Isobar-*/; do
    name=$(basename "$dir"); palette=$(printf %s "${name#Isobar-}" | tr 'A-Z' 'a-z')
    mkdir -p "$OUT/$palette"
    echo "== $name"
    ISOBAR_DRIVER_OUT="$OUT/$palette" "$ROOT/tools/theme-test.sh" "$dir/gnome-shell/gnome-shell.css" "$palette" 2>&1 | grep -E "^\[.*(FAIL|walked)" || true
    grep -q FAIL "$OUT/$palette/driver.log" && fail=1
    [ -e "$OUT/$palette/done" ] || { echo "FAIL the driver did not finish"; fail=1; }
    python3 "$ROOT/tools/theme_leaks.py" "$OUT/$palette" "$palette" "$ROOT/lib/palettes.js" || fail=1
done
echo "screenshots in $OUT"
exit $fail
