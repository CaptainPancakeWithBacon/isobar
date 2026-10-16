"""With Focus on there must be clearly fewer contour lines than on the plain desktop.
Usage: focus_lines.py <driver output dir>
"""
import sys

from PIL import Image

GROUND = 0xC8 + 0xE0 + 0xD8
REGION = (100, 300, 800, 780)       # away from the bar, the dock and the quick settings menu


def lines(path):
    img = Image.open(path).convert('RGB').crop(REGION)
    return sum(1 for r, g, b in img.getdata() if r + g + b < GROUND - 30)


out = sys.argv[1]
before, after = lines(f'{out}/04-desktop.png'), lines(f'{out}/06-focus.png')
print(f'line pixels: {before} without focus, {after} with focus')
ok = before > 3000 and after < before * 0.6
print(('ok   ' if ok else 'FAIL ') + 'focus leaves clearly fewer contour lines')
sys.exit(0 if ok else 1)
