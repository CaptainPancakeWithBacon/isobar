import {test, eq, done} from './harness.js';
import {paletteFrom, contrast, luminance, toHsl, fromHsl, hexOf, rgbOf, VEIL} from '../extension/lib/palette.js';

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

test('the bar always carries a veil, so the bar and the dock are one visible card on every wallpaper', () => {
    for (const c of [[230, 230, 230], [20, 20, 30], [128, 128, 128], [60, 140, 200]])
        eq([JSON.stringify(c), paletteFrom(flat(...c)).bar.veil], [JSON.stringify(c), VEIL]);
});

test('the veil is in the tone of the band and keeps the bar text readable on top of it, on any band', () => {
    for (const c of [[230, 230, 230], [20, 20, 30], [128, 128, 128], [60, 140, 200], [235, 240, 245], [25, 40, 30]]) {
        const {bar} = paletteFrom(flat(...c));
        const [vr, vg, vb] = rgbOf(bar.veilColor);
        const under = hexOf([vr * VEIL + c[0] * (1 - VEIL), vg * VEIL + c[1] * (1 - VEIL), vb * VEIL + c[2] * (1 - VEIL)]);
        eq([JSON.stringify(c), contrast(bar.text, under) >= 4.5], [JSON.stringify(c), true]);
    }
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

test('the dock reads the wallpaper at the left edge, where it sits: a dark card on dark hills under a pale sky, and the other way round', () => {
    const sky = flat(235, 240, 245), hills = flat(25, 40, 30);
    const onHills = paletteFrom([...sky, ...hills], sky, sky, null, hills);
    eq([luminance(onHills.bar.text) < 0.1, luminance(onHills.dock.card) < 0.1, luminance(onHills.dock.text) > 0.7], [true, true, true]);
    const onSky = paletteFrom([...sky, ...hills], hills, hills, null, sky);
    eq([luminance(onSky.bar.text) > 0.7, luminance(onSky.dock.card) > 0.8, luminance(onSky.dock.text) < 0.1], [true, true, true]);
});

test('the dock text reads on the dock card, whatever the edge looks like', () => {
    for (const c of [[235, 240, 245], [25, 40, 30], [128, 128, 128], [200, 60, 40]]) {
        const p = paletteFrom(flat(...c), flat(...c), flat(...c), null, flat(...c));
        eq([JSON.stringify(c), contrast(p.dock.text, p.dock.card) >= 7], [JSON.stringify(c), true]);
    }
});

test('with no edge given the dock follows the top band', () => {
    const sky = flat(235, 240, 245), hills = flat(25, 40, 30);
    eq(paletteFrom([...sky, ...hills], sky).dock, paletteFrom([...sky, ...hills], sky, sky, null, sky).dock);
    eq(paletteFrom([...sky, ...hills], sky).dock.card, paletteFrom([...sky, ...hills], sky).bar.veilColor);
});

test('the dock keeps the bar\'s opacity, whatever its own colour is', () => {
    const sky = flat(235, 240, 245), hills = flat(25, 40, 30);
    eq(paletteFrom([...sky, ...hills], sky, sky, null, hills).bar.veil, VEIL);
});

test('the average is the wallpaper\'s mean colour', () => {
    eq(paletteFrom([[0, 0, 0], [100, 50, 20]]).average, '#32190A');
    eq(paletteFrom(flat(220, 226, 230)).average, '#DCE2E6');
});

test('the accent carries white text, and reads as text on the window, in light and dark, for any hue', () => {
    for (const c of [[220, 226, 230], [20, 28, 40], [200, 60, 60], [60, 160, 90], [240, 200, 120], [60, 90, 200], [120, 120, 120]]) {
        const p = paletteFrom(flat(...c));
        eq([c, contrast('#FFFFFF', p.accent.bg) >= 4.5], [c, true]);
        eq([c, contrast(p.accent.text, p.ink) >= 4.5], [c, true]);
    }
});

test('the GTK surfaces keep their order: the view stands out from the window, headers from the view', () => {
    const l = paletteFrom(flat(220, 226, 230)), d = paletteFrom(flat(20, 28, 40));
    eq(luminance(l.view) > luminance(l.ink) && luminance(l.ink) > luminance(l.header), true);
    eq(luminance(d.view) < luminance(d.ink) && luminance(d.ink) < luminance(d.header), true);
});

test('a mode can be forced, and the hue stays the wallpaper\'s', () => {
    const px = flat(60, 140, 200);
    const l = paletteFrom(px, px, px, 'light'), d = paletteFrom(px, px, px, 'dark');
    eq([l.dark, d.dark], [false, true]);
    eq(l.hue, d.hue);
    eq(luminance(l.ink) > 0.8 && luminance(d.ink) < 0.05, true);
});

done();
