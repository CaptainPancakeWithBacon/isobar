// Test only: loaded by tools/nested.sh --drive, never shipped.
import Clutter from 'gi://Clutter';
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import Shell from 'gi://Shell';
import St from 'gi://St';

import {Extension} from 'resource:///org/gnome/shell/extensions/extension.js';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';

const OUT = GLib.getenv('ISOBAR_DRIVER_OUT');

function write(name, text, append = true) {
    const file = Gio.File.new_for_path(`${OUT}/${name}`);
    const stream = append
        ? file.append_to(Gio.FileCreateFlags.NONE, null)
        : file.replace(null, false, Gio.FileCreateFlags.NONE, null);
    stream.write_all(text, null);
    stream.close(null);
}

const log = line => write('driver.log', `${line}\n`);
const sleep = ms => new Promise(resolve => GLib.timeout_add(GLib.PRIORITY_DEFAULT, ms, () => {
    resolve();
    return GLib.SOURCE_REMOVE;
}));

function* descendants(actor) {
    yield actor;
    for (const child of actor.get_children())
        yield* descendants(child);
}
const all = () => [...descendants(Main.layoutManager.uiGroup)];
const pills = () => all().filter(a => (a.accessible_name ?? '').startsWith('Workspace '));
const meta = () => all().find(a => a.has_style_class_name?.('isobar-meta'));

