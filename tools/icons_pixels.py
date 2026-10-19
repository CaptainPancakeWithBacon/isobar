"""Fail if an Isobar icon is not drawn in the colour the shell gives symbolic icons: the toggle's text colour,
with no black left over (an icon the shell did not recolour stays black). Usage: icons_pixels.py <driver output dir>"""
import json
import re
import sys

from PIL import Image

out = sys.argv[1]
log = open(f'{out}/driver.log').read()
rects = json.loads(re.search(r'icon-rects: (\{.*\})', log).group(1))
img = Image.open(f'{out}/12-icons.png').convert('RGB')
PAPER, INK = (0xEA, 0xF4, 0xF0), (0x0F, 0x2F, 0x33)
dist = lambda p, q: sum((a - b) ** 2 for a, b in zip(p, q))  # noqa: E731
bad = 0
for name, (x, y, w, h, checked) in rects.items():
    want = INK if checked else PAPER
    pixels = list(img.crop((x, y, x + w, y + h)).getdata())
    ground = pixels[0]   # the toggle's own background at the corner of the icon
    # thin lines are anti-aliased, so count pixels that are nearer the icon colour than the ground
    drawn = sum(dist(p, want) < dist(p, ground) for p in pixels)
    black = sum(p[0] < 8 and p[1] < 8 and p[2] < 8 for p in pixels)
    ok = drawn >= 20 and black == 0
    bad += not ok
    print(f"{'ok  ' if ok else 'FAIL'} {name}: {drawn} pixels nearer the toggle's text colour than its background, {black} black ({'checked' if checked else 'unchecked'})")
sys.exit(1 if bad else 0)
