// Puts Isobar's colours where libadwaita apps read them: ~/.config/gtk-4.0/gtk.css.
// The colours live in mist.css; the user's own gtk.css only gets one import line, so anything else in it survives,
// and disabling Isobar takes the line (and the file) away again.
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';

const IMPORT = '@import url("mist.css");';
const dir = () => `${GLib.get_user_config_dir()}/gtk-4.0`;
const read = path => GLib.file_test(path, GLib.FileTest.EXISTS) ? new TextDecoder().decode(GLib.file_get_contents(path)[1]) : '';
const write = (path, text) => Gio.File.new_for_path(path).replace_contents(new TextEncoder().encode(text), null, false, Gio.FileCreateFlags.NONE, null);

export function applyGtk(css) {
    GLib.mkdir_with_parents(dir(), 0o755);
    write(`${dir()}/mist.css`, css);
    const text = read(`${dir()}/gtk.css`);
    if (!text.includes(IMPORT))
        write(`${dir()}/gtk.css`, `${IMPORT}\n${text}`);
}

export function removeGtk() {
    const rest = read(`${dir()}/gtk.css`).replace(`${IMPORT}\n`, '').replace(IMPORT, '');
    if (rest.trim() === '')
        GLib.unlink(`${dir()}/gtk.css`);
    else
        write(`${dir()}/gtk.css`, rest);
    GLib.unlink(`${dir()}/mist.css`);
}
