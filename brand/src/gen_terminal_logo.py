import subprocess, sys
def raster(svg, n):
    # render the mark at n x n pixels, then threshold: a terminal cell is on or off
    raw = subprocess.run(['inkscape', svg, '--export-type=png', '--export-filename=-', '-w', str(n), '-h', str(n), '--export-background-opacity=0'],
                         capture_output=True, check=True).stdout
    open('tmp.png', 'wb').write(raw)
    px = subprocess.run(['magick', 'tmp.png', '-alpha', 'extract', '-depth', '8', 'gray:-'], capture_output=True, check=True).stdout
    return [[px[y*n+x] > 110 for x in range(n)] for y in range(n)]
def blocks(grid, colour_tag='$1'):
    rows = []
    for y in range(0, len(grid), 2):
        line = ''
        for x in range(len(grid[0])):
            top, bot = grid[y][x], grid[y+1][x]
            line += '█' if top and bot else '▀' if top else '▄' if bot else ' '
        rows.append(colour_tag + line.rstrip())
    return '\n'.join(rows) + '\n'
for name, svg, n in [('isobar-small', f'{sys.argv[1]}/symbol/isobar-symbol-favicon.svg', 22), ('isobar', f'{sys.argv[1]}/symbol/isobar-symbol-small.svg', 40)]:
    g = raster(svg, n)
    open(f'{name}.txt', 'w').write(blocks(g))
    print(name, n, 'px ->', n//2, 'rows'); print(blocks(g, ''))
