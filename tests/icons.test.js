import {test, eq, done} from './harness.js';
import {paletteFrom} from '../extension/lib/palette.js';
import {CORE, GLYPHS, appIcon, coreIcon, iconColours, ringSvg, spinner, spinnerRings, spinnerSymbolic} from '../extension/lib/icons.js';

const px = (r, g, b) => Array.from({length: 20}, () => [r, g, b]);
// Checks the two ways a hand-built SVG goes wrong: a tag that repeats an attribute (which makes the whole icon fail to load) and tags that do not balance
const wellFormed = text => {
    const stack = [];
    for (const [, close, name, attrs, selfClose] of text.matchAll(/<(\/?)([a-zA-Z][\w:-]*)([^>]*?)(\/?)>/g)) {
        if (close) {
            if (stack.pop() !== name)
                return `unbalanced </${name}>`;
            continue;
        }
        const seen = new Set();
        for (const [, attr] of attrs.matchAll(/\s([\w:-]+)=/g)) {
            if (seen.has(attr))
                return `<${name}> repeats ${attr}`;
            seen.add(attr);
        }
        if (!selfClose)
            stack.push(name);
    }
    return stack.length ? `unclosed <${stack.pop()}>` : true;
};
const palettes = [px(230, 235, 240), px(20, 28, 44), px(200, 90, 130), px(40, 80, 60)].map(p => paletteFrom(p));

test('the checker itself catches a repeated attribute and an unclosed tag', () => {
    eq([wellFormed('<a b="1" b="2"/>'), wellFormed('<a><b></a>'), wellFormed('<a><b/></a>')], ['<a> repeats b', 'unbalanced </a>', true]);
});

test('every glyph, core and kind-of-app, is well-formed SVG on every kind of wallpaper', () => {
    for (const p of palettes)
        for (const name of Object.keys(GLYPHS))
            eq([name, wellFormed(coreIcon(name, iconColours(p)))], [name, true]);
});

test('the spinner is well-formed, animated or frozen at a moment', () => {
    const c = iconColours(palettes[0]);
    eq([wellFormed(spinner(c)), wellFormed(spinner(c, 24, 0.5))], [true, true]);
    eq([spinner(c).includes('animateTransform'), spinner(c, 24, 0.5).includes('animateTransform')], [true, false]);
});

test('the wheel has three rings at three different speeds, and each ring is an SVG of its own', () => {
    const rings = spinnerRings(iconColours(palettes[1]));
    eq(rings.length, 3);
    eq(new Set(rings.map(r => r.dur)).size, 3);
    eq(rings.every(r => wellFormed(ringSvg(r)) === true && ringSvg(r).includes(`stroke="${r.color}"`)), true);
});

test('the symbolic wheel is filled shapes only, because GTK recolours symbolic icons by their fill, and keeps all three rings', () => {
    const out = spinnerSymbolic();
    eq([wellFormed(out), /stroke/.test(out), (out.match(/<path /g) ?? []).length], [true, false, 3]);
    eq(/fill="#bebebe"/.test(out), true);
});

test('an app icon is the glyph for what it does with its initial in the corner, well-formed and escaped', () => {
    const c = iconColours(palettes[0]);
    for (const key of Object.keys(GLYPHS)) {
        const out = appIcon(c, key, 'Qz');
        eq([key, wellFormed(out), out.includes('>Q</text>')], [key, true, true]);
    }
    const odd = appIcon(c, null, 'A&<');
    eq([wellFormed(odd), odd.includes('A&amp;&lt;'), odd.includes('r="30"')], [true, true, true]);
    eq(wellFormed(appIcon(c, 'no-such-glyph', 'Zed')), true);
});

test('an app with no glyph shows its initials big, one letter bigger than two', () => {
    const c = iconColours(palettes[0]);
    const one = appIcon(c, null, 'C'), two = appIcon(c, null, 'HI');
    eq([/font-size="25"/.test(one), /font-size="19"/.test(two)], [true, true]);
});

test('every drawn core app has a glyph, and every icon name belongs to one glyph', () => {
    eq(Object.keys(CORE).every(key => key in GLYPHS), true);
    const names = Object.values(CORE).flat();
    eq(new Set(names).size, names.length);
});

test('icon colours come from the palette: glyph reads on the plate on every wallpaper', () => {
    for (const p of palettes) {
        const c = iconColours(p);
        eq([c.plate !== c.glyph, c.accent !== c.plate], [true, true]);
    }
});

done();
