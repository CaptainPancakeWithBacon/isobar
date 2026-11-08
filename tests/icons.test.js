import {test, eq, done} from './harness.js';
import {paletteFrom} from '../extension/lib/palette.js';
import {CORE, GLYPHS, coreIcon, iconColours, plated, spinner} from '../extension/lib/icons.js';

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

test('every glyph is well-formed SVG on every kind of wallpaper', () => {
    for (const p of palettes)
        for (const name of Object.keys(GLYPHS))
            eq([name, wellFormed(coreIcon(name, iconColours(p)))], [name, true]);
});

test('the spinner is well-formed, animated or frozen at a moment', () => {
    const c = iconColours(palettes[0]);
    eq([wellFormed(spinner(c)), wellFormed(spinner(c, 24, 0.5))], [true, true]);
    eq([spinner(c).includes('animateTransform'), spinner(c, 24, 0.5).includes('animateTransform')], [true, false]);
});

test('another app\'s own icon goes on the plate, scaled into the middle', () => {
    const inner = '<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48"><rect width="48" height="48" fill="#f00"/></svg>';
    const out = plated(iconColours(palettes[0]), inner);
    eq([wellFormed(out), out.includes('viewBox="0 0 48 48"'), out.includes('fill="#f00"')], [true, true, true]);
});

test('every glyph has icon names to stand in for, and every name belongs to one glyph', () => {
    eq(Object.keys(CORE).sort(), Object.keys(GLYPHS).sort());
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
