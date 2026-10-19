// The duotone mapping of an icon: dark where the icon is dark, light where it is light, the two palette colours in between,
// with a little contrast added so icons do not go flat.
// The shader in duotone.js does the same maths per pixel; this is the reference the tests hold it to.
// Colours are [r, g, b] from 0 to 1, not premultiplied.

/** How bright a colour looks (Rec. 709 weights): green counts most, blue least. */
export const luminance709 = ([r, g, b]) => 0.2126 * r + 0.7152 * g + 0.0722 * b;

export const FLOOR = 0.12;   // the darkest an icon gets, so its shadows stay apart from the dark dock behind it

/** Brightness 0..1 to how far toward the light colour: an S curve for contrast, on a floor. The shader uses the same numbers. */
export function tone(l) {
    const t = Math.min(1, Math.max(0, (l - 0.08) / 0.84));   // smoothstep(0.08, 0.92, l)
    return FLOOR + (1 - FLOOR) * t * t * (3 - 2 * t);
}

export function duotone(rgb, dark, light) {
    const t = tone(luminance709(rgb));
    return dark.map((d, i) => d + (light[i] - d) * t);
}
