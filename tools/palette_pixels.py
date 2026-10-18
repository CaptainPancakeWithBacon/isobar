"""Fail if a palette's screenshot does not show its own colours: the most common colour under the bar must be the
palette's ground, and its major line colour must be there too. Usage: palette_pixels.py <driver output dir>"""
import re
import sys
from collections import Counter

from PIL import Image

out = sys.argv[1]
src = open(sys.argv[2] if len(sys.argv) > 2 else 'lib/palettes.js').read()
palettes = {m.group(1): dict(re.findall(r"(\w+): '(#[0-9A-F]{6})'", m.group(2)))
            for m in re.finditer(r"^    (\w+): \{(.*)\},$", src, re.M)}
hexrgb = lambda h: tuple(int(h[i:i + 2], 16) for i in (1, 3, 5))  # noqa: E731
bad = 0
for name, p in palettes.items():
    img = Image.open(f'{out}/10-palette-{name}.png').convert('RGB')
    w, h = img.size
    counts = Counter(img.crop((0, 60, w, h)).getdata())
    common = counts.most_common(1)[0][0]
    near = lambda c, t: all(abs(a - b) <= 6 for a, b in zip(c, t))  # noqa: E731
    major_px = sum(n for c, n in counts.items() if near(c, hexrgb(p['major'])))
    ok = near(common, hexrgb(p['ground'])) and major_px > 200
    bad += not ok
    print(f"{'ok  ' if ok else 'FAIL'} {name}: most common {common}, ground {hexrgb(p['ground'])}, {major_px} major-line pixels")
sys.exit(1 if bad else 0)
