import Clutter from 'gi://Clutter';
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import Shell from 'gi://Shell';
import St from 'gi://St';

import {Extension} from 'resource:///org/gnome/shell/extensions/extension.js';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';

import {paletteFrom} from './lib/palette.js';
import {sample} from './lib/wallpaper.js';
import {mistCss} from './lib/mist-css.js';
import {CoucouSync} from './lib/coucou.js';
import {gtkCss} from './lib/gtk-css.js';
import {applyGtk, removeGtk} from './lib/gtk.js';

const DOT = 6;
const LONG = 20;

export default class Mist extends Extension {
    enable() {
        this._bg = new Gio.Settings({schema_id: 'org.gnome.desktop.background'});
        this._iface = new Gio.Settings({schema_id: 'org.gnome.desktop.interface'});
        this._sheet = null;
        this._ids = [];
        this._coucou = new CoucouSync();
        // Ubuntu only: the schema is missing elsewhere
        const schema = Gio.SettingsSchemaSource.get_default().lookup('com.ubuntu.login-screen', true);
        this._login = schema ? new Gio.Settings({settings_schema: schema}) : null;

        const panel = Main.panel;
        this._hidden = [panel.statusArea.activities, panel.statusArea.dateMenu];
        this._hidden.forEach(item => item.container.hide());

        // left of the bar: the time, the workspace dots, the app in front
        this._time = new St.Label({style_class: 'mist-clock', y_align: Clutter.ActorAlign.CENTER});
        this._dots = new St.BoxLayout({y_align: Clutter.ActorAlign.CENTER, style: 'spacing: 6px; margin: 0 18px;'});
        this._app = new St.Label({style_class: 'mist-app', y_align: Clutter.ActorAlign.CENTER});
        const left = new St.BoxLayout({style: 'margin-left: 10px;', y_align: Clutter.ActorAlign.CENTER});
        [this._time, this._dots, this._app].forEach(a => left.add_child(a));
        this._left = left;
        panel._leftBox.insert_child_at_index(left, 0);

        // on the desktop, under the windows: the big clock
        this._big = new St.BoxLayout({vertical: true, style: 'spacing: 4px;'});
        this._bigTime = new St.Label({style_class: 'mist-bigclock'});
        this._bigDate = new St.Label({style_class: 'mist-bigdate'});
        this._big.add_child(this._bigTime);
        this._big.add_child(this._bigDate);
        Main.layoutManager._backgroundGroup.add_child(this._big);
        this._place();
        this._ids.push([Main.layoutManager, Main.layoutManager.connect('monitors-changed', () => this._place())]);

        const wm = global.workspace_manager;
        this._ids.push([wm, wm.connect('notify::n-workspaces', () => this._buildDots())]);
        this._ids.push([wm, wm.connect('active-workspace-changed', () => this._buildDots())]);
        this._ids.push([global.display, global.display.connect('notify::focus-window', () => this._syncApp())]);
        this._buildDots();
        this._syncApp();

        this._tick();
        this._clock = GLib.timeout_add_seconds(GLib.PRIORITY_DEFAULT, 20, () => {
            this._tick();
            return GLib.SOURCE_CONTINUE;
        });

        // the wallpaper decides the colours: restyle whenever it, or light/dark, changes
        // A new wallpaper also sets light or dark for the whole desktop. Switching light/dark alone only restyles:
        // if the light and dark wallpapers differ, flipping again would never settle.
        for (const key of ['picture-uri', 'picture-uri-dark', 'picture-options', 'primary-color'])
            this._ids.push([this._bg, this._bg.connect(`changed::${key}`, () => this._restyle(true))]);
        this._ids.push([this._iface, this._iface.connect('changed::color-scheme', () => this._restyle(false))]);
        this._restyle(true);
    }

    disable() {
        this._ids.forEach(([obj, id]) => obj.disconnect(id));
        this._ids = [];
        if (this._clock)
            GLib.source_remove(this._clock);
        this._unload();
        removeGtk();
        this._coucou?.destroy();
        this._left?.destroy();
        this._big?.destroy();
        this._hidden?.forEach(item => item.container.show());
        this._login = this._coucou = this._bg = this._iface = this._left = this._big = this._time = this._dots = this._app = this._bigTime = this._bigDate = this._hidden = this._clock = null;
    }

