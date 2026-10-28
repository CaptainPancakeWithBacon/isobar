#!/usr/bin/env python3
"""Turns the headless-shell screenshots into the page's media: redacts the host's Wi-Fi name, converts to WebP, makes the social image.
Usage: python3 tools/make_media.py <dir with shots-mist, shots-dusk, shots-night> [wallpaper dir]"""
import subprocess, sys, pathlib
src = pathlib.Path(sys.argv[1]); out = pathlib.Path(__file__).resolve().parent.parent / 'docs' / 'media'
out.mkdir(parents=True, exist_ok=True)
sh = lambda *a: subprocess.run(a, check=True, capture_output=True, text=True).stdout.strip()

def redact_wifi(png):
    """The quick settings tile shows the host's network name; replace it. Positions are for the 1600x1000 shots."""
    bg = sh('magick', png, '-format', '%[pixel:p{1300,228}]', 'info:')
    colours = sh('magick', png, '-crop', '40x14+1251+191', '+repage', '-colors', '2', '-unique-colors', 'txt:-').splitlines()[1:]
    light = max(colours, key=lambda l: sum(int(x) for x in l.split('(')[1].split(')')[0].split(',')[:3]))
    fg = light.split()[2] if light.split()[2].startswith('#') else '#cfd6dc'
    sh('magick', png, '-fill', bg, '-draw', 'rectangle 1249,207 1344,226', '-fill', fg, '-font', 'Inter', '-pointsize', '12', '-annotate', '+1251+220', 'Home', png)

def webp(png, name, q=86, crop=None):
    cmd = ['magick', str(png)] + (['-crop', crop, '+repage'] if crop else []) + ['-strip', '-quality', str(q), str(out / name)]
    sh(*cmd)

for w in ['mist', 'dusk', 'night']:
    d = src / f'shots-{w}'
    webp(d / 'desktop.png', f'desk-{w}.webp')
q = src / 'shots-dusk' / 'quick.png'
tmp = out / '_q.png'; sh('cp', str(q), str(tmp)); redact_wifi(str(tmp))
webp(tmp, 'quick-dusk.webp')
# the social image: the dusk desktop with the card open, 1200x630
sh('magick', str(tmp), '-resize', '1200x', '-gravity', 'north', '-crop', '1200x630+0+0', '+repage', '-strip', '-quality', '84', str(out / 'og.jpg'))
tmp.unlink()
webp(src / 'shots-night2' / 'overview-app.png', 'overview-night.webp')
webp(src / 'shots-mist' / 'app.png', 'app-mist.webp')
webp(src / 'shots-night' / 'app.png', 'app-night.webp')
print('media:', sum(f.stat().st_size for f in out.iterdir()) // 1024, 'KB in', len(list(out.iterdir())), 'files')
