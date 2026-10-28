import GLib from 'gi://GLib';
import Gio from 'gi://Gio';
import {test, eq, done} from './harness.js';

const root = GLib.path_get_dirname(GLib.path_get_dirname(GLib.filename_from_uri(import.meta.url)[0]));
const read = p => new TextDecoder().decode(GLib.file_get_contents(`${root}/${p}`)[1]);
const exists = p => GLib.file_test(`${root}/${p}`, GLib.FileTest.EXISTS);
// relative targets of src=, href=, srcset= and markdown links/images
const targets = (text, base) => {
    const found = new Set();
    for (const m of text.matchAll(/(?:src|href|srcset)="([^"#?]+)[^"]*"/g)) found.add(m[1]);
    for (const m of text.matchAll(/\]\(([^)#?\s]+)[^)]*\)/g)) found.add(m[1]);
    return [...found].filter(t => !/^(https?:|mailto:|data:|\/\/)/.test(t)).map(t => base ? `${base}/${t}` : t);
};

test('the website runs the extension\'s own palette code, byte for byte', () => {
    eq(read('docs/palette.js') === read('extension/lib/palette.js'), true);
});

test('the generated page has no template placeholders left, and its logo is inline and recolourable', () => {
    const html = read('docs/index.html');
    eq(html.includes('{{'), false);
    eq([(html.match(/class="mk"/g) ?? []).length > 3, html.includes('class="wm"')], [true, true]);
});

test('every file the page links to exists', () => {
    const missing = targets(read('docs/index.html'), 'docs').filter(t => !exists(t));
    eq(missing, []);
});

test('every image and link in the README points at a real file', () => {
    const missing = targets(read('README.md')).filter(t => !exists(t));
    eq(missing, []);
});

test('the page script only imports files that exist', () => {
    const imports = [...read('docs/site.js').matchAll(/from '\.\/([^']+)'/g)].map(m => `docs/${m[1]}`);
    eq(imports.filter(p => !exists(p)), []);
});

test('no private details slipped into the public pages: host paths, addresses, tokens, and any terms in your own private file', () => {
    const text = ['README.md', 'docs/index.html', 'docs/site.js', 'docs/style.css', 'brand/GUIDELINES.md', 'brand/terminal/README.md'].map(read).join('\n');
    // generic patterns, safe to keep in the repo
    eq(/\/home\/|\/Users\/|\b(?:\d{1,3}\.){3}\d{1,3}\b|ghp_|github_pat_|BEGIN [A-Z ]*PRIVATE KEY/.test(text), false);
    // your own words (an employer, a project, a network name) live OUTSIDE the repo, one regular expression per line,
    // so the repo itself never contains them: ~/.config/isobar/private-terms.txt
    const file = `${GLib.get_user_config_dir()}/isobar/private-terms.txt`;
    if (GLib.file_test(file, GLib.FileTest.EXISTS)) {
        const terms = new TextDecoder().decode(GLib.file_get_contents(file)[1]).split('\n').map(l => l.trim()).filter(Boolean);
        for (const term of terms)
            eq([term, new RegExp(term, 'i').test(text)], [term, false]);
    }
});

done();
