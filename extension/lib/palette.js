// Wallpaper in, palette out. Plain data and maths, so it runs (and is tested) under gjs.
// The roles are the ones the shell template uses: ink is the surface, paper the text on it.

const clamp = (x, lo, hi) => Math.min(hi, Math.max(lo, x));

export function hexOf([r, g, b]) {
    return '#' + [r, g, b].map(c => Math.round(clamp(c, 0, 255)).toString(16).padStart(2, '0')).join('').toUpperCase();
}

export const rgbOf = hex => [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16));

export function luminance(hex) {
    const [r, g, b] = rgbOf(hex).map(c => c / 255).map(c => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrast(a, b) {
    const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
    return (hi + 0.05) / (lo + 0.05);
}

/** [r, g, b] 0-255 to [hue 0-360, saturation 0-1, lightness 0-1] */
export function toHsl([r, g, b]) {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min, l = (max + min) / 2;
    if (d === 0)
        return [0, 0, l];
    const s = d / (1 - Math.abs(2 * l - 1));
    const h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
    return [(h * 60 + 360) % 360, s, l];
}

export function fromHsl(h, s, l) {
    const c = (1 - Math.abs(2 * l - 1)) * s, x = c * (1 - Math.abs((h / 60) % 2 - 1)), m = l - c / 2;
    const [r, g, b] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
    return hexOf([(r + m) * 255, (g + m) * 255, (b + m) * 255]);
}

const mean = pixels => [0, 1, 2].map(i => pixels.reduce((sum, p) => sum + p[i], 0) / pixels.length);

/** The hue the wallpaper is about: grey pixels have no say, saturated ones weigh more. */
function dominantHue(pixels) {
    let x = 0, y = 0, weight = 0;
    for (const p of pixels) {
        const [h, s, l] = toHsl(p);
        const w = s * (1 - Math.abs(2 * l - 1));
        x += Math.cos(h * Math.PI / 180) * w;
        y += Math.sin(h * Math.PI / 180) * w;
        weight += w;
    }
    return weight < 0.01 * pixels.length ? null : (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
}

export const DARK_BELOW = 0.2;   // WCAG luminance of the wallpaper's average; mid grey is about 0.21

/**
 * pixels: the whole wallpaper, downscaled, as [r, g, b] 0-255. top: the band under the bar.
 * Returns the palette: surface roles (ink, paper, track, hover, muted) for cards and menus,
 * and the colours for the bar itself, which sits straight on the wallpaper.
 */
export function paletteFrom(pixels, top = pixels) {
    const avg = mean(pixels);
    const hue = dominantHue(pixels) ?? toHsl(avg)[0];
    const chroma = clamp(toHsl(avg)[1], 0.06, 0.26);
    const dark = luminance(hexOf(avg)) < DARK_BELOW;
    const tint = (s, l) => fromHsl(hue, clamp(chroma * s, 0.04, 0.5), l);

    const surface = dark
        ? {ink: tint(0.9, 0.14), track: tint(0.9, 0.19), hover: tint(0.9, 0.25), paper: tint(0.5, 0.94), muted: tint(0.5, 0.70)}
        : {ink: tint(0.7, 0.965), track: tint(0.8, 0.925), hover: tint(0.8, 0.87), paper: tint(0.9, 0.09), muted: tint(0.6, 0.36)};

    // the bar has no background of its own: dark text on a light band, light text on a dark one,
    // whichever reads better, and a soft veil when neither reads well enough
    const band = hexOf(mean(top));
    const darkText = tint(0.9, 0.09), lightText = tint(0.4, 0.96);
    const useDark = contrast(darkText, band) >= contrast(lightText, band);
    const text = useDark ? darkText : lightText;
    const barText = {text, muted: useDark ? tint(0.6, 0.30) : tint(0.4, 0.80)};
    const veil = contrast(text, band) >= 4.5 ? 0 : 0.55;

    return {
        ...surface, dark, hue: Math.round(hue), name: 'Mist',
        // the same shape the shell template wants for the rest
        ground: band, minor: surface.hover, major: surface.muted, dot: barText.muted,
        bar: {...barText, veil, veilColor: useDark ? tint(0.7, 0.965) : tint(0.9, 0.14)},
    };
}
