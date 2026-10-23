// Test only: loads the shell theme named in ISOBAR_THEME_FILE in a throwaway shell, as the User Themes extension would,
// then checks colours and takes screenshots. Everything is written to ISOBAR_DRIVER_OUT.
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import Shell from 'gi://Shell';
import St from 'gi://St';

import {Extension} from 'resource:///org/gnome/shell/extensions/extension.js';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';

const OUT = GLib.getenv('ISOBAR_DRIVER_OUT');
const t0 = GLib.get_monotonic_time();
const sleep = ms => new Promise(resolve => GLib.timeout_add(GLib.PRIORITY_DEFAULT, ms, () => { resolve(); return GLib.SOURCE_REMOVE; }));
const stamp = () => `[${((GLib.get_monotonic_time() - t0) / 1e6).toFixed(1)}s]`;
const log = line => {
    const file = Gio.File.new_for_path(`${OUT}/driver.log`);
    const stream = file.append_to(Gio.FileCreateFlags.NONE, null);
    stream.write_all(new TextEncoder().encode(`${stamp()} ${line}\n`), null);
    stream.close(null);
};
const screenshot = name => new Promise(resolve => {
    const stream = Gio.File.new_for_path(`${OUT}/${name}.png`).replace(null, false, Gio.FileCreateFlags.NONE, null);
    new Shell.Screenshot().screenshot(false, stream, (shot, res) => {
        try {
            shot.screenshot_finish(res);
            log(`screenshot ${name}: ok`);
        } catch (e) {
            log(`screenshot ${name}: FAIL ${e.message}`);
        }
        stream.close(null);
        resolve();
    });
});
const hex = c => '#' + [c.red, c.green, c.blue].map(v => v.toString(16).padStart(2, '0')).join('');
const bg = actor => hex(actor.get_theme_node().get_background_color());
const fg = actor => hex(actor.get_theme_node().get_foreground_color());
const expect = (label, actual, wanted) => log(`${actual === wanted ? 'ok  ' : 'FAIL'} ${label}: ${actual}${actual === wanted ? '' : ` (wanted ${wanted})`}`);

export default class ThemeDriver extends Extension {
    enable() {
        log('theme driver enable() called');
        if (this._started)
            return;
        this._started = true;
        this._run().catch(e => log(`FAIL driver crashed: ${e.message}\n${e.stack}`)).finally(() => {
            GLib.file_set_contents(`${OUT}/done`, 'done');
        });
    }

    disable() {
        log('theme driver disable() called');
    }

