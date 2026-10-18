"""Build the README animations from the frames the driver's demo mode saved.
Run the driver with ISOBAR_ONLY=demo and WITHOUT ISOBAR_HEADLESS: the headless shell plays animations about ten times too fast,
so only the nested one (a window opens for about 40 s) records the real motion. Then: python3 tools/make_gifs.py <driver output dir> docs/media
Each frame is shown for as long as it really took, so the animation plays at the speed of the shell."""
import json
import os
import sys

from PIL import Image

src, dst = sys.argv[1], sys.argv[2]
os.makedirs(dst, exist_ok=True)
frames = json.load(open(f'{src}/demo-frames.json'))
CROP = (200, 0, 600, 260)     # the bar, the island and the terrain around it, at full resolution (the nested window is 800x600)
SIZE = (400, 260)
STEP = 2                      # ~15 frames a second is smooth enough and half the size


def load(name, crop, size):
    im = Image.open(f'{src}/{name}.png').convert('RGB').crop(crop)
    return im if im.size == size else im.resize(size, Image.LANCZOS)


def save(clip, stamps, step, last_hold, crop=CROP, size=SIZE):
    picked = stamps[::step]
    images = [load(n, crop, size) for n, _, _ in picked]
    durations = [max(20, (b[1] - a[1]) // 10 * 10) for a, b in zip(picked, picked[1:])] + [0]
    # one palette for the whole clip, made from a sample of its frames, keeps colours from flickering
    sample = images[::max(1, len(images) // 8)]
    sheet = Image.new('RGB', (size[0], size[1] * len(sample)))
    for i, im in enumerate(sample):
        sheet.paste(im, (0, i * size[1]))
    base = sheet.quantize(colors=48, method=Image.MEDIANCUT)
    quant = [im.quantize(palette=base, dither=Image.NONE) for im in images]
    durations[-1] = last_hold
    quant[0].save(f'{dst}/{clip}.gif', save_all=True, append_images=quant[1:], duration=durations, loop=0, optimize=True, disposal=1)
    print(f'{clip}.gif: {len(quant)} frames, {os.path.getsize(f"{dst}/{clip}.gif") // 1024} KiB')


save('island', frames['island'], STEP, 1500)
save('palettes', [[n, i * 1100, l] for i, (n, _, l) in enumerate(frames['palettes'])], 1, 1100, (0, 0, 800, 330), (800, 330))
