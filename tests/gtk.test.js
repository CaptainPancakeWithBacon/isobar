import {test, eq, done} from './harness.js';
import {paletteFrom} from '../extension/lib/palette.js';
import {gtkCss} from '../extension/lib/gtk-css.js';

const flat = (r, g, b) => Array.from({length: 20}, () => [r, g, b]);
const NAMES = ['accent_color', 'accent_bg_color', 'accent_fg_color', 'window_bg_color', 'window_fg_color', 'view_bg_color', 'view_fg_color',
    'headerbar_bg_color', 'headerbar_fg_color', 'sidebar_bg_color', 'card_bg_color', 'dialog_bg_color', 'popover_bg_color'];

test('every colour libadwaita needs for a window is defined, for light and dark', () => {
    for (const c of [flat(220, 226, 230), flat(20, 28, 40)]) {
        const css = gtkCss(paletteFrom(c, c, c, 'light'), paletteFrom(c, c, c, 'dark'));
        for (const name of NAMES)
            eq([name, css.includes(`@define-color ${name} `)], [name, true]);
    }
});

test('nothing in it is undefined or broken: every colour is a real hex or rgba value', () => {
    const px = flat(60, 140, 200);
    const css = gtkCss(paletteFrom(px, px, px, 'light'), paletteFrom(px, px, px, 'dark'));
    eq(css.includes('undefined') || css.includes('NaN'), false);
    for (const line of css.split('\n').map(l => l.trim()).filter(l => l.startsWith('@define-color')))
        eq([line, /^@define-color \w+ (#[0-9A-Fa-f]{6}|rgba\([\d., ]+\));$/.test(line)], [line, true]);
});

test('the light block is light and the dark block is dark, from one wallpaper', () => {
    const px = flat(60, 140, 200);
    const css = gtkCss(paletteFrom(px, px, px, 'light'), paletteFrom(px, px, px, 'dark'));
    const block = mode => css.split(`@media (prefers-color-scheme: ${mode})`)[1].split('}')[0];
    const get = (b, name) => parseInt(b.match(new RegExp(`@define-color ${name} #(\\w\\w)`))[1], 16);
    eq(get(block('light'), 'window_bg_color') > 200 && get(block('light'), 'window_fg_color') < 60, true);
    eq(get(block('dark'), 'window_bg_color') < 60 && get(block('dark'), 'window_fg_color') > 200, true);
});

test('libadwaita\'s CSS variables are set too, in both blocks', () => {
    const px = flat(60, 140, 200);
    const css = gtkCss(paletteFrom(px, px, px, 'light'), paletteFrom(px, px, px, 'dark'));
    for (const name of ['--window-bg-color', '--sidebar-bg-color', '--headerbar-bg-color', '--accent-bg-color'])
        eq([name, css.split(`${name}:`).length - 1], [name, 2]);
});

done();
