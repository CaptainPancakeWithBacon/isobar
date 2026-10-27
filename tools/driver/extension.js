// Test only. Checks what Mist did in a throwaway shell and takes screenshots into MIST_OUT.
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import Shell from 'gi://Shell';
import St from 'gi://St';

import {Extension} from 'resource:///org/gnome/shell/extensions/extension.js';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as Config from 'resource:///org/gnome/shell/misc/config.js';

const OUT = GLib.getenv('MIST_OUT');
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

        const ctx = () => ({
            bar: bgOf(panel), text: fgOf(clocks[0]),
            card: hex(bgOf(quick.menu.box)), cardText: fgOf(quick.menu.box),
        });
        const ifaceStart = new Gio.Settings({schema_id: 'org.gnome.desktop.interface'}).get_string('color-scheme');
        log(`scheme at start ${ifaceStart}`);
        const a = ctx();
        log(`state ${JSON.stringify(a)}`);
        check('the bar has no background of its own on a clear wallpaper', a.bar.alpha === 0, `alpha ${a.bar.alpha}`);
        const dark = lum(a.card) < 0.2;
        log(`card is ${dark ? 'dark' : 'light'}`);
        check('card text reads on the card', Math.abs(lum(a.card) - lum(a.cardText)) > 0.5);

        await screenshot('desktop');
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
            check('GNOME light/dark follows the wallpaper', iface.get_string('color-scheme') === (lum(b.card) < 0.2 ? 'prefer-dark' : 'default'), iface.get_string('color-scheme'));
            await screenshot('desktop2');
            quick.menu.open();
            await sleep(1200);
            await screenshot('quick2');
            quick.menu.close();
        }
    }
}
