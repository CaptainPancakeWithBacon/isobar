// Test only: what the bar looks like when the screen locks. Locking switches the shell to the unlock-dialog session mode, which
// turns off every extension that does not list it in session-modes and restyles the panel. Headless lock screens render black,
// so this reads the state (extensions, style classes, colours) instead of the pixels.
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import Shell from 'gi://Shell';

import {Extension} from 'resource:///org/gnome/shell/extensions/extension.js';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';

const OUT = GLib.getenv('MIST_OUT');
const UUIDS = (GLib.getenv('MIST_WATCH') ?? `${GLib.getenv('MIST_EXT_UUID') ?? 'mist@gijs.dev'}`).split(' ');
const sleep = ms => new Promise(resolve => GLib.timeout_add(GLib.PRIORITY_DEFAULT, ms, () => { resolve(); return GLib.SOURCE_REMOVE; }));
const log = line => {
    const stream = Gio.File.new_for_path(`${OUT}/driver.log`).append_to(Gio.FileCreateFlags.NONE, null);
    stream.write_all(new TextEncoder().encode(`${line}\n`), null);
    stream.close(null);
};
const screenshot = name => new Promise(resolve => {
    const stream = Gio.File.new_for_path(`${OUT}/${name}.png`).replace(null, false, Gio.FileCreateFlags.NONE, null);
    new Shell.Screenshot().screenshot(false, stream, (shot, res) => {
        try { shot.screenshot_finish(res); } catch (e) { log(`screenshot ${name}: FAIL ${e.message}`); }
        stream.close(null);
        resolve();
    });
});
const rgba = c => `rgba(${c.red},${c.green},${c.blue},${(c.alpha / 255).toFixed(2)})`;

// every panel-like actor in the layout chrome (the primary bar, plus the ones Multi Monitor Bar adds)
function panels() {
    const out = [];
    const walk = (a, depth) => {
        if (depth > 6) return;
        if (a.name === 'panel' || a.name === 'panelBox' || a.has_style_class_name?.('multimonitor-panel') || a.constructor.name.includes('MultiMonitorsPanel'))
            out.push(a);
        a.get_children?.().forEach(c => walk(c, depth + 1));
    };
    Main.layoutManager.uiGroup.get_children().forEach(c => walk(c, 0));
    return out;
}

const check = (label, ok, detail = '') => log(`${ok ? 'ok  ' : 'FAIL'} ${label}${detail ? ': ' + detail : ''}`);
const alphaOf = a => a.get_theme_node().get_background_color().alpha;
const find = (root, cls) => { const out = []; const walk = a => { if (a.has_style_class_name?.(cls)) out.push(a); a.get_children?.().forEach(walk); }; walk(root); return out; };

function report(tag) {
    const mgr = Main.extensionManager;
    log(`--- ${tag}: mode=${Main.sessionMode.currentMode}, monitors=${Main.layoutManager.monitors.length}, primary=${Main.layoutManager.primaryIndex}`);
    for (const uuid of UUIDS) {
        const e = mgr.lookup(uuid);
        log(`    ext ${uuid}: state=${e ? e.state : 'missing'} (1 = enabled)`);
    }
    for (const a of panels()) {
        let bg = '', cls = '';
        try { bg = rgba(a.get_theme_node().get_background_color()); cls = a.get_style_class_name?.() ?? ''; } catch (e) { bg = '?'; }
        const r = a.get_transformed_position?.() ?? [0, 0];
        log(`    ${a.name || a.constructor.name} at ${Math.round(r[0])},${Math.round(r[1])} ${Math.round(a.width)}x${Math.round(a.height)} visible=${a.visible} classes="${cls}" bg=${bg} pseudo="${a.get_style_pseudo_class?.() ?? ''}"`);
    }
}

export default class LockDriver extends Extension {
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
        await sleep(3000);
        report('unlocked');
        await screenshot('unlocked');
        Main.sessionMode.pushMode('unlock-dialog');   // what ScreenShield does when you press Super+S
        await sleep(2500);
        report('locked');
        await screenshot('locked');
        const ext = Main.extensionManager.lookup(GLib.getenv('MIST_EXT_UUID') ?? 'mist@gijs.dev');
        check('Isobar stays enabled while locked', ext?.state === 1, `state ${ext?.state}`);
        const solid = panels().filter(a => a.name === 'panel' && a.get_theme_node && alphaOf(a) > 0);
        check('no bar turns solid on the lock screen', solid.length === 0, `${solid.length} solid`);
        check('the lock screen bar shows no clock, dots or app name', find(Main.panel, 'mist-clock').every(a => !a.mapped));
        Main.sessionMode.popMode('unlock-dialog');
        await sleep(2500);
        report('unlocked again');
        check('Activities and the date menu are hidden again after unlocking', !Main.panel.statusArea.activities.container.visible && !Main.panel.statusArea.dateMenu.container.visible);
        check('the clock is back in the bar', find(Main.panel, 'mist-clock').some(a => a.mapped));
        const solidAgain = panels().filter(a => a.name === 'panel' && alphaOf(a) > 0);
        check('every bar is transparent again', solidAgain.length === 0, `${solidAgain.length} solid`);
    }
}
