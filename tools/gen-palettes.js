// Writes palettes/<name>.css from lib/palettes.js. Run: gjs -m tools/gen-palettes.js
import GLib from 'gi://GLib';
import Gio from 'gi://Gio';
import {PALETTES, NAMES, paletteCss} from '../lib/palettes.js';

const root = GLib.path_get_dirname(GLib.path_get_dirname(GLib.filename_from_uri(import.meta.url)[0]));
GLib.mkdir_with_parents(`${root}/palettes`, 0o755);
for (const name of NAMES)
    Gio.File.new_for_path(`${root}/palettes/${name}.css`).replace_contents(new TextEncoder().encode(paletteCss(PALETTES[name])), null, false, Gio.FileCreateFlags.NONE, null);
print(`wrote ${NAMES.length} palettes`);
