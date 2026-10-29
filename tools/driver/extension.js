// Test only. Checks what Mist did in a throwaway shell and takes screenshots into MIST_OUT.
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import Shell from 'gi://Shell';
import St from 'gi://St';

import {Extension} from 'resource:///org/gnome/shell/extensions/extension.js';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as Config from 'resource:///org/gnome/shell/misc/config.js';

const OUT = GLib.getenv('MIST_OUT');
const UUID = GLib.getenv('MIST_EXT_UUID') ?? 'mist@gijs.dev';
const EGO = GLib.getenv('MIST_EDITION') === 'ego';   // the listing edition has no dock or Coucou parts
const sleep = ms => new Promise(resolve => GLib.timeout_add(GLib.PRIORITY_DEFAULT, ms, () => { resolve(); return GLib.SOURCE_REMOVE; }));
const log = line => {
    const stream = Gio.File.new_for_path(`${OUT}/driver.log`).append_to(Gio.FileCreateFlags.NONE, null);
    stream.write_all(new TextEncoder().encode(`${line}\n`), null);
    stream.close(null);
};
const screenshot = name => new Promise(resolve => {
    const stream = Gio.File.new_for_path(`${OUT}/${name}.png`).replace(null, false, Gio.FileCreateFlags.NONE, null);
    new Shell.Screenshot().screenshot(false, stream, (shot, res) => {
        try { shot.screenshot_finish(res); log(`screenshot ${name}: ok`); } catch (e) { log(`screenshot ${name}: FAIL ${e.message}`); }
        stream.close(null);
        resolve();
    });
});
const hex = c => '#' + [c.red, c.green, c.blue].map(v => v.toString(16).padStart(2, '0')).join('');
const bgOf = a => a.get_theme_node().get_background_color();
const fgOf = a => hex(a.get_theme_node().get_foreground_color());
const lum = h => { const [r, g, b] = [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16) / 255).map(c => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
const check = (label, ok, detail = '') => log(`${ok ? 'ok  ' : 'FAIL'} ${label}${detail ? ': ' + detail : ''}`);
const find = (root, cls) => { const out = []; const walk = a => { if (a.has_style_class_name?.(cls)) out.push(a); a.get_children?.().forEach(walk); }; walk(root); return out; };

export default class MistDriver extends Extension {
    enable() {
        if (this._started)
            return;
        this._started = true;
        this._run().catch(e => log(`FAIL driver crashed: ${e.message}\n${e.stack}`)).finally(() => GLib.file_set_contents(`${OUT}/done`, 'done'));
    }

    disable() {}

    async _run() {
        while (Main.layoutManager._startingUp)
            await sleep(500);
        await sleep(2500);
        log(`GNOME Shell ${Config.PACKAGE_VERSION}`);
        const panel = Main.panel;
        const quick = panel.statusArea.quickSettings;

        const clocks = find(panel, 'mist-clock');
        check('Mist put its clock in the bar', clocks.length === 1, clocks[0]?.text);
        check('Activities and the date menu are hidden', !panel.statusArea.activities.container.visible && !panel.statusArea.dateMenu.container.visible);
        check('the big clock is on the desktop', find(Main.layoutManager._backgroundGroup, 'mist-bigclock').length === 1);
        check('one dot per workspace', find(panel, 'mist-dot').length === global.workspace_manager.n_workspaces);

        check('the bar is no taller than the 28 px Coucou leaves for it', panel.height <= 28, `${panel.height} px`);
        const dockSettings = EGO ? null : new Gio.Settings({schema_id: 'org.gnome.shell.extensions.dash-to-dock'});
        if (!EGO) {
            const wantPos = GLib.getenv('MIST_DOCK_JSON') ? JSON.parse(GLib.getenv('MIST_DOCK_JSON'))['dock-position'] ?? 'BOTTOM' : 'BOTTOM';
            check('the dock took Isobar\'s position', dockSettings.get_string('dock-position') === wantPos, dockSettings.get_string('dock-position'));
            if (!GLib.getenv('MIST_DOCK_JSON'))
                check('the dock took Isobar\'s hiding behaviour', dockSettings.get_boolean('autohide') && dockSettings.get_boolean('intellihide') && !dockSettings.get_boolean('dock-fixed'));
        }
        const ctx = () => ({
            bar: bgOf(panel), text: fgOf(clocks[0]),
            card: hex(bgOf(quick.menu.box)), cardText: fgOf(quick.menu.box),
        });
        const ifaceStart = new Gio.Settings({schema_id: 'org.gnome.desktop.interface'}).get_string('color-scheme');
        log(`scheme at start ${ifaceStart}`);
        const a = ctx();
        log(`state ${JSON.stringify(a)}`);
        check('the bar is transparent, or carries the soft veil on a busy top edge', a.bar.alpha === 0 || (a.bar.alpha > 120 && a.bar.alpha < 160), `alpha ${a.bar.alpha}`);
        const dark = lum(a.card) < 0.2;
        log(`card is ${dark ? 'dark' : 'light'}`);
        check('card text reads on the card', Math.abs(lum(a.card) - lum(a.cardText)) > 0.5);

        const login = new Gio.Settings({schema_id: 'com.ubuntu.login-screen'});
        const startup = login.get_string('background-color');
        check(EGO ? 'the start-up colour is left alone until the user switches it on' : 'the start-up colour is set to the wallpaper average, not left to the stock grey', EGO ? startup === '' : /^#[0-9A-F]{6}$/.test(startup), startup);
        await screenshot('desktop');
        // the top bar's hover state, forced: pointing at a bar button fills it with the accent and turns its icons white
        quick.add_style_pseudo_class('hover');
        await sleep(500);
        await screenshot('bar-hover');
        const hov = quick.get_theme_node().get_background_color();
        check('hovering a top-bar button fills it with the accent', hov.alpha > 200, `rgba(${hov.red},${hov.green},${hov.blue},${hov.alpha})`);
        quick.remove_style_pseudo_class('hover');
        quick.menu.open();
        await sleep(1200);
        await screenshot('quick');
        quick.menu.close();
        await sleep(600);
        Main.overview.show();
        await sleep(1800);
        await screenshot('overview');
        Main.overview.hide();
        await sleep(800);

        // libadwaita apps: Mist's colours are in place, and a real app picks them up
        const cfg = GLib.get_user_config_dir();
        const read = f => { try { return new TextDecoder().decode(GLib.file_get_contents(f)[1]); } catch (e) { return ''; } };
        const mist1 = read(`${cfg}/gtk-4.0/mist.css`);
        check('the GTK stylesheet is written, with a light and a dark window colour', (mist1.match(/@define-color window_bg_color #[0-9A-F]{6};/g) ?? []).length === 2);
        const accent = read(`${GLib.get_user_cache_dir()}/isobar/accent`);
        check(EGO ? 'the accent colour is not shared until the user switches it on' : 'the accent colour is written for the terminal logo', EGO ? accent === '' : /^#[0-9A-F]{6}\n$/.test(accent), accent.trim());
        check('gtk.css imports it', read(`${cfg}/gtk-4.0/gtk.css`).includes('mist.css'));
        check('GTK3 apps get the window buttons too', read(`${cfg}/gtk-3.0/mist.css`).includes('button.titlebutton') && read(`${cfg}/gtk-3.0/gtk.css`).includes('mist.css'));
        GLib.spawn_command_line_async(GLib.getenv('MIST_APP_CMD') ?? 'nautilus --new-window');
        await sleep(6000);
        await screenshot('app');
        Main.overview.show();
        await sleep(2000);
        await screenshot('overview-app');   // the overview with a window in it
        Main.overview.hide();
        await sleep(1200);

        // the wallpaper changes: the palette must follow
        const other = GLib.getenv('MIST_WALLPAPER_2');
        if (other) {
            const bg = new Gio.Settings({schema_id: 'org.gnome.desktop.background'});
            bg.set_string('picture-uri', `file://${other}`);
            bg.set_string('picture-uri-dark', `file://${other}`);
            await sleep(1500);
            const b = ctx();
            log(`state after ${JSON.stringify(b)}`);
            check('a different wallpaper restyles the card', b.card !== a.card, `${a.card} -> ${b.card}`);
            check('and flips light/dark when the wallpaper does', (lum(b.card) < 0.2) !== dark);
            const iface = new Gio.Settings({schema_id: 'org.gnome.desktop.interface'});
            const dark2 = lum(b.card) < 0.2;
            if (EGO) {
                check('light/dark, icons and pointer are left alone until the user switches them on', iface.get_string('color-scheme') === ifaceStart && iface.get_string('icon-theme') === 'Papirus-Light' && iface.get_string('cursor-theme') === 'DMZ-Black', `${iface.get_string('color-scheme')} ${iface.get_string('icon-theme')} ${iface.get_string('cursor-theme')}`);
            } else {
                check('GNOME light/dark follows the wallpaper', iface.get_string('color-scheme') === (dark2 ? 'prefer-dark' : 'default'), iface.get_string('color-scheme'));
                check('Papirus follows light/dark too', iface.get_string('icon-theme') === (dark2 ? 'Papirus-Dark' : 'Papirus-Light'), iface.get_string('icon-theme'));
                check('the cursor follows light/dark too', iface.get_string('cursor-theme') === (dark2 ? 'DMZ-White' : 'DMZ-Black'), iface.get_string('cursor-theme'));
            }
            const mist2 = read(`${cfg}/gtk-4.0/mist.css`);
            check('the GTK colours changed with the wallpaper hue', mist2 !== mist1 && mist2.includes('@define-color window_bg_color'));
            await sleep(1500);
            await screenshot('app-open-after');   // the same window, still open: does it follow live?
            GLib.spawn_command_line_async('gnome-text-editor --new-window');
            await sleep(6000);
            await screenshot('app2');
            await screenshot('desktop2');
            quick.menu.open();
            await sleep(1200);
            await screenshot('quick2');
            quick.menu.close();
        }

        // switching Isobar off gives the dock back as it was; switching it on again takes it over again
        // the preferences switches take effect at once
        const prefs = Main.extensionManager.lookup(UUID).stateObj.getSettings();
        const cfgDir = GLib.get_user_config_dir();
        prefs.set_boolean('style-apps', false);
        await sleep(1500);
        check('turning off "Style GNOME apps" removes the colour files and the imports (GTK4 and GTK3)', !GLib.file_test(`${cfgDir}/gtk-4.0/mist.css`, GLib.FileTest.EXISTS) && !read(`${cfgDir}/gtk-4.0/gtk.css`).includes('mist.css') && !GLib.file_test(`${cfgDir}/gtk-3.0/mist.css`, GLib.FileTest.EXISTS) && !read(`${cfgDir}/gtk-3.0/gtk.css`).includes('mist.css'));
        prefs.set_boolean('style-apps', true);
        await sleep(1500);
        check('turning it on writes them again', read(`${cfgDir}/gtk-4.0/mist.css`).includes('@define-color window_bg_color') && read(`${cfgDir}/gtk-3.0/mist.css`).includes('titlebutton'));
        prefs.set_boolean('terminal-accent', !prefs.get_boolean('terminal-accent'));
        await sleep(1000);
        check('the accent switch writes or removes the shared colour file', GLib.file_test(`${GLib.get_user_cache_dir()}/isobar/accent`, GLib.FileTest.EXISTS) === prefs.get_boolean('terminal-accent'));

        if (GLib.getenv('MIST_PREFS')) {
            GLib.spawn_command_line_async(`gnome-extensions prefs ${UUID}`);
            await sleep(7000);
            await screenshot('prefs');
        }

        if (!GLib.getenv('MIST_DOCK_JSON') && !EGO) {
            const savedPath = `${GLib.get_user_cache_dir()}/isobar/dock-previous.json`;
            const saved = JSON.parse(new TextDecoder().decode(GLib.file_get_contents(savedPath)[1]));
            check('the dock\'s old settings were remembered', 'dock-position' in saved, JSON.stringify(saved).slice(0, 90));
            Main.extensionManager.disableExtension(UUID);
            await sleep(1500);
            check('disabling Isobar restores the dock', dockSettings.get_string('dock-position') === saved['dock-position'], dockSettings.get_string('dock-position'));
            check('and clears the memory file', !GLib.file_test(savedPath, GLib.FileTest.EXISTS));
            Main.extensionManager.enableExtension(UUID);
            await sleep(2500);
            check('enabling it again takes the dock back', dockSettings.get_string('dock-position') === 'BOTTOM', dockSettings.get_string('dock-position'));
        }
    }
}
