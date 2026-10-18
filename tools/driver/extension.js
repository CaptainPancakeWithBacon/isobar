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
    async _click(actor, success = 'clicked') {
        if (!this._off)
            await this._calibrate();
        for (let attempt = 0; attempt < 6; attempt++) {
            const [x, y] = actor.get_transformed_position();
            const [w, h] = actor.get_transformed_size();
            const tx = x + w / 2, ty = y + h / 2;
            const seen = [];
            const ids = [...new Set(['button-press-event', success ?? 'button-press-event'])].map(s => actor.connect(s, () => {
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
            if (success === null || seen.includes(success)) {   // null: the island stops the press itself, so nothing else can see it
                log(`clicked ${actor.accessible_name ?? actor.style_class}`);
                return;
            }
            log(`click attempt ${attempt}: no click registered (${JSON.stringify(seen)}); retrying`);
        }
        log(`FAIL could not click ${actor.accessible_name ?? actor.style_class}`);
    }

    async _run() {
        if (GLib.getenv('ISOBAR_ONLY') === 'island') {
            await sleep(5000);
            Main.overview.hide();
            await sleep(1200);
            return this._checkIsland();
        }
        if (GLib.getenv('ISOBAR_ONLY') === 'notifications') {
            await sleep(5000);
            Main.overview.hide();
            await sleep(1200);
            return this._checkNotifications();
        }
        if (GLib.getenv('ISOBAR_ONLY') === 'coucou') {
            while (Main.layoutManager._startingUp)
                await sleep(500);
            await sleep(3000);
            Main.overview.hide();
            await sleep(1200);
            return this._checkCoucou();
        }
        if (GLib.getenv('ISOBAR_ONLY') === 'demo') {
            await sleep(5000);
            Main.overview.hide();
            await sleep(1200);
            return this._demo();
        }
        if (GLib.getenv('ISOBAR_ONLY') === 'palette') {
            await sleep(5000);
            Main.overview.hide();
            await sleep(1200);
            return this._checkPalette();
        }
        if (GLib.getenv('ISOBAR_ONLY') === 'agents') {
            await sleep(5000);
            Main.overview.hide();
            await sleep(1200);
            return this._checkAgents();
        }
        if (GLib.getenv('ISOBAR_ONLY') === 'pointer') {
            await sleep(5000);
            Main.overview.hide();
            await sleep(1200);
            return this._checkIslandPointer();
        }
        if (GLib.getenv('ISOBAR_ONLY') === 'music') {
            await sleep(5000);
            Main.overview.hide();
            await sleep(1200);
            return this._checkMusic();
        }
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
        await this._checkIsland();
        await this._checkNotifications();
        await this._checkMusic();
        await this._checkIslandPointer();
        await this._checkAgents();
        await this._checkPalette();
        await this._checkCoucou();
    }

    // The live terrain is the desktop background. It must exist, tick, and stay cheap.
    async _checkTerrain() {
        Main.panel.statusArea.quickSettings.menu.close();
        await sleep(800);
        const terrain = Main.extensionManager.lookup('isobar@gijs.dev')?.stateObj?._terrain;
        const expect = (label, actual, wanted) => log(`${actual === wanted ? 'ok  ' : 'FAIL'} ${label}: ${actual}${actual === wanted ? '' : ` (wanted ${wanted})`}`);
        expect('terrain layers (one per monitor)', String(terrain?.layers.length ?? 0), String(Main.layoutManager.monitors.length));
        const layer = terrain?.layers[0];
        expect('terrain sits in the background group', String(!!layer && Main.layoutManager._backgroundGroup.get_children().includes(layer.actor)), 'true');
        const mon = Main.layoutManager.primaryMonitor;
        expect('terrain covers the monitor', layer ? `${layer.actor.width}x${layer.actor.height}` : 'none', `${mon.width}x${mon.height}`);
        if (!layer)
            return;
        await screenshot('04-desktop');
        await sleep(3000);
        const clock0 = terrain.clock;
        await sleep(3000);
        expect('terrain is ticking', String(terrain.clock > clock0), 'true');

        // freeze the terrain at a known moment so the screenshot can be compared with the JS maths
        terrain.pause(123456);
        await sleep(1200);
        await screenshot('05-golden');
        log(`golden: ${JSON.stringify({now: 123456, seed: terrain.seed, calm: terrain.calm, w: mon.width, h: mon.height})}`);
        // the same frozen moment with a summit, so the shader's summit is held against the JS maths too
        const peak = {x: 640, y: 380, amp: 1.6};
        terrain._peak = {...peak};
        terrain._peakTarget = {x: peak.x, y: peak.y};
        terrain._wake();
        await sleep(1200);
        await screenshot('05b-golden-peak');
        log(`golden-peak: ${JSON.stringify({now: 123456, seed: terrain.seed, calm: terrain.calm, w: mon.width, h: mon.height, peak})}`);
        terrain._peak = null;
        terrain._peakTarget = null;
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
        // GNOME may have dropped an empty workspace by now, so compare with the workspace that is current, not with a fixed one
        expect('the terrain shows the current workspace after turning the extension back on', String(ext()._terrain._seedTarget[0] > 1),
            String(global.workspace_manager.get_active_workspace_index() % 4 !== 0));
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

    // Call a method of the extension's D-Bus interface like any other client would.
    _gdbus(method, ...args) {
        const proc = Gio.Subprocess.new(['gdbus', 'call', '--session', '--dest', 'org.gnome.Shell',
            '--object-path', '/org/gnome/Shell/Extensions/Isobar', '--method', `org.gnome.Shell.Extensions.Isobar.${method}`,
            ...args.map(String)], Gio.SubprocessFlags.STDOUT_PIPE | Gio.SubprocessFlags.STDERR_MERGE);
        return new Promise(resolve => proc.communicate_utf8_async(null, null, (p, res) => {
            try {
                resolve(p.communicate_utf8_finish(res)[1].trim());
            } catch (e) {
                resolve(`ERROR ${e.message}`);
            }
        }));
    }

    // The island: a white pill under the bar that opens for events sent over D-Bus
    async _checkIsland() {
        const uuid = 'isobar@gijs.dev';
        const ext = () => Main.extensionManager.lookup(uuid).stateObj;
        const isl = () => ext()._island;
        const terrain = () => ext()._terrain;
        const mon = Main.layoutManager.primaryMonitor;
        const panel = Main.layoutManager.panelBox.height;
        const hex = c => '#' + [c.red, c.green, c.blue].map(v => v.toString(16).padStart(2, '0')).join('');
        const bg = a => hex(a.get_theme_node().get_background_color());
        const size = a => `${Math.round(a.width)}x${Math.round(a.height)}`;
        const expect = (label, actual, wanted) => log(`${actual === wanted ? 'ok  ' : 'FAIL'} ${label}: ${actual}${actual === wanted ? '' : ` (wanted ${wanted})`}`);

        await sleep(800);
        expect('the island exists', String(!!isl()), 'true');
        const a = isl()?.actor;
        if (!a)
            return;
        expect('the island rests as a 64x18 pill', size(a), '64x18');
        expect('the resting pill is paper white', bg(a), '#eaf4f0');
        expect('it hangs 8 px into the bar', String(Math.round(a.y)), String(mon.y + panel - 8));
        expect('it is centred on the monitor', String(Math.round(a.x + a.width / 2)), String(Math.round(mon.x + mon.width / 2)));
        expect('no timer runs while it rests', String(isl().timerArmed), 'false');
        await screenshot('07-island-rest');

        const out = await this._gdbus('Show', 'Build finished', 'isobar took 2m 14s', 'done', 3);
        log(`Show answered: ${out}`);
        expect('Show answers with an id over D-Bus', String(/^\(uint32 \d+,\)$/.test(out)), 'true');
        await sleep(900);
        expect('the island opens to 280x60', size(a), '280x60');
        expect('the open island is ink', `${bg(isl()._ink)} ${isl()._ink.opacity}`, '#0f2f33 255');
        expect('it shows the title', String(isl().shown?.title), 'Build finished');
        expect('a ripple of the strength for done leaves from it', String(terrain()._ripples.some(r => r.amp === 1.6)), 'true');
        await screenshot('07-island-open');
        await sleep(3200);
        expect('the island closes again', size(a), '64x18');
        expect('and is white again', `${bg(a)} ${isl()._ink.opacity}`, '#eaf4f0 0');
        expect('no timer runs once it is back at rest', String(isl().timerArmed), 'false');

        // opening is a movement, not a switch: wide first, then tall, and the colour fades in
        {
            // The headless shell runs animations about ten times too fast (a 2 s ease ends within 250 ms), so timing on screen is not measured here; the README animation is recorded in a nested shell, which keeps real time.
            // What is checked is what the island asks for, in the same tick as the event.
            const t = (actor, prop) => { const tr = actor.get_transition(prop); return tr ? `${tr.get_delay()}+${tr.get_duration()}` : 'none'; };
            isl().Show('Motion', '', 'info', 3);   // called directly: a gdbus process takes longer to answer than the first frames last
            expect('opening: the width starts at once and takes a moment', t(a, 'width'), '0+380');
            expect('opening: the height follows a little later and takes longer', t(a, 'height'), '140+520');
            expect('opening: the ink fades in instead of switching', t(isl()._ink, 'opacity'), '0+420');
            expect('opening: the text waits for the shape', t(isl()._title, 'opacity'), '420+220');
            await sleep(1200);
            expect('and when it has settled it is open and ink', `${size(a)} ${isl()._ink.opacity}`, '280x60 255');
            const {dismiss} = await import(`file://${GLib.getenv('ROOT')}/lib/island.js`);
            isl()._pointer(dismiss(isl()._state, GLib.get_monotonic_time() / 1000));   // what a click does
            expect('closing: the height goes first', t(a, 'height'), '0+260');
            expect('closing: the width follows', t(a, 'width'), '140+340');
            await sleep(900);
            expect('it closes again after the motion test', size(a), '64x18');
        }

        await this._gdbus('Show', 'x'.repeat(300), 'y'.repeat(300), 'info', 2);
        await sleep(300);
        expect('a very long title is cut', String(isl().shown.title.length <= 60), 'true');
        await sleep(2800);

        await this._gdbus('Show', 'calm', '', 'info', 6);
        await sleep(200);
        await this._gdbus('Show', 'Claude needs you', 'isobar', 'needs', 5);
        await sleep(300);
        expect('a more important event first lets the current one have its moment', String(isl().shown?.title), 'calm');
        await sleep(1500);
        expect('and then takes over', String(isl().shown?.title), 'Claude needs you');
        await sleep(5600);
        expect('the island rests when everything has been shown', String(isl().shown), 'null');

        Main.extensionManager.disableExtension(uuid);
        await sleep(1200);
        const gone = await this._gdbus('Show', 'x', '', 'info', 1);
        expect('the D-Bus object is gone while the extension is off', String(/Error/.test(gone)), 'true');
        const left = [];
        const walk = n => { if (n.has_style_class_name?.('isobar-island')) left.push(n); n.get_children().forEach(walk); };
        walk(Main.layoutManager.uiGroup);
        expect('no island actor is left behind', String(left.length), '0');
        Main.extensionManager.enableExtension(uuid);
        await sleep(1500);
        expect('the island comes back with the extension', String(!!ext()._island), 'true');
    }

    // A media player says it plays a song, over the MPRIS interface every player speaks
    async _checkMusic() {
        const uuid = 'isobar@gijs.dev';
        const isl = () => Main.extensionManager.lookup(uuid).stateObj._island;
        const expect = (label, actual, wanted) => log(`${actual === wanted ? 'ok  ' : 'FAIL'} ${label}: ${actual}${actual === wanted ? '' : ` (wanted ${wanted})`}`);
        const player = (status, title, artists = ['Kate Bush']) => new Promise(resolve => {
            const meta = title ? `, 'Metadata': <{'xesam:title': <'${title}'>, 'xesam:artist': <${JSON.stringify(artists).replace(/"/g, "'")}>}>` : '';
            const proc = Gio.Subprocess.new(['gdbus', 'emit', '--session', '--object-path', '/org/mpris/MediaPlayer2',
                '--signal', 'org.freedesktop.DBus.Properties.PropertiesChanged', 'org.mpris.MediaPlayer2.Player',
                `{'PlaybackStatus': <'${status}'>${meta}}`, '[]'], Gio.SubprocessFlags.STDERR_MERGE);
            proc.wait_async(null, () => resolve());
        });
        await sleep(800);
        await player('Playing', 'Cloudbusting');
        await sleep(900);
        expect('a song that starts opens the island with its title', String(isl().shown?.title), 'Cloudbusting');
        expect('and its artist', String(isl().shown?.subtitle), 'Kate Bush');
        await screenshot('09-island-music');
        await sleep(3500);
        expect('the island closes again', String(isl().shown), 'null');
        await player('Paused');
        await player('Playing');
        await sleep(900);
        expect('resuming the same song says nothing', String(isl().shown), 'null');
        await player('Playing', 'Running Up That Hill');
        await sleep(900);
        expect('the next song is announced', String(isl().shown?.title), 'Running Up That Hill');
        await sleep(3500);
        Main.extensionManager.disableExtension(uuid);
        await sleep(1000);
        await player('Playing', 'After off');
        await sleep(500);
        Main.extensionManager.enableExtension(uuid);
        await sleep(1500);
        expect('a song while Isobar is off is not heard, and nothing breaks', String(isl().shown), 'null');
    }

    // Coucou's island window appears: a summit builds under it and Isobar's own island steps aside; it closes: all comes back
    async _checkCoucou() {
        const uuid = 'isobar@gijs.dev';
        const ext = () => Main.extensionManager.lookup(uuid).stateObj;
        const expect = (label, actual, wanted) => log(`${actual === wanted ? 'ok  ' : 'FAIL'} ${label}: ${actual}${actual === wanted ? '' : ` (wanted ${wanted})`}`);
        const mon = Main.layoutManager.primaryMonitor;
        const fake = () => global.display.list_all_windows().find(w => w.get_title() === 'isobar-fake-coucou');
        const proc = Gio.Subprocess.new(['gjs', '-m', `${this.path}/window.js`, 'small', 'coucou'], Gio.SubprocessFlags.NONE);
        let win = null;
        for (let i = 0; i < 160 && !(win = fake()); i++)
            await sleep(250);
        expect('a window of class coucou exists', String(!!win), 'true');
        if (!win) {
            proc.force_exit();
            return;
        }
        const width = 280, height = 120;   // the real one is 720x320; a smaller one keeps the test shell tidy
        win.move_resize_frame(false, mon.x + Math.round((mon.width - width) / 2), mon.y + 28, width, height);
        await sleep(1800);
        const peakAt = ext()._terrain._peakTarget;
        const frame = win.get_frame_rect();   // where the window really is, whatever the shell made of the request
        expect('a summit is placed under the middle of the window, below the bar', `${Math.round(peakAt?.x)},${Math.round(peakAt?.y)}`,
            `${Math.round(frame.x + frame.width / 2)},${Math.max(frame.y, Math.round(Main.layoutManager.panelBox.height)) + 24}`);
        expect('it has grown by now', String(ext()._terrain._peak?.amp > 1.4), 'true');
        expect('Isobar\'s own island is hidden', String(ext()._island.actor.visible), 'false');
        expect('notifications are left to Coucou: no banner blocking', String(Main.messageTray._bannerBlocked), 'false');
        expect('and the music listener is off', String(ext()._music), 'null');
        await screenshot('11-coucou-summit');

        await this._gdbus('Show', 'Build finished', '', 'done', 3);
        await sleep(500);
        expect('an event does not open the hidden island', String(ext()._island.shown), 'null');
        const ripple = ext()._terrain._ripples.at(-1);
        expect('but the terrain ripples from the summit', `${Math.round(ripple?.x)},${ripple?.amp}`, `${Math.round(peakAt.x)},1.6`);

        ext()._settings.set_boolean('coucou-aware', false);
        await sleep(600);
        expect('with coucou-aware off the summit goes', String(ext()._terrain._peakTarget), 'null');
        expect('and the island is back', String(ext()._island.actor.visible), 'true');
        ext()._settings.set_boolean('coucou-aware', true);
        await sleep(800);
        expect('with it on again the summit returns', String(!!ext()._terrain._peakTarget), 'true');

        proc.force_exit();
        await sleep(1500);
        expect('when Coucou closes the summit goes', String(ext()._terrain._peakTarget), 'null');
        expect('the island is back', String(ext()._island.actor.visible), 'true');
        expect('and notifications are Isobar\'s again', String(Main.messageTray._bannerBlocked), 'true');
        expect('and so is the music listener', String(!!ext()._music), 'true');
        await sleep(2500);
        expect('the summit has sunk away', String(ext()._terrain._peak), 'null');
    }

    // Frames for the animations in the README. Each frame is stamped with its time, so tools/make_gifs.py can play them at the real speed.
    async _demo() {
        const uuid = 'isobar@gijs.dev';
        const ext = () => Main.extensionManager.lookup(uuid).stateObj;
        const t0 = GLib.get_monotonic_time() / 1000;
        const stamps = {};
        const capture = async (clip, label) => {
            const list = stamps[clip] ??= [];
            const name = `demo-${clip}-${String(list.length).padStart(3, '0')}`;
            await screenshot(name);
            list.push([name, Math.round(GLib.get_monotonic_time() / 1000 - t0), label ?? '']);
        };
        const record = async (clip, ms) => {
            const end = GLib.get_monotonic_time() / 1000 + ms;
            while (GLib.get_monotonic_time() / 1000 < end)
                await capture(clip);
        };
        // the island: a notification, then an agent that needs you, each with its ripple
        ext()._settings.set_string('palette', 'mint');
        await sleep(600);
        await record('island', 700);
        await this._gdbus('Show', 'New message', 'Mail · From Anna', 'info', 3);
        await record('island', 4700);
        await this._gdbus('Show', 'Claude needs you', 'isobar', 'needs', 3);
        await record('island', 4700);
        // the palettes, one still each
        for (const name of ['mint', 'sand', 'sky', 'blush', 'stone']) {
            ext()._settings.set_string('palette', name);
            await sleep(700);
            await capture('palettes', name);
        }
        ext()._settings.set_string('palette', 'mint');
        GLib.file_set_contents(`${OUT}/demo-frames.json`, JSON.stringify(stamps));
        log('ok   demo frames written');
    }

    // Every palette: the bar, the island and the terrain take its colours, and switching back and forth leaves nothing behind
    async _checkPalette() {
        const uuid = 'isobar@gijs.dev';
        const ext = () => Main.extensionManager.lookup(uuid).stateObj;
        const expect = (label, actual, wanted) => log(`${actual === wanted ? 'ok  ' : 'FAIL'} ${label}: ${actual}${actual === wanted ? '' : ` (wanted ${wanted})`}`);
        const hex = c => '#' + [c.red, c.green, c.blue].map(v => v.toString(16).padStart(2, '0')).join('');
        const bg = a => hex(a.get_theme_node().get_background_color());
        const {PALETTES, NAMES} = await import(`file://${GLib.getenv('ROOT')}/lib/palettes.js`);
        const settings = ext()._settings;
        const toggle = ext()._paletteToggle;
        expect('quick settings has a palette menu', String(!!toggle), 'true');
        for (const name of NAMES) {
            const p = PALETTES[name];
            settings.set_string('palette', name);
            await sleep(900);
            const low = s => s.toLowerCase();
            expect(`${name}: the bar is its ink`, low(bg(Main.panel)), low(p.ink));
            expect(`${name}: the resting island is its paper`, low(bg(ext()._island.actor)), low(p.paper));
            expect(`${name}: the terrain has its ground`, low(ext()._terrain._palette.ground), low(p.ground));
            expect(`${name}: the menu shows it as current`, toggle.subtitle.toLowerCase(), name);
            await screenshot(`10-palette-${name}`);
        }
        // the list opens inside quick settings and reads well on its ink
        Main.panel.statusArea.quickSettings.menu.open();
        await sleep(700);
        toggle.emit('clicked', 0);
        await sleep(900);
        expect('a click on the toggle opens the palette list', String(toggle.menu.isOpen), 'true');
        await screenshot('10-palette-menu');
        toggle.menu.close();
        Main.panel.statusArea.quickSettings.menu.close();
        await sleep(500);
        // choosing from the menu works like the setting
        const item = toggle._items.get('sand');
        item.emit('activate', null);
        await sleep(500);
        expect('choosing sand in the menu sets it', settings.get_string('palette'), 'sand');
        settings.set_string('palette', 'mint');
        await sleep(600);
        // turning Isobar off takes its colours away again, and on brings the chosen ones back
        const panelBefore = bg(Main.panel);
        Main.extensionManager.disableExtension(uuid);
        await sleep(1200);
        expect('with Isobar off the bar is not its ink any more', String(bg(Main.panel) !== panelBefore), 'true');
        settings.set_string('palette', 'sky');
        Main.extensionManager.enableExtension(uuid);
        await sleep(1500);
        expect('turning it on brings back the chosen palette', bg(Main.panel).toLowerCase(), PALETTES.sky.ink.toLowerCase());
        settings.set_string('palette', 'mint');
        await sleep(600);
    }

    // An agent's hook runs the relay, exactly as Claude Code would: JSON on stdin
    async _checkAgents() {
        const uuid = 'isobar@gijs.dev';
        const ext = () => Main.extensionManager.lookup(uuid).stateObj;
        const expect = (label, actual, wanted) => log(`${actual === wanted ? 'ok  ' : 'FAIL'} ${label}: ${actual}${actual === wanted ? '' : ` (wanted ${wanted})`}`);
        const relay = (agent, event, payload) => new Promise(resolve => {
            const proc = Gio.Subprocess.new(['python3', `${GLib.getenv('ROOT')}/hooks/relay.py`, agent, event],
                Gio.SubprocessFlags.STDIN_PIPE | Gio.SubprocessFlags.STDERR_MERGE);
            proc.communicate_utf8_async(JSON.stringify(payload), null, () => resolve());
        });
        await sleep(800);
        await relay('claude', 'Notification', {cwd: '/home/me/code/isobar', message: 'Claude needs your permission'});
        await sleep(900);
        expect('a Claude hook opens the island: title', String(ext()._island.shown?.title), 'Claude needs you');
        expect('and it names the project', String(ext()._island.shown?.subtitle), 'isobar');
        expect('and ripples as something that needs you', String(ext()._terrain._ripples.some(r => r.amp === 2.4)), 'true');
        await sleep(10500);
        ext()._settings.set_string('privacy', 'app');
        await relay('claude', 'Stop', {cwd: '/home/me/code/isobar'});
        await sleep(900);
        expect('agent events stay readable at the strictest privacy level', `${ext()._island.shown?.title}|${ext()._island.shown?.subtitle}`, 'Claude is done|isobar');
        ext()._settings.set_string('privacy', 'all');
        await sleep(5500);
        await relay('claude', 'PreToolUse', {cwd: '/x'});
        await sleep(600);
        expect('an event the relay does not show leaves the island closed', String(ext()._island.shown), 'null');
    }

    // Move the virtual pointer onto an actor (true) or well away from the island (false)
    async _point(x, y) {
        if (!this._off)
            await this._calibrate();
        this._device.notify_absolute_motion(GLib.get_monotonic_time(), x + this._off[0], y + this._off[1]);
        await sleep(250);
    }

    // The pointer rests on the island, and a click dismisses it
    async _checkIslandPointer() {
        const uuid = 'isobar@gijs.dev';
        const isl = () => Main.extensionManager.lookup(uuid).stateObj._island;
        const expect = (label, actual, wanted) => log(`${actual === wanted ? 'ok  ' : 'FAIL'} ${label}: ${actual}${actual === wanted ? '' : ` (wanted ${wanted})`}`);
        const a = isl().actor;
        const mon = Main.layoutManager.primaryMonitor;
        const away = () => this._point(mon.x + 200, mon.y + 500);
        expect('a resting island does not catch the pointer', String(a.reactive), 'false');
        await this._gdbus('Show', 'Held', '', 'info', 2);
        await sleep(900);
        expect('an open island does', String(a.reactive), 'true');
        const [x, y] = a.get_transformed_position();
        await this._point(x + a.width / 2, y + a.height / 2);
        await sleep(2600);
        expect('with the pointer on it the island stays past its time', String(isl().shown?.title), 'Held');
        await away();
        await sleep(1900);
        expect('and goes a moment after the pointer leaves', String(isl().shown), 'null');
        expect('then it lets the pointer through again', String(a.reactive), 'false');

        await this._gdbus('Show', 'First', '', 'info', 20);
        await this._gdbus('Show', 'Second', '', 'info', 20);
        await sleep(900);
        await this._click(a, null);
        await sleep(500);
        expect('a click moves on to the next event', String(isl().shown?.title), 'Second');
        await this._click(a, null);
        await sleep(500);
        expect('and a second click closes the island', String(isl().shown), 'null');
        await away();
    }

    // An app sends a notification like any app would; the island shows it and GNOME's own banner stays away
    async _checkNotifications() {
        const uuid = 'isobar@gijs.dev';
        const ext = () => Main.extensionManager.lookup(uuid).stateObj;
        const isl = () => ext()._island;
        const terrain = () => ext()._terrain;
        const tray = Main.messageTray;
        const expect = (label, actual, wanted) => log(`${actual === wanted ? 'ok  ' : 'FAIL'} ${label}: ${actual}${actual === wanted ? '' : ` (wanted ${wanted})`}`);
        const notify = (...args) => new Promise(resolve => {
            const proc = Gio.Subprocess.new(['notify-send', ...args], Gio.SubprocessFlags.STDERR_MERGE);
            proc.wait_async(null, () => resolve());
        });
        // true while GNOME's own banner is on screen or on its way
        const banner = () => String(tray._notificationState !== 0 || tray._banner !== null && tray._banner !== undefined);
        const inTray = title => String(tray.getSources().some(s => s.notifications.some(n => n.title === title)));

        await sleep(800);
        await notify('-a', 'Mail', 'New message', 'From Anna');
        await sleep(900);
        expect('an app notification opens the island with its title', String(isl().shown?.title), 'New message');
        expect('the island says which app it came from', String(/Mail/.test(isl().shown?.subtitle)), 'true');
        expect('GNOME shows no banner of its own', banner(), 'false');
        expect('the notification is still in the message list', inTray('New message'), 'true');
        await screenshot('08-island-notification');
        await sleep(4500);

        await notify('-a', 'Backup', '-u', 'critical', 'Disk almost full');
        await sleep(900);
        expect('a critical notification is an event that needs you', String(terrain()._ripples.some(r => r.amp === 2.4)), 'true');
        expect('and the island shows it', String(isl().shown?.title), 'Disk almost full');
        expect('and still no GNOME banner', banner(), 'false');
        await sleep(10500);

        // privacy: the toggle in quick settings cycles all -> title -> app, and only app notifications are held back
        const toggle = ext()._privacyToggle;
        expect('quick settings has a privacy toggle', String(!!toggle), 'true');
        expect('it starts on everything', ext()._settings.get_string('privacy'), 'all');
        toggle?.emit('clicked', 0);
        expect('one click shows titles only', ext()._settings.get_string('privacy'), 'title');
        await notify('-a', 'Mail', 'Salary letter', 'Your raise is 12%');
        await sleep(900);
        expect('the title still shows', String(isl().shown?.title), 'Salary letter');
        expect('the text does not', String(isl().shown?.subtitle), 'Mail');
        await sleep(4500);
        toggle?.emit('clicked', 0);
        expect('a second click shows the app name only', ext()._settings.get_string('privacy'), 'app');
        await notify('-a', 'Mail', 'Salary letter 2', 'Your raise is 13%');
        await sleep(900);
        expect('the island names only the app', `${isl().shown?.title}|${isl().shown?.subtitle}`, 'Mail|');
        await sleep(4500);
        await this._gdbus('Show', 'Claude needs you', 'isobar', 'needs', 5);
        await sleep(900);
        expect('events you sent yourself stay readable', `${isl().shown?.title}|${isl().shown?.subtitle}`, 'Claude needs you|isobar');
        await sleep(5500);
        toggle?.emit('clicked', 0);
        expect('a third click is back to everything', ext()._settings.get_string('privacy'), 'all');

        ext()._settings.set_boolean('replace-banners', false);
        await sleep(300);
        await notify('-a', 'Mail', 'Second message', 'From Ben');
        await sleep(900);
        expect('with replace-banners off GNOME shows its banner', banner(), 'true');
        expect('and the island stays closed', String(isl().shown), 'null');
        // GNOME keeps a banner while the pointer rests on it, so close it by hand: a leftover must not pass for a flood
        tray._hideNotification(true);
        for (let i = 0; i < 20 && banner() === 'true'; i++)
            await sleep(250);
        expect('the banner of the previous step is gone', banner(), 'false');
        ext()._settings.set_boolean('replace-banners', true);

        Main.extensionManager.disableExtension(uuid);
        await sleep(1200);
        expect('turning Isobar off gives GNOME its banners back', String(tray._bannerBlocked), 'false');
        expect('and does not unleash the notifications it showed', banner(), 'false');
        Main.extensionManager.enableExtension(uuid);
        await sleep(1500);
        expect('and turning it on hides them again', String(tray._bannerBlocked), 'true');
    }

    // Cost at the same redraw rate: terrain hidden, terrain shown.
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
        for (const renderer of ['none', 'shader']) {
            terrain.layers.forEach(l => { l.actor.visible = renderer === 'shader'; });
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
            log(`bench ${renderer}: paint avg ${avg(paints).toFixed(2)} ms, p95 ${pct(paints, 0.95).toFixed(2)} ms; ${(1000 / avg(gaps)).toFixed(1)} fps, gap p95 ${pct(gaps, 0.95).toFixed(1)} ms; shell CPU ${cpu.toFixed(0)}% of one core`);
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
