#!/usr/bin/env python3
"""Writes docs/index.html with the logo inlined (so the palette can recolour it) and copies the files the page needs.
Run from the repo root: python3 tools/build_site.py"""
import re, shutil, pathlib
root = pathlib.Path(__file__).resolve().parent.parent
brand, docs = root / 'brand', root / 'docs'

def inline(svg_path, classes):
    s = (brand / svg_path).read_text()
    s = re.sub(r'<title>.*?</title>', '', s, flags=re.S)
    parts = iter(classes)
    s = re.sub(r'fill="#000(000)?"', lambda m: f'class="{next(parts)}"', s)
    return s.strip()

horizontal = inline('horizontal/isobar-horizontal.svg', ['mk', 'wm']).replace('<svg ', '<svg class="logo" role="img" aria-label="Isobar" ', 1)
mark = inline('symbol/isobar-symbol.svg', ['mk']).replace('<svg ', '<svg aria-hidden="true" ', 1)
mark_label = lambda cls: mark.replace('<svg ', f'<svg class="{cls}" ', 1)
small = inline('symbol/isobar-symbol-small.svg', ['mk']).replace('<svg ', '<svg aria-label="small cut" ', 1)
fav = inline('symbol/isobar-symbol-favicon.svg', ['mk']).replace('<svg ', '<svg aria-label="favicon cut" ', 1)
stacked = inline('stacked/isobar-stacked.svg', ['mk', 'wm']).replace('<svg ', '<svg aria-label="stacked logo" ', 1)

html = (docs / 'index.template.html').read_text()
for key, val in {'LOGO_HORIZONTAL': horizontal, 'MARK_ARCS': mark_label('arcs'), 'MARK_MASTER': mark, 'MARK_SMALL': small, 'MARK_FAVICON': fav,
                 'LOGO_STACKED': stacked, 'MARK_FOOTER': mark_label('foot')}.items():
    html = html.replace('{{' + key + '}}', val)
(docs / 'index.html').write_text(html)
for f in ['symbol/favicon.svg', 'symbol/favicon.ico', 'symbol/apple-touch-icon.png']:
    shutil.copy(brand / f, docs / pathlib.Path(f).name)
shutil.copy(root / 'extension/lib/palette.js', docs / 'palette.js')      # the page runs the extension's own palette code
(docs / '.nojekyll').write_text('')
print('wrote docs/index.html,', len(html) // 1024, 'KB')
