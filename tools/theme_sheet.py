"""Contact sheet of the theme screenshots, to look at them side by side. Usage: theme_sheet.py <driver out dir> <sheet.png>"""
import sys
from PIL import Image
out, dst = sys.argv[1], sys.argv[2]
names = ['01-desktop', '02-quick-settings', '03-date-menu', '04-banner', '05-overview', '06-appgrid', '07-search', '08-osd']
ims = []
for n in names:
    try:
        ims.append(Image.open(f'{out}/{n}.png').convert('RGB').resize((640, 400), Image.LANCZOS))
    except FileNotFoundError:
        ims.append(Image.new('RGB', (640, 400), 'white'))
W = Image.new('RGB', (1280, 400 * 4))
for i, im in enumerate(ims):
    W.paste(im, ((i % 2) * 640, (i // 2) * 400))
W.save(dst)
