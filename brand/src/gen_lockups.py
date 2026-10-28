import re, subprocess
FONT, WEIGHT, SIZE, TRACK = "Inter Display", 500, 150, -3

def outline(svg_in, svg_out):
    subprocess.run(['inkscape', svg_in, '--export-text-to-path', '--export-plain-svg', f'--export-filename={svg_out}'], check=True, capture_output=True)

def bbox(svg_file):
    out = subprocess.run(['inkscape', svg_file, '--query-all'], check=True, capture_output=True, text=True).stdout.strip().splitlines()
    rows = [list(map(float, l.split(',')[1:])) for l in out[1:]]       # skip the root
    x0 = min(r[0] for r in rows); y0 = min(r[1] for r in rows)
    x1 = max(r[0]+r[2] for r in rows); y1 = max(r[1]+r[3] for r in rows)
    return x0 - 20, y0 - 200, x1 - 20, y1 - 200     # query-all is relative to the canvas corner; the source viewBox starts at -20,-200

# 1. the wordmark: baseline at y=0, outlined
open('wm-src.svg', 'w').write(f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="-20 -200 900 300" width="900" height="300">'
    f'<text x="0" y="0" font-family="{FONT}" font-weight="{WEIGHT}" font-size="{SIZE}" letter-spacing="{TRACK}" fill="#000">isobar</text></svg>')
outline('wm-src.svg', 'wm-out.svg')
x0, y0, x1, y1 = bbox('wm-out.svg')
print('wordmark bbox', round(x0,1), round(y0,1), round(x1,1), round(y1,1), 'w', round(x1-x0,1), 'h', round(y1-y0,1))
wm = open('wm-out.svg').read()
inner = re.search(r'<svg[^>]*>(.*)</svg>', wm, re.S).group(1)
inner = re.sub(r'<(title|defs|metadata)[^>]*?(/>|>.*?</\1>)', '', inner, flags=re.S).strip()
inner = inner.replace('fill="#000"', 'fill="#000"')
WM_W, WM_ASC = x1 - x0, -y0            # width, and ascender height above the baseline

import sys
REVERSED = len(sys.argv) > 1 and sys.argv[1] == 'reversed'
SUFFIX = '-reversed' if REVERSED else ''
sym = open(f'isobar-symbol{SUFFIX}.svg').read()
sym_paths = re.search(r'<path[^>]*/>', sym).group(0)      # drawn on the 256 grid, spans 16..240

def doc(w, h, vb, body, title):
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{vb}"><title>{title}</title>{body}</svg>\n'

# 2. horizontal: the symbol (16..240), then the wordmark, x-height centred on the symbol's middle
XH = 0.546 * SIZE
base_y = 128 + XH/2
gap = 52
wx = 240 + gap - x0
body = sym_paths + f'<g fill="#000" transform="translate({wx:.2f},{base_y:.2f})">{inner}</g>'
total_w = 240 + gap + WM_W
open(f'isobar-horizontal{SUFFIX}.svg', 'w').write(doc(0, 0, f'16 16 {total_w-16:.1f} 224', body, 'Isobar'))

# 3. stacked: wordmark centred under the symbol
scale = 0.78
wm_w = WM_W * scale
W = max(wm_w, 224) + 0
cx = 128
top = 240 + 56 + WM_ASC*scale
body = sym_paths + f'<g fill="#000" transform="translate({cx - wm_w/2 - x0*scale:.2f},{top:.2f}) scale({scale})">{inner}</g>'
open(f'isobar-stacked{SUFFIX}.svg', 'w').write(doc(0, 0, f'{cx - W/2:.1f} 16 {W:.1f} {top - 16 + 6:.1f}', body, 'Isobar'))

# 4. wordmark alone
open(f'isobar-wordmark{SUFFIX}.svg', 'w').write(doc(0, 0, f'{x0:.1f} {y0:.1f} {WM_W:.1f} {y1 - y0:.1f}', f'<g fill="#000">{inner}</g>', 'isobar'))
