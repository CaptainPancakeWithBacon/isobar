import GLib from 'gi://GLib';
import {test, eq, done} from './harness.js';
import {PALETTES, NAMES, DEFAULT, paletteCss, contrast, luminance, rgb} from '../lib/palettes.js';

const dir = GLib.path_get_dirname(GLib.filename_from_uri(import.meta.url)[0]);
const read = name => new TextDecoder().decode(GLib.file_get_contents(`${dir}/../palettes/${name}.css`)[1]);

test('there are several palettes, and the default is one of them', () => {
    eq([NAMES.length >= 4, NAMES.includes(DEFAULT)], [true, true]);
});

test('every palette has every colour as a six digit hex', () => {
    const keys = ['ground', 'minor', 'major', 'ink', 'paper', 'track', 'hover', 'dot', 'muted'];
    for (const n of NAMES)
        eq([n, keys.filter(k => !/^#[0-9A-F]{6}$/.test(PALETTES[n][k]))], [n, []]);
});

test('Isobar is light: every ground is a light colour', () => {
    for (const n of NAMES)
        eq([n, luminance(PALETTES[n].ground) > 0.6], [n, true]);
});

test('text can be read: paper on ink, ink on paper, muted text on ink', () => {
    for (const n of NAMES) {
        const p = PALETTES[n];
        eq([n, contrast(p.paper, p.ink) >= 7, contrast(p.paper, p.track) >= 7, contrast(p.muted, p.ink) >= 4.5], [n, true, true, true]);
    }
});

test('the bar is the ground colour, so ink text must be readable on it', () => {
    for (const n of NAMES)
        eq([n, contrast(PALETTES[n].ink, PALETTES[n].ground) >= 7], [n, true]);
});

test('the contour lines can be seen on the ground, the major ones more than the minor', () => {
    for (const n of NAMES) {
        const p = PALETTES[n];
        eq([n, contrast(p.minor, p.ground) >= 1.25, contrast(p.major, p.ground) > contrast(p.minor, p.ground)], [n, true, true]);
    }
});

test('the palettes differ from each other', () => {
    eq(new Set(NAMES.map(n => PALETTES[n].ground)).size, NAMES.length);
});

test('a hex colour becomes 0-1 channels', () => {
    eq(rgb('#FF8000').map(v => Math.round(v * 255)), [255, 128, 0]);
});

test('the colours in the stylesheet files are the palette, so the files cannot drift from the data', () => {
    for (const n of NAMES)
        eq([n, read(n) === paletteCss(PALETTES[n])], [n, true]);
});

test('the layout stylesheet holds no colours, so a palette decides every colour', () => {
    const css = new TextDecoder().decode(GLib.file_get_contents(`${dir}/../stylesheet.css`)[1]);
    eq(css.match(/#[0-9a-fA-F]{6}/g), null);
});

done();
