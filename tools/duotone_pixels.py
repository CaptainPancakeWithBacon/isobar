"""Fail if a tray icon of pure red is not drawn in the duotone colours of the palette (or still red when the effect is off).
Usage: duotone_pixels.py <driver output dir>"""
import json
import re
import sys

from PIL import Image

out = sys.argv[1]
log = open(f'{out}/driver.log').read()
bad = 0
for p in json.loads(re.search(r'duotone-probes: (\[.*\])', log).group(1)):
    got = Image.open(f"{out}/13-duotone-{p['label']}.png").convert('RGB').getpixel((p['x'], p['y']))
    ok = all(abs(a - b) <= 6 for a, b in zip(got, p['expected']))
    bad += not ok
    print(f"{'ok  ' if ok else 'FAIL'} duotone {p['label']}: pixel {got}, expected {tuple(p['expected'])}")
sys.exit(1 if bad else 0)
