// The duotone mapping of an icon: dark where the icon is dark, light where it is light, the two palette colours in between.
// The shader in duotone.js does the same maths per pixel; this is the reference the tests hold it to.
// Colours are [r, g, b] from 0 to 1, not premultiplied.

/** How bright a colour looks (Rec. 709 weights): green counts most, blue least. */
export const luminance709 = ([r, g, b]) => 0.2126 * r + 0.7152 * g + 0.0722 * b;

export function duotone(rgb, dark, light) {
    const l = luminance709(rgb);
    return dark.map((d, i) => d + (light[i] - d) * l);
}
