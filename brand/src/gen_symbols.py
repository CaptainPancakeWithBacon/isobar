# Isobar Dusk: a solid half disc on the left, contour half-rings on the right. 256 grid, centre (128,128), radius 112.
def half_disc(r):
    return f"M128,{128-r}A{r},{r} 0 0 0 128,{128+r}Z"
def half_ring(r, w):
    return f"M128,{128-r}A{r},{r} 0 0 1 128,{128+r}V{128+r-w}A{r-w},{r-w} 0 0 0 128,{128-r+w}Z"
def symbol(rings, title):
    d = half_disc(112) + "".join(half_ring(r, w) for r, w in rings)
    # tight viewBox: the mark spans 16..240 on both axes
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="16 16 224 224"><title>{title}</title>'
            f'<path fill="#000" d="{d}"/></svg>\n')
cuts = {
    'isobar-symbol':         ([(112, 12), (84, 12), (56, 12)], 'Isobar symbol'),            # 48 px and up
    'isobar-symbol-reversed':([(112, 10), (84, 10), (56, 10)], 'Isobar symbol, reversed'),  # white on dark: thinner lines, white looks heavier
    'isobar-symbol-small':   ([(112, 16), (76, 16)],           'Isobar symbol, small'),     # 24 to 48 px
    'isobar-symbol-favicon': ([(112, 24), (68, 24)],           'Isobar symbol, favicon'),   # below 24 px
    'isobar-symbol-favicon-reversed': ([(112, 20), (68, 20)],  'Isobar symbol, favicon, reversed'),
}
for name, (rings, title) in cuts.items():
    open(f'{name}.svg', 'w').write(symbol(rings, title))
print('ok')
