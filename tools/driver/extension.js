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

const T0 = GLib.get_monotonic_time();
const log = line => write('driver.log', `[${((GLib.get_monotonic_time() - T0) / 1e6).toFixed(1).padStart(6)}s] ${line}\n`);
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
        log('driver enable() called');
        this._device ??= Clutter.get_default_backend().get_default_seat()
            .create_virtual_device(Clutter.InputDeviceType.POINTER_DEVICE);
        if (this._started)
            return;
        this._started = true;
        this._run().catch(e => log(`FAIL driver crashed: ${e.message}`)).finally(() => write('done', 'done', false));
    }

    disable() {
        log('driver disable() called');
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
        if (GLib.getenv('ISOBAR_BENCH'))
            return this._bench();
        await sleep(4000);
        Main.overview.hide();
        await sleep(1200);
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
        await this._checkTerrain();
        await this._checkFocus();
        await this._checkPersistence();
        await this._checkEfficiency();
        await this._checkIdleRates();
    }

    // The live terrain is the desktop background. It must exist, tick, and stay cheap.
    async _checkTerrain() {
        Main.panel.statusArea.quickSettings.menu.close();
        await sleep(800);
        const terrain = Main.extensionManager.lookup('isobar@gijs.dev')?.stateObj?._terrain;
        const expect = (label, actual, wanted) => log(`${actual === wanted ? 'ok  ' : 'FAIL'} ${label}: ${actual}${actual === wanted ? '' : ` (wanted ${wanted})`}`);
        expect('terrain renderer', terrain?.renderer ?? 'none', 'shader');
        expect('terrain layers (one per monitor)', String(terrain?.layers.length ?? 0), String(Main.layoutManager.monitors.length));
        const layer = terrain?.layers[0];
        expect('terrain sits in the background group', String(!!layer && Main.layoutManager._backgroundGroup.get_children().includes(layer.actor)), 'true');
        const mon = Main.layoutManager.primaryMonitor;
        expect('terrain covers the monitor', layer ? `${layer.actor.width}x${layer.actor.height}` : 'none', `${mon.width}x${mon.height}`);
        if (!layer)
            return;
        await screenshot('04-desktop');
        await sleep(3000);
        const s = terrain.stats();
        log(`terrain cost per frame: avg ${s.avgMs.toFixed(2)} ms, p95 ${s.p95Ms.toFixed(2)} ms, max ${s.maxMs.toFixed(2)} ms over ${s.frames} frames (sampling ${s.computeAvgMs.toFixed(2)} ms, trace and draw ${s.paintAvgMs.toFixed(2)} ms)`);
        expect('terrain is ticking', String(s.frames > 20), 'true');
        expect('terrain frame cost under budget (avg < 10 ms)', String(s.avgMs < 10), 'true');

        // freeze the terrain at a known moment so the screenshot can be compared with the JS maths
        terrain.pause(123456);
        await sleep(1200);
        await screenshot('05-golden');
        log(`golden: ${JSON.stringify({now: 123456, seed: terrain.seed, calm: terrain.calm, w: mon.width, h: mon.height})}`);
        terrain.resume();
    }

    // Focus is a quick settings toggle that calms the terrain
    async _checkFocus() {
        const terrain = Main.extensionManager.lookup('isobar@gijs.dev')?.stateObj?._terrain;
        const qs = Main.panel.statusArea.quickSettings;
        const expect = (label, actual, wanted) => log(`${actual === wanted ? 'ok  ' : 'FAIL'} ${label}: ${actual}${actual === wanted ? '' : ` (wanted ${wanted})`}`);
        await this._click(meta());
        await sleep(800);
        const toggle = [...descendants(qs.menu.box)].find(a => a.title === 'Focus' && a.has_style_class_name?.('quick-toggle'));
        expect('focus toggle is in quick settings', String(!!toggle), 'true');
        if (!toggle)
            return;
        expect('focus starts off', String(toggle.checked), 'false');
        expect('terrain starts at full strength', String(terrain.calm > 0.95), 'true');
        await this._click(toggle);
        await sleep(2000);
        expect('focus is on after a click', String(toggle.checked), 'true');
        expect('terrain calms down while focus is on', String(terrain.calm < 0.4), 'true');
        await screenshot('06-focus');
        await this._click(toggle);
        await sleep(2000);
        expect('focus is off after a second click', String(toggle.checked), 'false');
        expect('terrain is back at full strength', String(terrain.calm > 0.95), 'true');
    }

    // Focus is kept in GSettings, so it survives turning the extension off and on
    async _checkPersistence() {
        const uuid = 'isobar@gijs.dev';
        const ext = () => Main.extensionManager.lookup(uuid).stateObj;
        const qs = Main.panel.statusArea.quickSettings;
        const toggle = () => [...descendants(qs.menu.box)].find(a => a.title === 'Focus' && a.has_style_class_name?.('quick-toggle'));
        const expect = (label, actual, wanted) => log(`${actual === wanted ? 'ok  ' : 'FAIL'} ${label}: ${actual}${actual === wanted ? '' : ` (wanted ${wanted})`}`);
        const settings = ext().getSettings();
        expect('focus setting starts off', String(settings.get_boolean('focus')), 'false');

        await this._click(meta());
        await sleep(800);
        await this._click(toggle());
        await sleep(600);
        expect('switching focus on writes the setting', String(settings.get_boolean('focus')), 'true');
        qs.menu.close();
        await sleep(400);

        Main.extensionManager.disableExtension(uuid);
        await sleep(1200);
        expect('the toggle is gone while the extension is off', String(!!toggle()), 'false');
        Main.extensionManager.enableExtension(uuid);
        await sleep(300);
        // 300 ms is too short for the terrain to ease down, so this only passes if it starts calm
        expect('the terrain shows the current workspace after turning the extension back on', String(ext()._terrain._seedTarget[0] > 1), 'true');
        expect('the terrain starts calm after turning the extension back on', String(ext()._terrain.calm < 0.4), 'true');
        await this._click(meta());
        await sleep(800);
        expect('the focus toggle comes back switched on', String(toggle()?.checked), 'true');

        // changing the setting from outside moves the toggle
        settings.set_boolean('focus', false);
        await sleep(300);
        expect('the toggle follows a change of the setting', String(toggle()?.checked), 'false');
        await sleep(1800);
        expect('the terrain follows it back to full strength', String(ext()._terrain.calm > 0.95), 'true');
        qs.menu.close();
        await sleep(300);
    }

    // The terrain should rest when nothing moves and hide when a window covers it
    async _checkEfficiency() {
        const terrain = () => Main.extensionManager.lookup('isobar@gijs.dev').stateObj._terrain;
        const layer = () => terrain().layers[0];
        const expect = (label, actual, wanted) => log(`${actual === wanted ? 'ok  ' : 'FAIL'} ${label}: ${actual}${actual === wanted ? '' : ` (wanted ${wanted})`}`);
        const rate = async ms => {
            const f0 = layer().frames;
            await sleep(ms);
            return (layer().frames - f0) / (ms / 1000);
        };

        await sleep(2500);                       // let easing and old ripples die down
        const idle = await rate(3000);
        log(`idle redraw rate: ${idle.toFixed(1)} fps`);
        expect('idle terrain redraws at about 10 fps', String(idle >= 7 && idle <= 14), 'true');
        terrain().ripple(640, 400, 1.4);
        const busy = await rate(1000);
        log(`redraw rate with a ripple running: ${busy.toFixed(1)} fps`);
        expect('terrain redraws at about 30 fps while a ripple runs', String(busy >= 22), 'true');
        await sleep(3500);

        const open = async args => {
            const proc = Gio.Subprocess.new(['gjs', '-m', `${this.path}/window.js`, ...args], Gio.SubprocessFlags.NONE);
            await sleep(3500);
            return {proc, actor: global.get_window_actors().find(a => a.meta_window.title === 'isobar-test-window')};
        };
        const close = async ({proc, actor}) => {
            actor?.meta_window.delete(global.get_current_time());
            await sleep(1500);
            proc.force_exit();
        };

        expect('terrain is visible with no window', String(layer().actor.visible), 'true');
        const small = await open(['small']);
        expect('a small test window opened', String(!!small.actor), 'true');
        await sleep(1200);
        expect('a small window does not hide the terrain', String(layer().actor.visible), 'true');
        await close(small);

        const big = await open([]);
        expect('a maximized test window opened', String(!!big.actor), 'true');
        await sleep(1500);
        expect('a window covering the monitor hides the terrain', String(!layer().actor.visible), 'true');
        const f0 = layer().frames;
        await sleep(1500);
        expect('hidden terrain does no work', String(layer().frames - f0), '0');
        expect('the timer sleeps while a window covers the terrain', String(terrain().sleeping), 'true');
        await close(big);
        await sleep(1500);
        expect('the terrain comes back when the window closes', String(layer().actor.visible), 'true');
        expect('and the timer is running again', String(terrain().sleeping), 'false');
        expect('and it draws again', String(await rate(1500) > 5), 'true');
    }

    // The idle-fps setting sets how often the terrain redraws at rest, and 0 means never
    async _checkIdleRates() {
        const ext = () => Main.extensionManager.lookup('isobar@gijs.dev').stateObj;
        const settings = ext().getSettings();
        const layer = () => ext()._terrain.layers[0];
        const expect = (label, actual, wanted) => log(`${actual === wanted ? 'ok  ' : 'FAIL'} ${label}: ${actual}${actual === wanted ? '' : ` (wanted ${wanted})`}`);
        const rate = async ms => {
            const f0 = layer().frames;
            await sleep(ms);
            return (layer().frames - f0) / (ms / 1000);
        };

        await sleep(2500);
        for (const [fps, lo, hi] of [[30, 24, 31], [10, 8, 12], [5, 3.5, 6.5], [2, 1, 3], [0, 0, 0.001]]) {
            settings.set_int('idle-fps', fps);
            await sleep(1200);
            const measured = await rate(fps === 2 ? 5000 : 3000);
            log(`idle-fps ${fps}: ${measured.toFixed(1)} redraws per second`);
            expect(`idle-fps ${fps} redraws at about ${fps} per second`, String(measured >= lo && measured <= hi), 'true');
        }

        // at 0 the timer sleeps, and the clock stands still so the landscape does not jump when it wakes
        await sleep(3500);
        expect('the timer sleeps at idle-fps 0', String(ext()._terrain.sleeping), 'true');
        const c0 = ext()._terrain.clock;
        await sleep(3000);
        expect('the animation clock stands still while it sleeps', String(ext()._terrain.clock === c0), 'true');
        ext()._terrain.ripple(640, 400, 1.4);
        expect('a ripple wakes the timer', String(!ext()._terrain.sleeping), 'true');
        await sleep(400);
        const moved = ext()._terrain.clock - c0;
        log(`clock moved ${moved.toFixed(0)} ms after 3 s of sleep and a wake`);
        expect('the clock carries on from where it stopped', String(moved < 700), 'true');
        await sleep(4000);

        // at 0 a ripple still animates, and the terrain is still again afterwards
        ext()._terrain.ripple(640, 400, 1.4);
        const during = await rate(1500);
        log(`idle-fps 0 with a ripple: ${during.toFixed(1)} redraws per second`);
        expect('a ripple still animates at idle-fps 0', String(during > 20), 'true');
        await sleep(3500);
        expect('the terrain is still again after the ripple', String(await rate(1500)), '0');

        settings.set_int('idle-fps', 10);
    }

    // Cost per renderer at the same redraw rate: nothing, cairo, shader.
    async _bench() {
        await sleep(4000);
        Main.overview.hide();
        await sleep(1500);
        const terrain = Main.extensionManager.lookup('isobar@gijs.dev').stateObj._terrain;
        // CPU time of the whole shell process (all threads). With software GL the shader runs here too.
        const cpuTicks = () => {
            const stat = new TextDecoder().decode(GLib.file_get_contents('/proc/self/stat')[1]);
            const f = stat.slice(stat.lastIndexOf(')') + 2).split(' ');   // field 3 onwards
            return Number(f[11]) + Number(f[12]);                         // utime + stime
        };
        const maps = new TextDecoder().decode(GLib.file_get_contents('/proc/self/maps')[1]);
        log(`bench GL drivers loaded: ${['radeonsi', 'iris', 'nouveau', 'swrast', 'libLLVM', 'llvmpipe', 'zink'].filter(d => maps.includes(d)).join(', ') || 'none recognised'}`);
        const pct = (a, p) => a.slice().sort((x, y) => x - y)[Math.min(a.length - 1, Math.floor(a.length * p))];
        const avg = a => a.reduce((x, y) => x + y, 0) / (a.length || 1);
        for (const renderer of ['none', 'cairo', 'shader']) {
            terrain.setRenderer(renderer);
            await sleep(1500);
            const paints = [], stamps = [];
            let started = null;
            const b = global.stage.connect('before-paint', () => { started = GLib.get_monotonic_time(); });
            const a = global.stage.connect('after-paint', () => {
                if (started === null)
                    return;
                paints.push((GLib.get_monotonic_time() - started) / 1000);
                stamps.push(GLib.get_monotonic_time() / 1000);
                started = null;
            });
            // the baseline has no animation, so force the same redraw rate
            const force = renderer === 'none' ? GLib.timeout_add(GLib.PRIORITY_DEFAULT, 33, () => { global.stage.queue_redraw(); return GLib.SOURCE_CONTINUE; }) : 0;
            const cpu0 = cpuTicks();
            await sleep(5000);
            const cpu = (cpuTicks() - cpu0) / 100 / 5 * 100;   // % of one core
            global.stage.disconnect(b);
            global.stage.disconnect(a);
            if (force)
                GLib.source_remove(force);
            const gaps = stamps.slice(1).map((s, i) => s - stamps[i]);
            const js = terrain.stats();
            log(`bench ${renderer}: paint avg ${avg(paints).toFixed(2)} ms, p95 ${pct(paints, 0.95).toFixed(2)} ms; ${(1000 / avg(gaps)).toFixed(1)} fps, gap p95 ${pct(gaps, 0.95).toFixed(1)} ms; extension JS avg ${js.avgMs.toFixed(2)} ms; shell CPU ${cpu.toFixed(0)}% of one core`);
        }
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
