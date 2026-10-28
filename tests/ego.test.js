import GLib from 'gi://GLib';
import {test, eq, done} from './harness.js';

const root = GLib.path_get_dirname(GLib.path_get_dirname(GLib.filename_from_uri(import.meta.url)[0]));
const run = argv => {
    const [, out, err, status] = GLib.spawn_sync(root, argv, null, GLib.SpawnFlags.SEARCH_PATH, null);
    return {ok: status === 0, out: new TextDecoder().decode(out), err: new TextDecoder().decode(err)};
};
const UUID = 'isobar@captainpancakewithbacon.github.io';
const zip = `dist/${UUID}.shell-extension.zip`;
const built = run(['python3', 'tools/pack_ego.py']);
const files = run(['unzip', '-Z1', zip]).out.split('\n').filter(Boolean);
const inZip = path => run(['unzip', '-p', zip, path]).out;

test('the listing edition builds, and the build refuses to succeed if a left-out part is still referenced', () => {
    eq([built.ok, built.out.includes('built')], [true, true]);
});

test('the dock and Coucou parts are not in the package, and no source markers are left', () => {
    eq(files.filter(f => /dock|coucou/i.test(f)), []);
    eq(inZip('extension.js').includes('@full'), false);
});

test('only what the extension needs is shipped: no tests, tools, docs, images or scripts', () => {
    eq(files.filter(f => !/^(metadata\.json|extension\.js|prefs\.js|lib\/.*|schemas\/.*)$/.test(f)), []);
});

test('the id follows the rule: id@namespace with allowed characters, not gnome.org', () => {
    const meta = JSON.parse(inZip('metadata.json'));
    eq([/^[A-Za-z0-9._-]+@[A-Za-z0-9._-]+$/.test(meta.uuid), meta.uuid.endsWith('gnome.org')], [true, false]);
    eq([meta['shell-version'], 'version' in meta, meta.url.startsWith('https://github.com/')], [['50'], false, true]);
});

test('the settings schema uses the required base, and the system-wide switches default to off', () => {
    const xml = inZip('schemas/org.gnome.shell.extensions.isobar.gschema.xml');
    eq([xml.includes('id="org.gnome.shell.extensions.isobar"'), xml.includes('path="/org/gnome/shell/extensions/isobar/"')], [true, true]);
    for (const key of ['follow-scheme', 'swap-icons', 'swap-cursor', 'startup-colour', 'terminal-accent'])
        eq([key, new RegExp(`name="${key}" type="b">\\s*<default>false<`).test(xml)], [key, true]);
});

test('nothing forbidden is imported: no Gtk, Gdk or Adw in the shell process, no deprecated modules', () => {
    for (const f of files.filter(f => f.endsWith('.js') && f !== 'prefs.js'))
        eq([f, /gi:\/\/(Gtk|Gdk|Adw)\b|ByteArray|Mainloop|imports\.lang/.test(inZip(f))], [f, false]);
    eq(/gi:\/\/(Clutter|Meta|St|Shell)\b/.test(inZip('prefs.js')), false);
});

done();