    _restyle(follow) {
        const {pixels, top, clock} = sample(this._bg, this._iface);
        this._palette = paletteFrom(pixels, top, clock);
        if (follow) {
            const scheme = this._palette.dark ? 'prefer-dark' : 'default';
            if (this._iface.get_string('color-scheme') !== scheme)
                this._iface.set_string('color-scheme', scheme);   // its change handler restyles once more, without following
        }
        this._syncIcons();
        // the accent, for things outside the shell that want to wear it (the terminal logo in brand/terminal reads this)
        const home = GLib.build_filenamev([GLib.get_user_cache_dir(), 'isobar']);
        GLib.mkdir_with_parents(home, 0o755);
        GLib.file_set_contents(`${home}/accent`, `${this._palette.accent.text}\n`);
        // libadwaita apps get both variants, whatever mode the wallpaper is in: GTK chooses between them by itself, live
        applyGtk(gtkCss(paletteFrom(pixels, top, clock, 'light'), paletteFrom(pixels, top, clock, 'dark')));
        this._coucou.sync(this._palette.ink);   // Coucou's island wears the card colour
        // the colour the shell paints while it starts up, before the wallpaper is ready: the wallpaper's own average, not stock grey
        if (this._login)
            this._login.set_string('background-color', this._palette.average);
        const dir = GLib.build_filenamev([GLib.get_user_cache_dir(), 'mist']);
        GLib.mkdir_with_parents(dir, 0o755);
        // a new file name each time: the shell caches a stylesheet by path
        const file = Gio.File.new_for_path(`${dir}/theme-${GLib.get_monotonic_time()}.css`);
        file.replace_contents(new TextEncoder().encode(mistCss(this._palette)), null, false, Gio.FileCreateFlags.NONE, null);
        const theme = St.ThemeContext.get_for_stage(global.stage).get_theme();
        this._unload();
        theme.load_stylesheet(file);
        this._sheet = file;
    }

    // Papirus and DMZ come in a light and a dark variant: whichever one is in use follows light/dark. Any other theme is left alone.
    _syncIcons() {
        const dark = this._iface.get_string('color-scheme') === 'prefer-dark';
        const swap = (key, prefix, light, darkName) => {
            const current = this._iface.get_string(key);
            const want = dark ? darkName : light;
            if (current.startsWith(prefix) && current !== want)
                this._iface.set_string(key, want);
        };
        swap('icon-theme', 'Papirus', 'Papirus-Light', 'Papirus-Dark');
        // the pointer too: a white one on dark, a black one on light
        swap('cursor-theme', 'DMZ', 'DMZ-Black', 'DMZ-White');
    }

    _unload() {
        if (!this._sheet)
            return;
        St.ThemeContext.get_for_stage(global.stage).get_theme().unload_stylesheet(this._sheet);
        this._sheet.delete(null);
        this._sheet = null;
    }

    _place() {
        const area = Main.layoutManager.getWorkAreaForMonitor(Main.layoutManager.primaryIndex);
        this._big.set_position(area.x + 96, area.y + 28);
    }

    _tick() {
        const now = new Date();
        const hm = now.toLocaleTimeString('en-GB', {hour: '2-digit', minute: '2-digit'});
        this._time.text = hm;
        this._bigTime.text = hm;
        this._bigDate.text = now.toLocaleDateString('en-GB', {weekday: 'long', day: 'numeric', month: 'long'});
    }

    _buildDots() {
        const wm = global.workspace_manager;
        const current = wm.get_active_workspace_index();
        this._dots.destroy_all_children();
        for (let i = 0; i < wm.n_workspaces; i++) {
            const dot = new St.Widget({style_class: i === current ? 'mist-dot mist-dot-active' : 'mist-dot', width: i === current ? LONG : DOT, y_align: Clutter.ActorAlign.CENTER, y_expand: true});
            this._dots.add_child(dot);
        }
    }

    _syncApp() {
        const win = global.display.focus_window;
        const app = win ? Shell.WindowTracker.get_default().get_window_app(win) : null;
        this._app.text = app ? app.get_name() : '';
    }
}
