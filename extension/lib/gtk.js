// Puts Isobar's colours where libadwaita apps read them: ~/.config/gtk-4.0/gtk.css (and, for the window buttons, gtk-3.0).
// The colours live in mist.css; the user's own gtk.css only gets one import line, so anything else in it survives,
// and disabling Isobar takes the line (and the file) away again.
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';

const IMPORT = '@import url("mist.css");';
const dir = v => `${GLib.get_user_config_dir()}/gtk-${v}.0`;
const read = path => GLib.file_test(path, GLib.FileTest.EXISTS) ? new TextDecoder().decode(GLib.file_get_contents(path)[1]) : '';
const write = (path, text) => Gio.File.new_for_path(path).replace_contents(new TextEncoder().encode(text), null, false, Gio.FileCreateFlags.NONE, null);

function put(v, css) {
    GLib.mkdir_with_parents(dir(v), 0o755);
    write(`${dir(v)}/mist.css`, css);
    const text = read(`${dir(v)}/gtk.css`);
    if (!text.includes(IMPORT))
        write(`${dir(v)}/gtk.css`, `${IMPORT}\n${text}`);
}

function take(v) {
    const rest = read(`${dir(v)}/gtk.css`).replace(`${IMPORT}\n`, '').replace(IMPORT, '');
    if (rest.trim() === '')
        GLib.unlink(`${dir(v)}/gtk.css`);
    else
        write(`${dir(v)}/gtk.css`, rest);
    GLib.unlink(`${dir(v)}/mist.css`);
}

export function applyGtk(css4, css3) {
    put(4, css4);
    put(3, css3);
}

export function removeGtk() {
    take(4);
    take(3);
}
