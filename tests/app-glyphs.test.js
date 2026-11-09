import {test, eq, done} from './harness.js';
import {GLYPHS} from '../extension/lib/icons.js';
import {appIcons, glyphFor, lettersOf} from '../extension/lib/app-glyphs.js';

const app = (id, name, names, categories = []) => ({id, name, names, categories});

test('well-known apps get the glyph for what they do, by their icon name', () => {
    const g = (id, names, cats) => glyphFor(app(id, id, names, cats));
    eq(g('app.zen_browser.zen', ['app.zen_browser.zen'], ['Network', 'WebBrowser']), 'browser');
    eq(g('spotify', ['spotify-client'], ['Audio']), 'music');
    eq(g('vlc', ['vlc'], ['AudioVideo', 'Player']), 'play');
    eq(g('kink-radio', ['kink-radio'], ['AudioVideo']), 'radio');
    eq(g('discord', ['discord'], ['Network', 'InstantMessaging']), 'chat');
    eq(g('teams-for-linux', ['teams-for-linux'], ['Chat']), 'chat');
    eq(g('proton-mail', ['proton-mail'], ['Network', 'Email']), 'mail');
    eq(g('jetbrains-phpstorm-49a92b47', ['jetbrains-phpstorm-49a92b47'], ['Development', 'IDE']), 'ide');
    eq(g('dbeaver-ce', ['dbeaver'], ['IDE']), 'database');
    eq(g('libreoffice-writer', ['libreoffice-writer'], ['Office']), 'doc');
    eq(g('libreoffice-calc', ['libreoffice-calc'], ['Office']), 'table');
    eq(g('gimp', ['gimp'], ['Graphics']), 'brush');
    eq(g('org.inkscape.Inkscape', ['org.inkscape.Inkscape'], ['Graphics']), 'pen');
});

test('without a name that is known, the desktop file\'s categories decide', () => {
    eq(glyphFor(app('x', 'X', ['xyz'], ['Network', 'Email'])), 'mail');
    eq(glyphFor(app('x', 'X', ['xyz'], ['Development', 'IDE'])), 'ide');
    eq(glyphFor(app('x', 'X', ['xyz'], ['AudioVideo', 'Player'])), 'play');
    eq(glyphFor(app('x', 'X', ['xyz'], ['Office', 'Spreadsheet'])), 'table');
});

test('the more specific category wins over the general one', () => {
    eq(glyphFor(app('x', 'X', ['xyz'], ['Development', 'IDE'])), 'ide');
    eq(glyphFor(app('x', 'X', ['xyz'], ['Development'])), 'code');
    eq(glyphFor(app('x', 'X', ['xyz'], ['Network', 'InstantMessaging'])), 'chat');
});

test('games and apps nobody has drawn a glyph for get their initials instead', () => {
    eq(glyphFor(app('Hearts of Iron IV', 'Hearts of Iron IV', ['steam_icon_394360'], ['Game'])), null);
    eq(glyphFor(app('mystery', 'Mystery Tool', ['mystery'], [])), null);
});

test('initials: the first letters of the first two real words, upper case, at most two', () => {
    eq([lettersOf('Hearts of Iron IV'), lettersOf('Cairn'), lettersOf('art of rally'), lettersOf('OCTOPATH TRAVELER II')], ['HI', 'C', 'AR', 'OT']);
    eq([lettersOf('A Few Quick Matches'), lettersOf('The Sims'), lettersOf('  '), lettersOf('')], ['FQ', 'S', '?', '?']);
    eq([lettersOf('Trackmania'), lettersOf('War of Dots'), lettersOf('éclair')], ['T', 'WD', 'É']);
});

test('the plan: one icon per app name, drawn apps left alone, symbolic and path names skipped, first app wins a shared name', () => {
    const plan = appIcons([
        app('a', 'Zen', ['app.zen_browser.zen'], ['WebBrowser']),
        app('b', 'Files', ['org.gnome.Nautilus'], ['FileManager']),
        app('c', 'Odd', ['odd'], []),
        app('d', 'Sym', ['thing-symbolic'], []),
        app('e', 'Path', ['/usr/share/x.png'], []),
        app('f', 'Odd again', ['odd'], ['Game']),
        app('g', 'Empty', [], ['Game']),
    ]);
    eq(plan.map(p => [p.icon, p.glyph, p.letters]), [['app.zen_browser.zen', 'browser', 'Z'], ['odd', null, 'O']]);
});

test('every glyph the rules can give exists', () => {
    const all = appIcons([app('x', 'X', ['xyz'], ['Network', 'Email'])]).length;
    eq(all, 1);
    for (const key of [...new Set(glyphsUsed())])
        eq([key, key in GLYPHS], [key, true]);
});

import {RULES, CATEGORIES} from '../extension/lib/app-glyphs.js';
function glyphsUsed() { return [...RULES.map(r => r[1]), ...Object.values(CATEGORIES)]; }

done();
