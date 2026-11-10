// Writes Isobar's icon theme into ~/.local/share/icons and switches GNOME to it, and puts everything back when Isobar is switched off.
// The theme holds one icon, the loading wheel Gtk.Spinner draws (process-working-symbolic), and inherits the theme you had (Papirus follows light
// and dark), so every app keeps its usual icon. Isobar once drew the app icons itself; they never looked enough like the apps (the work is on the
// brand-icons branch). It alternates between two folder names (Isobar, Isobar-2): GTK and the shell only reload icons when the theme name changes,
// the same trick as the stylesheet's file names.
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';

import {spinnerSymbolic} from './icons.js';
import {baseTheme, indexTheme} from './icon-plan.js';

const NAMES = ['Isobar', 'Isobar-2'];

const read = path => {
    try {
        return new TextDecoder().decode(GLib.file_get_contents(path)[1]);
    } catch (e) {
        return null;
    }
};

function removeTree(path) {
    const file = Gio.File.new_for_path(path);
    if (!file.query_exists(null))
        return;
    if (file.query_file_type(Gio.FileQueryInfoFlags.NOFOLLOW_SYMLINKS, null) === Gio.FileType.DIRECTORY) {
        const children = file.enumerate_children('standard::name', Gio.FileQueryInfoFlags.NOFOLLOW_SYMLINKS, null);
        for (let info = children.next_file(null); info; info = children.next_file(null))
            removeTree(`${path}/${info.get_name()}`);
    }
    file.delete(null);
}

export class IconTheme {
    constructor(iface) {
        this._iface = iface;
        this._root = `${GLib.get_user_data_dir()}/icons`;
        this._memo = `${GLib.get_user_cache_dir()}/isobar/icons-previous`;
    }

    /** The theme in use before Isobar's, remembered across logins so the oldest choice survives. */
    _previous() {
        const now = this._iface.get_string('icon-theme');
        if (!NAMES.includes(now)) {
            GLib.mkdir_with_parents(`${GLib.get_user_cache_dir()}/isobar`, 0o755);
            GLib.file_set_contents(this._memo, now);
            return now;
        }
        return (read(this._memo) ?? '').trim();
    }

    /** Write the theme and switch to it; does nothing when it is already there. `dark` is GNOME's scheme, which decides Papirus-Light or -Dark. */
    apply(dark) {
        const previous = this._previous();
        const inherits = baseTheme(previous, dark);
        const active = this._iface.get_string('icon-theme');
        if (NAMES.includes(active) && read(`${this._root}/${active}/.key`) === inherits)
            return;

        const target = active === NAMES[0] ? NAMES[1] : NAMES[0];
        const dir = `${this._root}/${target}`;
        removeTree(dir);
        for (const sub of ['apps', 'places', 'status'])
            GLib.mkdir_with_parents(`${dir}/scalable/${sub}`, 0o755);
        GLib.file_set_contents(`${dir}/index.theme`, indexTheme(target, inherits));
        GLib.file_set_contents(`${dir}/scalable/status/process-working-symbolic.svg`, spinnerSymbolic());
        GLib.file_set_contents(`${dir}/.key`, inherits);
        this._iface.set_string('icon-theme', target);
    }

    /** The theme in use before Isobar, back in place, and Isobar's folders gone. */
    restore() {
        const active = this._iface.get_string('icon-theme');
        const previous = (read(this._memo) ?? '').trim();
        if (NAMES.includes(active) && previous)
            this._iface.set_string('icon-theme', previous);
        NAMES.forEach(n => removeTree(`${this._root}/${n}`));
        GLib.unlink(this._memo);
    }
}
