// Reads the current wallpaper into the pixels paletteFrom wants. Needs gjs (GdkPixbuf), so it is checked in the shell test.
import Gio from 'gi://Gio';
import GdkPixbuf from 'gi://GdkPixbuf';

const W = 48, H = 30;

/** The file the shell is showing: the dark wallpaper when the system prefers dark and one is set. */
export function wallpaperFile(bg, iface) {
    const dark = iface.get_string('color-scheme') === 'prefer-dark';
    const uri = (dark && bg.get_string('picture-uri-dark')) || bg.get_string('picture-uri');
    return uri ? Gio.File.new_for_uri(uri) : null;
}

/** {pixels, top}: the whole picture and its top band, or one flat colour when there is no readable picture. */
export function sample(bg, iface) {
    const flat = hex => {
        const c = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16));
        return {pixels: [c], top: [c]};
    };
    const file = bg.get_string('picture-options') === 'none' ? null : wallpaperFile(bg, iface);
    const path = file?.get_path();
    if (!path)
        return flat(bg.get_string('primary-color') || '#808080');
    try {
        // a stretched copy of the picture; fine for averages, and cheap
        const pb = GdkPixbuf.Pixbuf.new_from_file_at_scale(path, W, H, false);
        const px = pb.get_pixels(), n = pb.get_n_channels(), stride = pb.get_rowstride();
        const pixels = [], top = [];
        for (let y = 0; y < pb.get_height(); y++) {
            for (let x = 0; x < pb.get_width(); x++) {
                const i = y * stride + x * n;
                const c = [px[i], px[i + 1], px[i + 2]];
                pixels.push(c);
                if (y < Math.max(2, Math.round(pb.get_height() * 0.1)))
                    top.push(c);
            }
        }
        return {pixels, top};
    } catch (e) {
        // dynamic .xml wallpapers and broken files: fall back to the flat colour
        return flat(bg.get_string('primary-color') || '#808080');
    }
}
