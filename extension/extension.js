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
import {gtkCss} from './lib/gtk-css.js';
import {applyGtk, removeGtk} from './lib/gtk.js';
import {Strip} from './lib/strip.js';
// @full:start
import {CoucouSync} from './lib/coucou.js';
import {Dock} from './lib/dock.js';
import {ExtraBars} from './lib/extra-bars.js';
import {IconTheme} from './lib/icon-theme.js';
import {IsobarSpinner} from './lib/spinner.js';
// @full:end

export default class Isobar extends Extension {
    enable() {
        this._settings = this.getSettings();
        this._bg = new Gio.Settings({schema_id: 'org.gnome.desktop.background'});
        this._iface = new Gio.Settings({schema_id: 'org.gnome.desktop.interface'});
        this._sheet = null;
        this._ids = [];
        // Ubuntu only: the schema is missing elsewhere
        const schema = Gio.SettingsSchemaSource.get_default().lookup('com.ubuntu.login-screen', true);
        this._login = schema ? new Gio.Settings({settings_schema: schema}) : null;
        // @full:start
        this._coucou = new CoucouSync();
        this._dock = new Dock();
        this._icons = new IconTheme(this._iface);
        this._spinner = new IsobarSpinner();
        this._dock.apply();   // position, hiding, size, opacity: the dock comes with Isobar
        // @full:end

        const panel = Main.panel;
        this._hidden = [panel.statusArea.activities, panel.statusArea.dateMenu].filter(Boolean);   // the lock screen's panel has neither
        this._hidden.forEach(item => item.container.hide());

        // left of the bar: the time, the workspace dots, the app in front
        this._strip = new Strip();
        this._strips = [this._strip];
        panel._leftBox.insert_child_at_index(this._strip.box, 0);
        // @full:start
        // the bars Multi Monitor Bar draws on other screens get the same strip
        this._extra = new ExtraBars(() => this._newStrip());
        this._extraSync = null;
        // @full:end

        // on the desktop, under the windows: the big clock
        this._big = new St.BoxLayout({vertical: true, style: 'spacing: 4px;'});
        this._bigTime = new St.Label({style_class: 'mist-bigclock'});
        this._bigDate = new St.Label({style_class: 'mist-bigdate'});
        this._big.add_child(this._bigTime);
        this._big.add_child(this._bigDate);
        Main.layoutManager._backgroundGroup.add_child(this._big);
        this._place();
        this._connect(Main.layoutManager, 'monitors-changed', () => {
            this._place();
            // @full:start
            this._dock.pin();   // plugging a screen in or out changes which one is left-most
            this._queueExtra();
            // @full:end
        });
        // @full:start
        this._connect(Main.layoutManager.uiGroup, 'child-added', () => this._queueExtra());   // Multi Monitor Bar rebuilds its bars on its own schedule
        this._queueExtra();
        // @full:end

        const wm = global.workspace_manager;
        this._connect(wm, 'notify::n-workspaces', () => this._buildDots());
        this._connect(wm, 'active-workspace-changed', () => this._buildDots());
        this._connect(global.display, 'notify::focus-window', () => this._syncApp());
        this._buildDots();
        this._syncApp();
        // Isobar stays on while the screen is locked (session-modes), so extra bars such as Multi Monitor Bar's keep our transparent style
        // instead of Ubuntu's solid black. Rebuilding the panel on lock and unlock shows Activities and the date again: hide them again.
        this._connect(Main.sessionMode, 'updated', () => this._syncMode());
        this._syncMode();

        this._tick();
        this._clock = GLib.timeout_add_seconds(GLib.PRIORITY_DEFAULT, 20, () => {
            this._tick();
            return GLib.SOURCE_CONTINUE;
        });

        // The wallpaper decides the colours. A new wallpaper also sets light or dark for the whole desktop; switching
        // light/dark by itself only restyles, because if the two wallpapers differ, flipping again would never settle.
        for (const key of ['picture-uri', 'picture-uri-dark', 'picture-options', 'primary-color'])
            this._connect(this._bg, `changed::${key}`, () => this._restyle(true));
        this._connect(this._iface, 'changed::color-scheme', () => this._restyle(false));
        this._connect(this._settings, 'changed', () => this._restyle(false));
        this._restyle(true);
    }

    disable() {
        this._ids.forEach(([object, id]) => object.disconnect(id));
        GLib.source_remove(this._clock);
        this._unload();
        removeGtk();
        GLib.unlink(`${GLib.get_user_cache_dir()}/isobar/accent`);
        // @full:start
        // GNOME also disables extensions while the screen is locked; the dock should not be reset and set again then
        if (Main.sessionMode.currentMode !== 'unlock-dialog')
            this._dock.restore();
        this._icons.restore();
        this._spinner.restore();
        this._coucou.destroy();
        this._dock = this._coucou = this._icons = this._spinner = null;
        // @full:end
        // @full:start
        if (this._extraSync)
            GLib.source_remove(this._extraSync);
        this._extra.destroy();
        this._extra = this._extraSync = null;
        // @full:end
        this._strip.box.destroy();
        this._big.destroy();
        this._hidden.forEach(item => item.container.show());
        this._settings = this._bg = this._iface = this._login = this._ids = this._clock = null;
        this._strip = this._strips = this._big = this._bigTime = this._bigDate = this._hidden = null;
    }

