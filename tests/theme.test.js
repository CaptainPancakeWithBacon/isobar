import GLib from 'gi://GLib';
import {test, eq, done} from './harness.js';
import {PALETTES, NAMES} from '../lib/palettes.js';
import {shellCss, ALERT} from '../theme/shell.js';

const dir = GLib.path_get_dirname(GLib.filename_from_uri(import.meta.url)[0]);
const read = key => new TextDecoder().decode(GLib.file_get_contents(`${dir}/../theme/Isobar-${key[0].toUpperCase() + key.slice(1)}/gnome-shell/gnome-shell.css`)[1]);
const css = key => shellCss({...PALETTES[key], name: key[0].toUpperCase() + key.slice(1)});

test('every palette has a shell theme file, and the file is what the generator makes', () => {
    for (const key of NAMES)
        eq([key, read(key) === css(key)], [key, true]);
});

test('every theme builds on GNOME\'s own dark stylesheet instead of replacing it', () => {
    for (const key of NAMES)
        eq([key, css(key).includes('@import url("resource:///org/gnome/shell/theme/gnome-shell-dark.css");')], [key, true]);
});

test('a theme uses only its own palette, and one alert colour, so nothing foreign slips in', () => {
    for (const key of NAMES) {
        const own = new Set([...Object.values(PALETTES[key]), ALERT, '#FFFFFF'].map(c => c.toUpperCase()));
        const used = (css(key).match(/#[0-9a-fA-F]{6}\b/g) ?? []).map(c => c.toUpperCase());
        eq([key, used.filter(c => !own.has(c))], [key, []]);
    }
});

test('the accent colour is overridden where it would show: checked toggles, today, switches, sliders', () => {
    const text = css('mint');
    for (const selector of ['.quick-toggle:checked', '.calendar .calendar-day.calendar-today', '.toggle-switch:checked', '.slider'])
        eq([selector, text.includes(selector)], [selector, true]);
});

test('the bar and the dock are the ground colour, and nothing else in the shell is', () => {
    for (const key of NAMES) {
        const text = css(key).replace(/\/\*[\s\S]*?\*\//g, '');   // without the comments
        const ground = PALETTES[key].ground.toUpperCase();
        const rules = text.split('}').filter(r => r.toUpperCase().includes(ground)).map(r => r.split('{')[0].trim());
        eq([key, rules.map(r => r.replace(/\s+/g, ' '))], [key, ['#panel, #panel:overview', '#dashtodockContainer #dash .dash-background']]);
    }
});

test('on a light bar the bar text is ink, not paper', () => {
    const text = css('sand');
    const block = text.slice(text.indexOf('#panel .panel-button,'));
    eq(block.slice(0, block.indexOf('}')).includes(PALETTES.sand.ink), true);
});

test('the installer copies a theme to the themes folder and refuses an unknown palette', () => {
    const home = GLib.dir_make_tmp('isobar-install-XXXXXX');
    const run = (...args) => GLib.spawn_sync(null, [`${dir}/../theme/install.sh`, ...args], [`XDG_DATA_HOME=${home}`, `PATH=${GLib.getenv('PATH')}`], 0, null);
    run('sand');
    eq(GLib.file_test(`${home}/themes/Isobar-Sand/gnome-shell/gnome-shell.css`, GLib.FileTest.EXISTS), true);
    eq(GLib.file_test(`${home}/themes/Isobar-Mint`, GLib.FileTest.EXISTS), false);
    eq(run('banana')[3] !== 0, true);
});

done();
