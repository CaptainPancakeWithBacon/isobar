"""Fail if a theme leaves a foreign saturated colour (the system accent, blue links) on the menus. The shell takes its
accent from a system setting, so only the screenshots can say whether every accent was overridden. A pixel is foreign when
it is clearly coloured and bright, its hue is far from the palette's own, and it sits in a flat area. Usage: theme_leaks.py <driver out dir> <palette>"""
import colorsys
import re
import sys

from PIL import Image

out, palette = sys.argv[1], sys.argv[2]
src = open(sys.argv[3] if len(sys.argv) > 3 else 'lib/palettes.js').read()
ink = re.search(rf"^    {palette}: \{{.*?ink: '(#[0-9A-F]{{6}})'", src, re.M).group(1)
own_hue = colorsys.rgb_to_hsv(*(int(ink[i:i + 2], 16) / 255 for i in (1, 3, 5)))[0] * 360
# where the theme paints its own surfaces: quick settings, date menu, banner (1280x800 screenshots)
REGIONS = {'02-quick-settings': (860, 20, 1280, 320), '03-date-menu': (250, 30, 1030, 420), '04-banner': (300, 20, 980, 160)}


def foreign(p):
    h, s, v = colorsys.rgb_to_hsv(*(c / 255 for c in p))
    gap = abs(h * 360 - own_hue)
    return s > 0.5 and v > 0.35 and min(gap, 360 - gap) > 25


bad = 0
for name, box in REGIONS.items():
    img = Image.open(f'{out}/{name}.png').convert('RGB').crop(box)
    w, h = img.size
    px = img.load()
    # a leaked accent is a flat area; the coloured fringes round text (subpixel rendering) are never flat, so they do not count
    flat = lambda x, y: all(px[x + dx, y + dy] == px[x, y] for dx, dy in ((2, 0), (-2, 0), (0, 2), (0, -2)))  # noqa: E731
    leaks = sum(foreign(px[x, y]) and flat(x, y) for y in range(2, h - 2) for x in range(2, w - 2))
    bad += leaks > 12
    print(f"{'ok  ' if leaks <= 12 else 'FAIL'} {name}: {leaks} foreign saturated pixels")
sys.exit(1 if bad else 0)