    async _run() {
        while (Main.layoutManager._startingUp)
            await sleep(500);
        await sleep(2500);
        log(`GNOME Shell ${Config.PACKAGE_VERSION}`);
        const file = GLib.getenv('ISOBAR_THEME_FILE');
        Main.setThemeStylesheet(file);
        Main.loadTheme();
        await sleep(1500);
        log(`theme loaded from ${file}`);
        const p = JSON.parse(GLib.getenv('ISOBAR_THEME_PALETTE'));
        const lower = Object.fromEntries(Object.entries(p).map(([k, v]) => [k, v.toLowerCase()]));
        const find = (cls, root = Main.layoutManager.uiGroup) => {
            if (root.has_style_class_name?.(cls))
                return root;
            for (const child of root.get_children()) {
                const hit = find(cls, child);
                if (hit)
                    return hit;
            }
            return null;
        };
        const colour = (actor, prop) => { const [ok, c] = actor.get_theme_node().lookup_color(prop, false); return ok ? hex(c) : 'none'; };
        const check = (label, actor, what, wanted) => expect(label, actor ? what(actor) : 'missing', wanted);

        check('the bar is ink', Main.panel, bg, lower.ink);
        check('bar text is paper', Main.panel.statusArea.dateMenu._clockDisplay, fg, lower.paper);
        await screenshot('01-desktop');

        // quick settings
        const qs = Main.panel.statusArea.quickSettings;
        qs.menu.open();
        await sleep(1200);
        check('quick settings are ink', find('quick-settings'), bg, lower.ink);
        const toggles = [];
        const collect = a => { if (a.has_style_class_name?.('quick-toggle')) toggles.push(a); a.get_children().forEach(collect); };
        collect(find('quick-settings'));
        const checked = toggles.find(t => t.checked);
        // an unchecked toggle the pointer and the keyboard focus are not on, or its colour would be the hover colour
        const plain = toggles.find(t => !t.checked && !t.hover && !t.has_key_focus());
        check('a checked toggle is paper', checked, bg, lower.paper);
        check('with ink text', checked, fg, lower.ink);
        check('an unchecked toggle is track', plain, bg, lower.track);
        check('with paper text', plain, fg, lower.paper);
        check('the slider is paper where it is filled', find('slider'), a => colour(a, '-barlevel-active-background-color'), lower.paper);
        await screenshot('02-quick-settings');
        qs.menu.close();
        await sleep(600);

        // date menu with calendar and the message list
        const dm = Main.panel.statusArea.dateMenu;
        dm.menu.open();
        await sleep(1500);
        check('today in the calendar is paper', find('calendar-today'), bg, lower.paper);
        check('with ink text', find('calendar-today'), fg, lower.ink);
        check('other days have no background of their own', find('calendar-day'), bg, '#00000000'.slice(0, 7));
        await screenshot('03-date-menu');
        dm.menu.close();
        await sleep(600);

        // a notification banner
        await new Promise(resolve => Gio.Subprocess.new(['notify-send', '-a', 'Mail', 'New message', 'From Anna: are we still on for tonight?'],
            Gio.SubprocessFlags.NONE).wait_async(null, () => resolve()));
        await sleep(1500);
        check('a banner is track', find('notification-banner'), bg, lower.track);
        check('banner text is paper', find('message-title'), fg, lower.paper);
        await screenshot('04-banner');
        await sleep(6000);

        // the overview, the app grid, a search
        Main.overview.show();
        await sleep(1800);
        check('the overview is ink', Main.layoutManager.overviewGroup, bg, lower.ink);
        check('the search entry is track', Main.overview.searchEntry, bg, lower.track);
        await screenshot('05-overview');
        Main.overview.dash.showAppsButton.checked = true;
        await sleep(1800);
        await screenshot('06-appgrid');
        Main.overview.dash.showAppsButton.checked = false;
        await sleep(1000);
        Main.overview.searchEntry.set_text('files');
        await sleep(2500);
        await screenshot('07-search');
        Main.overview.searchEntry.set_text('');
        Main.overview.hide();
        await sleep(1200);

        // the Ubuntu Dock, when it is enabled: its icons sit on the bar itself, with no box of their own, however they are hovered or focused
        const dock = Main.layoutManager.uiGroup.get_children().find(a => a.name === 'dashtodockContainer');
        if (dock) {
            const tiles = [];
            const gather = a => { if (a.has_style_class_name?.('overview-tile')) tiles.push(a); a.get_children().forEach(gather); };
            gather(dock);
            const tile = tiles[0];
            expect('the dock has icons to look at', String(!!tile), 'true');
            if (tile) {
                for (const state of ['', 'hover', 'focus', 'focus hover']) {
                    ['hover', 'focus'].forEach(c => tile.remove_style_pseudo_class(c));
                    state.split(' ').filter(Boolean).forEach(c => tile.add_style_pseudo_class(c));
                    expect(`a dock icon (${state || 'resting'}) paints no box of its own`, String(tile.get_theme_node().get_background_color().alpha), '0');
                }
                ['hover', 'focus'].forEach(c => tile.remove_style_pseudo_class(c));
            }
        }

        // the volume pop-up (its window is not shown in a headless shell, so its colours are read, not photographed)
        Main.osdWindowManager.show(Gio.ThemedIcon.new('audio-volume-medium-symbolic'), 'Volume', 0.6, 1, -1);
        await sleep(300);
        check('the volume pop-up is ink', find('osd-window'), bg, lower.ink);
        await screenshot('08-osd');
        log('walked through every surface');
    }
}

import * as Config from 'resource:///org/gnome/shell/misc/config.js';
