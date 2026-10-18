"""Build the README animations from the frames the driver's demo mode saved.
Run the driver with ISOBAR_ONLY=demo, then: python3 tools/make_gifs.py <driver output dir> docs/media
Each frame is shown for as long as it really took, so the animation plays at the speed of the shell."""
import json
import os
import sys

from PIL import Image

src, dst = sys.argv[1], sys.argv[2]
os.makedirs(dst, exist_ok=True)
frames = json.load(open(f'{src}/demo-frames.json'))
CROP = (240, 0, 1040, 380)    # the bar, the island and the terrain around it
SIZE = (640, 304)
STEP = 2                      # every second frame is enough and halves the size


def load(name):
    return Image.open(f'{src}/{name}.png').convert('RGB').crop(CROP).resize(SIZE, Image.LANCZOS)


def save(clip, stamps, step, last_hold):
    picked = stamps[::step]
    images = [load(n) for n, _, _ in picked]
    durations = [max(20, (b[1] - a[1]) // 10 * 10) for a, b in zip(picked, picked[1:])] + [0]
    # one palette for the whole clip, made from a sample of its frames, keeps colours from flickering
    sample = images[::max(1, len(images) // 8)]
    sheet = Image.new('RGB', (SIZE[0], SIZE[1] * len(sample)))
    for i, im in enumerate(sample):
        sheet.paste(im, (0, i * SIZE[1]))
    base = sheet.quantize(colors=48, method=Image.MEDIANCUT)
    quant = [im.quantize(palette=base, dither=Image.NONE) for im in images]
    durations[-1] = last_hold
    quant[0].save(f'{dst}/{clip}.gif', save_all=True, append_images=quant[1:], duration=durations, loop=0, optimize=True, disposal=1)
    print(f'{clip}.gif: {len(quant)} frames, {os.path.getsize(f"{dst}/{clip}.gif") // 1024} KiB')


save('island', frames['island'], STEP, 1500)
save('palettes', [[n, i * 1100, l] for i, (n, _, l) in enumerate(frames['palettes'])], 1, 1100)
