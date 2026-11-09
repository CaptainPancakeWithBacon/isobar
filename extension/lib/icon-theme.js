// Writes Isobar's icon theme into ~/.local/share/icons and switches GNOME to it, and puts everything back when Isobar is switched off.
// Every icon is drawn by Isobar: a glyph for what the app does with its initial, or its initials; nothing is copied from the icon theme in use.
// The theme is drawn from the wallpaper's palette, so it is written again when the palette changes. It alternates between two folder names
// (Isobar, Isobar-2): GTK and the shell only reload icons when the theme name changes, the same trick as the stylesheet's file names.
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';

import {appIcon, iconColours} from './icons.js';
import {appIcons} from './app-glyphs.js';
import {baseTheme, coreFiles, indexTheme, themeKey} from './icon-plan.js';

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

    /** Write the theme for this palette and switch to it; does nothing when it is already there. `dark` is GNOME's scheme. */
    apply(p, dark) {
        const previous = this._previous();
        const inherits = baseTheme(previous, dark);
        const apps = Gio.AppInfo.get_all().filter(a => a.should_show()).map(a => ({
            id: a.get_id().replace(/\.desktop$/, ''),
            name: a.get_name(),
            names: a.get_icon() instanceof Gio.ThemedIcon ? a.get_icon().get_names() : [],
            categories: (a.get_categories?.() ?? '').split(';').filter(Boolean),
        }));
        const plan = appIcons(apps);
        const key = themeKey(p, inherits, plan);
        const active = this._iface.get_string('icon-theme');
        if (NAMES.includes(active) && read(`${this._root}/${active}/.key`) === key)
            return;

        const target = active === NAMES[0] ? NAMES[1] : NAMES[0];
        const dir = `${this._root}/${target}`;
        removeTree(dir);
        for (const sub of ['apps', 'places'])
            GLib.mkdir_with_parents(`${dir}/scalable/${sub}`, 0o755);
        GLib.file_set_contents(`${dir}/index.theme`, indexTheme(target, inherits));
        for (const f of coreFiles(p))
            GLib.file_set_contents(`${dir}/scalable/${f.dir}/${f.name}.svg`, f.svg);
        const c = iconColours(p);
        for (const {icon, glyph, letters} of plan)
            GLib.file_set_contents(`${dir}/scalable/apps/${icon}.svg`, appIcon(c, glyph, letters));
        GLib.file_set_contents(`${dir}/.key`, key);
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
