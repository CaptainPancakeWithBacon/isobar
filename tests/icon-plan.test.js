import {test, eq, done} from './harness.js';
import {paletteFrom} from '../extension/lib/palette.js';
import {CORE} from '../extension/lib/icons.js';
import {baseTheme, coreFiles, indexTheme, themeKey} from '../extension/lib/icon-plan.js';

const px = (r, g, b) => Array.from({length: 20}, () => [r, g, b]);
const pal = paletteFrom(px(230, 235, 240));

test('Papirus follows light and dark; any other theme is inherited as it is; Isobar never inherits itself', () => {
    eq([baseTheme('Papirus-Dark', false), baseTheme('Papirus', true), baseTheme('Papirus-Light', true)], ['Papirus-Light', 'Papirus-Dark', 'Papirus-Dark']);
    eq([baseTheme('Yaru', true), baseTheme('Yaru-blue-dark', false)], ['Yaru', 'Yaru-blue-dark']);
    eq([baseTheme('Isobar', true), baseTheme('Isobar-2', false), baseTheme('', true)], ['Adwaita', 'Adwaita', 'Adwaita']);
});

test('the theme file names its parent and its two scalable folders', () => {
    const t = indexTheme('Isobar', 'Papirus-Dark');
    eq([t.includes('Name=Isobar'), t.includes('Inherits=Papirus-Dark'), t.includes('Directories=scalable/apps,scalable/places')], [true, true, true]);
    eq([/\[scalable\/apps\][^[]*Context=Applications/.test(t), /\[scalable\/places\][^[]*Context=Places/.test(t), t.includes('Type=Scalable')], [true, true, true]);
});

test('the drawn icons go to the right folder: the bin among places, the rest among apps', () => {
    const files = coreFiles(pal);
    eq(files.every(f => f.svg.startsWith('<svg')), true);
    eq(files.filter(f => f.dir === 'places').map(f => f.name).sort(), ['user-trash', 'user-trash-full']);
    eq(files.length, Object.values(CORE).flat().length);
    eq(new Set(files.map(f => `${f.dir}/${f.name}`)).size, files.length);
});

test('the key changes with colours, parent theme and the set of apps, and with nothing else', () => {
    const c = (p, i, n) => themeKey(p, i, n);
    const plan = [{icon: 'a', glyph: 'chat', letters: 'A'}, {icon: 'b', glyph: null, letters: 'B'}];
    const base = c(pal, 'Papirus-Light', plan);
    eq(base === c(pal, 'Papirus-Light', JSON.parse(JSON.stringify(plan))), true);
    eq([base === c(paletteFrom(px(20, 28, 44)), 'Papirus-Light', plan), base === c(pal, 'Papirus-Dark', plan), base === c(pal, 'Papirus-Light', plan.slice(0, 1)), base === c(pal, 'Papirus-Light', [{...plan[0], glyph: 'mail'}, plan[1]])], [false, false, false, false]);
});

done();
