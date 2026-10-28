#!/usr/bin/env python3
"""Turn colourful terminal output (ANSI text on stdin) into a sharp SVG of a terminal window.
Block characters are drawn as rectangles so the logo has no seams. Usage: tool.py out.svg [--title TEXT] < ansi.txt"""
import re, sys
from html import escape
CELL_W, CELL_H, FS, PAD = 9.63, 19, 16, 26
BASE = {30: '#3b4252', 31: '#e5788a', 32: '#8fd19e', 33: '#e8c883', 34: '#7fa8e0', 35: '#c79be0', 36: '#7dd0d6', 37: '#d8dee9',
        90: '#6b7688', 91: '#f08a9c', 92: '#a3e0b0', 93: '#f0d596', 94: '#93bcf0', 95: '#d6aef0', 96: '#93e0e6', 97: '#f6f8f9'}
FG = '#d8dee9'
def parse(text):
    rows, fg, bold = [], FG, False
    for line in text.rstrip('\n').split('\n'):
        row, i = [], 0
        while i < len(line):
            m = re.match(r'\x1b\[([0-9;]*)m', line[i:])
            if m:
                codes = [int(c) if c else 0 for c in m.group(1).split(';')]
                j = 0
                while j < len(codes):
                    c = codes[j]
                    if c == 0: fg, bold = FG, False
                    elif c == 1: bold = True
                    elif c in BASE: fg = BASE[c]
                    elif c == 39: fg = FG
                    elif c == 38 and codes[j+1:j+2] == [2]: fg = '#%02x%02x%02x' % tuple(codes[j+2:j+5]); j += 4
                    elif c == 38 and codes[j+1:j+2] == [5]: fg = FG; j += 2
                    j += 1
                i += m.end(); continue
            if line[i] == '\x1b':
                m = re.match(r'\x1b\[[0-9;?]*[A-Za-z]', line[i:]); i += m.end() if m else 1; continue
            row.append((line[i], fg, bold)); i += 1
        rows.append(row)
    return rows
def render(rows, title):
    cols = max(len(r) for r in rows)
    W, H = cols * CELL_W + 2 * PAD, len(rows) * CELL_H + 2 * PAD + 34
    out = [f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W:.0f} {H:.0f}" width="{W:.0f}" height="{H:.0f}">',
           f'<rect width="{W:.0f}" height="{H:.0f}" rx="16" fill="#101418"/><rect y="0" width="{W:.0f}" height="34" rx="16" fill="#171c22"/><rect y="20" width="{W:.0f}" height="14" fill="#171c22"/>',
           '<circle cx="22" cy="17" r="5.5" fill="#e5788a"/><circle cx="42" cy="17" r="5.5" fill="#e8c883"/><circle cx="62" cy="17" r="5.5" fill="#8fd19e"/>',
           f'<text x="{W/2:.0f}" y="22" text-anchor="middle" font-family="Inter, DejaVu Sans, sans-serif" font-size="12" fill="#6b7688">{escape(title)}</text>']
    for y, row in enumerate(rows):
        ty = 34 + PAD + y * CELL_H
        x = 0
        while x < len(row):
            ch, fg, bold = row[x]
            tx = PAD + x * CELL_W
            if ch in '█▀▄':
                # a run of the same block in the same colour is one shape: no seams between cells
                n = 1
                while x + n < len(row) and row[x + n][0] == ch and row[x + n][1] == fg:
                    n += 1
                h = CELL_H if ch == '█' else CELL_H / 2
                oy = ty + (CELL_H / 2 if ch == '▄' else 0)
                out.append(f'<rect x="{tx:.2f}" y="{oy:.2f}" width="{n * CELL_W + 0.6:.2f}" height="{h + 0.6:.2f}" fill="{fg}" shape-rendering="crispEdges"/>')
                x += n; continue
            if ch == '●': out.append(f'<circle cx="{tx+CELL_W/2:.2f}" cy="{ty+CELL_H/2:.2f}" r="4.2" fill="{fg}"/>')
            elif ch != ' ':
                w = ' font-weight="700"' if bold else ''
                out.append(f'<text x="{tx:.2f}" y="{ty+CELL_H*0.74:.2f}" font-family="DejaVu Sans Mono, monospace" font-size="{FS}" fill="{fg}"{w}>{escape(ch)}</text>')
            x += 1
    out.append('</svg>')
    return '\n'.join(out)
if __name__ == '__main__':
    title = sys.argv[sys.argv.index('--title') + 1] if '--title' in sys.argv else 'isobar-fetch'
    open(sys.argv[1], 'w').write(render(parse(sys.stdin.read()), title))