    _connect(object, signal, handler) {
        this._ids.push([object, object.connect(signal, handler)]);
    }

    _restyle(followWallpaper) {
        const {pixels, top, clock} = sample(this._bg, this._iface);
        this._palette = paletteFrom(pixels, top, clock);
        const on = key => this._settings.get_boolean(key);

        if (followWallpaper && on('follow-scheme')) {
            const scheme = this._palette.dark ? 'prefer-dark' : 'default';
            if (this._iface.get_string('color-scheme') !== scheme)
                this._iface.set_string('color-scheme', scheme);   // its change handler restyles once more, without following
        }
        this._syncIcons();
        // @full:start
        // Isobar's icons: drawn from this palette; the theme in use before is put back when the switch goes off
        if (on('adaptive-icons')) {
            this._icons.apply(this._palette, this._iface.get_string('color-scheme') === 'prefer-dark');
            this._spinner.apply(this._palette);   // and the loading wheel
        } else {
            this._icons.restore();
            this._spinner.restore();
        }
        // @full:end
        this._shareAccent(on('terminal-accent'));
        // libadwaita apps get both palettes, whatever mode the wallpaper is in: GTK picks the one that applies, live
        if (on('style-apps'))
            applyGtk(gtkCss(paletteFrom(pixels, top, clock, 'light'), paletteFrom(pixels, top, clock, 'dark')));
        else
            removeGtk();
        // the colour the shell paints while it starts, before the wallpaper is ready: the wallpaper's own average, not stock grey
        if (this._login && on('startup-colour'))
            this._login.set_string('background-color', this._palette.average);
        // @full:start
        this._coucou.sync(this._palette.ink);   // Coucou's island wears the card colour
        this._dock.setOpacity(this._palette.bar.veil);   // and the dock is as see-through as the bar
        // @full:end

        const dir = `${GLib.get_user_cache_dir()}/mist`;
        GLib.mkdir_with_parents(dir, 0o755);
        // a new file name each time: the shell caches a stylesheet by path
        const file = Gio.File.new_for_path(`${dir}/theme-${GLib.get_monotonic_time()}.css`);
        file.replace_contents(new TextEncoder().encode(mistCss(this._palette)), null, false, Gio.FileCreateFlags.NONE, null);
        this._unload();
        St.ThemeContext.get_for_stage(global.stage).get_theme().load_stylesheet(file);
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
        if (this._settings.get_boolean('swap-icons'))
            swap('icon-theme', 'Papirus', 'Papirus-Light', 'Papirus-Dark');
        if (this._settings.get_boolean('swap-cursor'))
            swap('cursor-theme', 'DMZ', 'DMZ-Black', 'DMZ-White');
    }

    // the accent, for things outside the shell that want to wear it (a terminal logo reads this file)
    _shareAccent(share) {
        const dir = `${GLib.get_user_cache_dir()}/isobar`;
        if (share) {
            GLib.mkdir_with_parents(dir, 0o755);
            GLib.file_set_contents(`${dir}/accent`, `${this._palette.accent.text}\n`);
        } else {
            GLib.unlink(`${dir}/accent`);
        }
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
        this._strips.forEach(strip => { strip.time.text = hm; });
        this._bigTime.text = hm;
        this._bigDate.text = now.toLocaleDateString('en-GB', {weekday: 'long', day: 'numeric', month: 'long'});
    }

    _buildDots() {
        const wm = global.workspace_manager;
        this._strips.forEach(strip => strip.setDots(wm.n_workspaces, wm.get_active_workspace_index()));
    }

    // @full:start
    // a strip for another screen's bar, showing what the main one shows
    _newStrip() {
        const strip = new Strip();
        const wm = global.workspace_manager;
        strip.time.text = this._strip.time.text;
        strip.app.text = this._strip.app.text;
        strip.setDots(wm.n_workspaces, wm.get_active_workspace_index());
        strip.box.visible = Main.sessionMode.currentMode !== 'unlock-dialog';
        this._strips.push(strip);
        strip.box.connect('destroy', () => { this._strips = this._strips.filter(s => s !== strip); });
        return strip;
    }

    // one pass after the shell is done with what it is doing, however many bars were added at once
    _queueExtra() {
        if (this._extraSync)
            return;
        this._extraSync = GLib.idle_add(GLib.PRIORITY_DEFAULT_IDLE, () => {
            this._extraSync = null;
            this._extra.sync();
            return GLib.SOURCE_REMOVE;
        });
    }
    // @full:end

    // On the lock screen the bar shows no clock, dots or app name: what you had open is nobody's business.
    _syncMode() {
        this._hidden.forEach(item => item.container.hide());
        this._strips.forEach(strip => { strip.box.visible = Main.sessionMode.currentMode !== 'unlock-dialog'; });
    }

    _syncApp() {
        const win = global.display.focus_window;
        const app = win ? Shell.WindowTracker.get_default().get_window_app(win) : null;
        this._strips.forEach(strip => { strip.app.text = app ? app.get_name() : ''; });
    }
}