function screenshot(name) {
    return new Promise(resolve => {
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
}

export default class Driver extends Extension {
    enable() {
        this._device = Clutter.get_default_backend().get_default_seat()
            .create_virtual_device(Clutter.InputDeviceType.POINTER_DEVICE);
        this._run().catch(e => log(`FAIL driver crashed: ${e.message}`)).finally(() => write('done', 'done', false));
    }

    disable() {
        this._device = null;
    }

    // The nested window sits at an offset on the host, so the virtual device's
    // coordinates are shifted. Probe once and compensate.
    async _calibrate() {
        const move = async (x, y) => {
            this._device.notify_absolute_motion(GLib.get_monotonic_time(), x, y);
            await sleep(300);
            return global.get_pointer();
        };
        // accept an offset only when two different moves agree on it
        for (let attempt = 0; attempt < 8; attempt++) {
            const a = await move(600 + attempt, 300);
            const b = await move(700 + attempt, 350);
            const offA = [600 + attempt - a[0], 300 - a[1]];
            const offB = [700 + attempt - b[0], 350 - b[1]];
            if (offA[0] === offB[0] && offA[1] === offB[1]) {
                this._off = offA;
                log(`pointer offset: ${JSON.stringify(this._off)}`);
                return;
            }
            log(`calibration attempt ${attempt} disagreed: ${JSON.stringify(offA)} vs ${JSON.stringify(offB)}`);
        }
        log('FAIL could not calibrate the pointer offset');
        throw new Error('no pointer calibration');
    }

    // Host input can move the pointer under us (the nested window is on a real screen),
    // so aim, verify the pointer, press and release, and retry if the no click registered.
    async _click(actor) {
        if (!this._off)
            await this._calibrate();
        for (let attempt = 0; attempt < 6; attempt++) {
            const [x, y] = actor.get_transformed_position();
            const [w, h] = actor.get_transformed_size();
            const tx = x + w / 2, ty = y + h / 2;
            const seen = [];
            const ids = ['button-press-event', 'clicked'].map(s => actor.connect(s, () => {
                seen.push(s);
                return Clutter.EVENT_PROPAGATE;
            }));
            this._device.notify_absolute_motion(GLib.get_monotonic_time(), tx + this._off[0], ty + this._off[1]);
            await sleep(200);
            const [px, py] = global.get_pointer();
            if (Math.abs(px - tx) > 2 || Math.abs(py - ty) > 2) {
                log(`click attempt ${attempt}: pointer is at ${px},${py}, wanted ${Math.round(tx)},${Math.round(ty)}; retrying`);
                ids.forEach(id => actor.disconnect(id));
                continue;
            }
            this._device.notify_button(GLib.get_monotonic_time(), Clutter.BUTTON_PRIMARY, Clutter.ButtonState.PRESSED);
            await sleep(30);
            this._device.notify_button(GLib.get_monotonic_time(), Clutter.BUTTON_PRIMARY, Clutter.ButtonState.RELEASED);
            await sleep(120);  // the click is dispatched in the main loop, not synchronously
            ids.forEach(id => actor.disconnect(id));
            if (seen.includes('clicked')) {
                log(`clicked ${actor.accessible_name ?? actor.style_class}`);
                return;
            }
            log(`click attempt ${attempt}: no click registered (${JSON.stringify(seen)}); retrying`);
        }
        log(`FAIL could not click ${actor.accessible_name ?? actor.style_class}`);
    }

    async _run() {
        await sleep(4000);
        const widths = () => pills().map(p => Math.round(p.get_width()));  // [workspace 1, workspace 2]
        log(`pills at rest: ${JSON.stringify(widths())}`);
        await screenshot('01-start');

        // switch to workspace 2 and watch the widths over time; the loop starts before the click
        const samples = [];
        const sampler = (async () => {
            for (let i = 0; i < 40; i++) {
                samples.push(widths());
                await sleep(30);
            }
        })();
        // the pill must start a width transition as soon as the workspace changes
        const wm = global.workspace_manager;
        let duration = null;
        const wsId = wm.connect_after('active-workspace-changed', () => {
            const transition = pills()[0].get_child().get_transition('width');
            duration = transition ? transition.get_duration() : null;
        });
        await this._click(pills()[1]);
        await sampler;
        wm.disconnect(wsId);
        log(`width transition started with duration: ${duration}`);
        log(`widths around clicking workspace 2: ${JSON.stringify(samples)}`);
        const active = global.workspace_manager.get_active_workspace_index();
        log(`active workspace index: ${active}`);
        if (active !== 1)
            log('FAIL clicking workspace 2 did not switch workspace');
        else if (duration === null)
            log('FAIL pill width did not animate');
        await sleep(500);
        await screenshot('02-workspace-2');

        // open quick settings from the date and battery button
        await this._click(meta());
        await sleep(700);
        const open = Main.panel.statusArea.quickSettings.menu.isOpen;
        log(`quick settings open: ${open}`);
        if (!open)
            log('FAIL clicking date and battery did not open quick settings');
        await screenshot('03-quick-settings');
        this._checkStyle();
    }

    // Isobar colours: ink menu, paper accent, no orange, and no second battery icon
    _checkStyle() {
        const INK = '#0f2f33', PAPER = '#eaf4f0', TRACK = '#1f4a4f';
        const qs = Main.panel.statusArea.quickSettings;
        const hex = c => '#' + [c.red, c.green, c.blue].map(v => v.toString(16).padStart(2, '0')).join('');
        const bg = a => hex(a.get_theme_node().get_background_color());
        const fg = a => hex(a.get_theme_node().get_foreground_color());
        const expect = (label, actual, wanted) => log(`${actual === wanted ? 'ok  ' : 'FAIL'} ${label}: ${actual}${actual === wanted ? '' : ` (wanted ${wanted})`}`);
        const within = root => [...descendants(root)];
        const has = (a, c) => a.has_style_class_name?.(c);

        const [mx, my] = qs.menu.box.get_transformed_position();
        const [mw, mh] = qs.menu.box.get_transformed_size();
        log(`menu box: ${JSON.stringify([mx, my, mw, mh].map(Math.round))}`);
        expect('menu background', bg(qs.menu.box), INK);

        const toggles = within(qs.menu.box).filter(a => has(a, 'quick-toggle') && has(a, 'button') && a.visible);
        const on = toggles.find(a => a.checked);
        const off = toggles.find(a => !a.checked);
        const title = a => within(a).find(x => has(x, 'quick-toggle-title'));
        expect('checked toggle background', on ? bg(on) : 'none found', PAPER);
        expect('checked toggle text', on ? fg(title(on)) : 'none found', INK);
        expect('unchecked toggle background', off ? bg(off) : 'none found', TRACK);
        expect('unchecked toggle text', off ? fg(title(off)) : 'none found', PAPER);

        const arrow = within(qs.menu.box).find(a => has(a, 'quick-toggle-arrow') && a.checked);
        expect('checked toggle arrow background', arrow ? bg(arrow) : 'none found', PAPER);
        // Yaru draws an orange divider on the arrow's left edge; Isobar has none
        expect('checked arrow divider width', arrow ? String(arrow.get_theme_node().get_border_width(St.Side.LEFT)) : 'none found', '0');

        const iconButton = within(qs.menu.box).find(a => has(a, 'icon-button') && !has(a, 'flat') && !has(a, 'quick-toggle-arrow') && a.visible);
        expect('icon button background', iconButton ? bg(iconButton) : 'none found', TRACK);

        const slider = within(qs.menu.box).find(a => has(a, 'slider') && !has(a, 'quick-slider'));
        const active = slider ? slider.get_theme_node().lookup_color('-barlevel-active-background-color', false) : null;
        expect('slider fill', active && active[0] ? hex(active[1]) : 'none found', PAPER);

        const batteryIcons = within(qs).filter(a => (a.icon_name ?? '').startsWith('battery') && a.visible);
        expect('battery icons visible in the bar', String(batteryIcons.length), '0');
    }
}
