// Writes theme/Isobar-<Name>/gnome-shell/gnome-shell.css for every palette. Run: gjs -m theme/build.js
import GLib from 'gi://GLib';
import Gio from 'gi://Gio';
import {PALETTES, NAMES} from '../lib/palettes.js';
import {shellCss} from './shell.js';

const root = GLib.path_get_dirname(GLib.filename_from_uri(import.meta.url)[0]);
for (const key of NAMES) {
    const name = key[0].toUpperCase() + key.slice(1);
    const dir = `${root}/Isobar-${name}/gnome-shell`;
    GLib.mkdir_with_parents(dir, 0o755);
    Gio.File.new_for_path(`${dir}/gnome-shell.css`).replace_contents(
        new TextEncoder().encode(shellCss({...PALETTES[key], name})), null, false, Gio.FileCreateFlags.NONE, null);
}
print(`wrote ${NAMES.length} shell themes`);
