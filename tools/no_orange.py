"""Fail if the open quick settings menu contains orange pixels.

The theme node can disagree with what is painted, so look at the screenshot itself.
Usage: no_orange.py <driver output dir>
"""
import colorsys
import json
import re
import sys

from PIL import Image

out = sys.argv[1]
log = open(f'{out}/driver.log').read()
x, y, w, h = json.loads(re.search(r'menu box: (\[.*?\])', log).group(1))
img = Image.open(f'{out}/03-quick-settings.png').convert('RGB').crop((x, y, x + w, y + h))

# GNOME paints the battery icon in the top-left pill orange when the battery is low (it was 26% when this
# failed). That is a warning colour of the machine running the test, not the theme, so that pill is skipped.
BATTERY_PILL = (0, 0, 100, 70)

orange = []
for i, (r, g, b) in enumerate(img.getdata()):
    hue, sat, val = colorsys.rgb_to_hsv(r / 255, g / 255, b / 255)
    # strict on purpose: subpixel text edges are weakly saturated warm tones, Ubuntu orange is not
    if 0.02 <= hue <= 0.09 and sat > 0.65 and val > 0.25:
        px, py = i % w, i // w
        if not (BATTERY_PILL[0] <= px < BATTERY_PILL[2] and BATTERY_PILL[1] <= py < BATTERY_PILL[3]):
            orange.append((x + px, y + py, (r, g, b)))

print(f'orange pixels in the quick settings menu: {len(orange)}')
for px in orange[:5]:
    print('  ', px)
sys.exit(1 if orange else 0)
