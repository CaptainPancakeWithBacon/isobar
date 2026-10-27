import {test, eq, done} from './harness.js';
import {paletteFrom, contrast, luminance, toHsl, fromHsl, hexOf} from '../extension/lib/palette.js';

const flat = (r, g, b, n = 20) => Array.from({length: n}, () => [r, g, b]);

test('hsl round trips', () => {
    for (const c of [[200, 100, 50], [10, 240, 90], [128, 128, 128]]) {
        const [h, s, l] = toHsl(c);
        eq(fromHsl(h, s, l), hexOf(c));
    }
});

test('a pale wallpaper gives a light card with dark text', () => {
    const p = paletteFrom(flat(220, 226, 230));
    eq(p.dark, false);
    eq(luminance(p.ink) > 0.85, true);
    eq(luminance(p.paper) < 0.05, true);
});

test('a dark wallpaper gives a dark card with light text', () => {
    const p = paletteFrom(flat(20, 28, 40));
    eq(p.dark, true);
    eq(luminance(p.ink) < 0.03, true);
    eq(luminance(p.paper) > 0.7, true);
});

test('text on the card is always readable: body 7:1, small text 4.5:1', () => {
    for (const c of [[220, 226, 230], [20, 28, 40], [200, 60, 60], [60, 160, 90], [240, 200, 120], [120, 120, 120], [255, 255, 255], [0, 0, 0]]) {
        const p = paletteFrom(flat(...c));
        eq([c, contrast(p.paper, p.ink) >= 7], [c, true]);
        eq([c, contrast(p.muted, p.ink) >= 4.5], [c, true]);
    }
});

test('the card takes the wallpaper hue, softly', () => {
    const p = paletteFrom(flat(60, 140, 200));
    const [h, s] = toHsl([...p.ink.slice(1).match(/../g)].map(x => parseInt(x, 16)));
    eq(Math.abs(h - p.hue) < 6, true);
    eq(s < 0.5, true);
});

test('bar text is dark on a pale band and light on a dark band, even if the rest differs', () => {
    const pale = flat(230, 230, 230), dark = flat(20, 20, 30);
    eq(luminance(paletteFrom([...dark, ...dark], pale).bar.text) < 0.1, true);
    eq(luminance(paletteFrom([...pale, ...pale], dark).bar.text) > 0.7, true);
});

test('on a mid-tone band with no good text colour the bar gets a veil; on clear bands it does not', () => {
    eq(paletteFrom(flat(230, 230, 230)).bar.veil, 0);
    eq(paletteFrom(flat(20, 20, 30)).bar.veil, 0);
    const mid = paletteFrom(flat(128, 128, 128)).bar;
    eq(contrast(mid.text, '#808080') < 4.5 ? mid.veil > 0 : mid.veil === 0, true);
});

test('a grey wallpaper does not invent a hue', () => {
    const p = paletteFrom(flat(120, 120, 120));
    eq(toHsl([...p.ink.slice(1).match(/../g)].map(x => parseInt(x, 16)))[1] < 0.1, true);
});

test('the big clock reads on its own patch of wallpaper, whatever the top edge looks like', () => {
    const sky = flat(235, 240, 245), hills = flat(25, 40, 30);
    const p = paletteFrom([...sky, ...hills], sky, hills);
    eq(luminance(p.bar.text) < 0.1, true);       // the bar sits on sky: dark text
    eq(luminance(p.clock.text) > 0.7, true);     // the clock sits on hills: light text
    eq(p.clock.shadow.startsWith('rgba(0'), true);
    const q = paletteFrom([...sky, ...hills], hills, sky);
    eq(luminance(q.clock.text) < 0.1, true);
});

done();
