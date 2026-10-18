import Clutter from 'gi://Clutter';
import GLib from 'gi://GLib';
import GObject from 'gi://GObject';
import Meta from 'gi://Meta';
import St from 'gi://St';

import * as Main from 'resource:///org/gnome/shell/ui/main.js';

import {idleInterval, clockStep, FRAME_MS} from './lib/terrain.js';

const SEEDS = [[0, 0], [2.3, 1.1], [4.1, 3.7], [1.2, 5.4]];
const MAX_RIPPLES = 4;    // the shader takes four at a time
const COVER_MS = 500;     // look for covering windows twice a second

const now = () => GLib.get_monotonic_time() / 1000;

// The same maths as lib/terrain.js, evaluated per pixel on the GPU.
const FRAGMENT = `
uniform float uT;
uniform float uSx;
uniform float uSy;
uniform float uCalm;
uniform float uW;
uniform float uH;
uniform float uR0x; uniform float uR0y; uniform float uR0a; uniform float uR0t;
uniform float uR1x; uniform float uR1y; uniform float uR1a; uniform float uR1t;
uniform float uR2x; uniform float uR2y; uniform float uR2a; uniform float uR2t;
uniform float uR3x; uniform float uR3y; uniform float uR3a; uniform float uR3t;

float bump(vec2 p, float rx, float ry, float amp, float age) {
    float off = length(p - vec2(rx, ry)) - age * 230.0;
    return amp * exp(-off * off / 700.0) * exp(-age * 0.9);
}

float height(vec2 p) {
    float v = sin(p.x * 0.0125 + uSx + uT * 0.10) * cos(p.y * 0.0165 - uSy + uT * 0.08)
        + 0.6 * sin((p.x + p.y) * 0.0085 + uSx * 0.7 - uT * 0.06)
        + 0.4 * sin(p.x * 0.03 - p.y * 0.026 + uSy + uT * 0.12);
    v *= uCalm;
    if (uR0a != 0.0) v += bump(p, uR0x, uR0y, uR0a, uR0t);
    if (uR1a != 0.0) v += bump(p, uR1x, uR1y, uR1a, uR1t);
    if (uR2a != 0.0) v += bump(p, uR2x, uR2y, uR2a, uR2t);
    if (uR3a != 0.0) v += bump(p, uR3x, uR3y, uR3a, uR3t);
    return v;
}

void main() {
    vec2 uv = cogl_tex_coord_in[0].xy;
    vec2 p = vec2(uv.x * uW, uv.y * uH);
    float h = height(p);
    float k = (h + 1.8) / 0.3;                 // level units: whole numbers are contour lines
    float n = floor(k + 0.5);
    float distPx = abs(k - n) / max(length(vec2(dFdx(k), dFdy(k))), 0.0001);
    float major = (mod(n, 4.0) < 0.5) ? 1.0 : 0.0;
    float half_ = mix(0.5, 0.9, major);        // line half width in px, 
    float a = clamp(half_ + 0.5 - distPx, 0.0, 1.0) * step(-0.5, n) * step(n, 12.5);
    vec3 ground = vec3(0.7843, 0.8784, 0.8471);
    vec3 line = mix(vec3(0.6118, 0.7765, 0.7333), vec3(0.4353, 0.6510, 0.5961), major);
    cogl_color_out = vec4(mix(ground, line, a), 1.0);
}
`;

const TerrainEffect = GObject.registerClass(class IsobarTerrainEffect extends Clutter.ShaderEffect {
    _init() {
        super._init({shader_type: Clutter.ShaderType.FRAGMENT_SHADER});
        this.set_shader_source(FRAGMENT);
    }

    // a whole-number JS value would be handed to the shader as an int, so nudge it
    set(name, v) {
        this.set_uniform_value(name, Number.isInteger(v) ? v + 1e-6 : v);
    }
});

class BaseLayer {
    constructor(monitor) {
        this.monitor = monitor;
        this.covered = false;
        this.frames = 0;   // redraws so far; the tests count them
    }

    local(ripples) {
        return ripples.map(r => ({...r, x: r.x - this.monitor.x, y: r.y - this.monitor.y}));
    }

    destroy() {
        this.actor.destroy();
    }
}

// A fragment shader draws the lines; JS only passes a handful of numbers per frame.
class ShaderLayer extends BaseLayer {
    constructor(monitor) {
        super(monitor);
        this.actor = new St.Widget({
            style_class: 'isobar-terrain', reactive: false,
            x: monitor.x, y: monitor.y, width: monitor.width, height: monitor.height,
            style: 'background-color: #C8E0D8;',
        });
        this.effect = new TerrainEffect();
        this.actor.add_effect_with_name('isobar-terrain', this.effect);
        this.effect.set('uW', monitor.width);
        this.effect.set('uH', monitor.height);
    }

    update(state) {
        const fx = this.effect;
        this.frames++;
        fx.set('uT', state.now / 1000);
        fx.set('uSx', state.seed[0]);
        fx.set('uSy', state.seed[1]);
        fx.set('uCalm', state.calm);
        const ripples = this.local(state.ripples).slice(-MAX_RIPPLES);
        for (let i = 0; i < MAX_RIPPLES; i++) {
            const r = ripples[i];
            fx.set(`uR${i}x`, r ? r.x : 0);
            fx.set(`uR${i}y`, r ? r.y : 0);
            fx.set(`uR${i}a`, r ? r.amp : 0);
            fx.set(`uR${i}t`, r ? (state.now - r.t0) / 1000 : 0);
        }
        fx.queue_repaint();
    }
}

export class Terrain {
    constructor() {
        this.layers = [];
        this._ripples = [];
        this._animTime = 0;             // ms of animation so far; it only moves while the timer runs
        this._lastStep = now();
        this._pausedAt = null;
        this._idleMs = idleInterval(10);
        this._timer = 0;
        this._seed = [...SEEDS[0]];
        this._seedTarget = SEEDS[0];
        this._calm = 1;
        this._calmTarget = 1;
        this._build();
        this._monitorsId = Main.layoutManager.connect('monitors-changed', () => this._build());
        this._coverTimer = GLib.timeout_add(GLib.PRIORITY_DEFAULT, COVER_MS, () => {
            this._checkCovered();
            return GLib.SOURCE_CONTINUE;
        });
        this._wake();
    }

    get seed() {
        return [...this._seed];
    }

    get calm() {
        return this._calm;
    }

    /** True while no timer is armed: nothing moves, or every layer is covered. */
    get sleeping() {
        return this._timer === 0;
    }

    /** The animation clock in ms. It stands still while the terrain sleeps. */
    get clock() {
        return this._animTime;
    }

    ripple(x, y, amp) {
        this._ripples.push({x, y, amp, t0: this._time()});
        this._wake();
    }

    setWorkspace(index, immediately = false) {
        this._seedTarget = SEEDS[index % SEEDS.length];
        if (immediately)
            this._seed = [...this._seedTarget];
        this._wake();
    }

    /** Redraws per second while nothing moves; 0 keeps the terrain still until something happens. */
    setIdleFps(fps) {
        this._idleMs = idleInterval(fps);
        this._wake();
    }

    setCalm(calm, immediately = false) {
        this._calmTarget = calm ? 0.3 : 1;
        if (immediately)
            this._calm = this._calmTarget;
        this._wake();
    }

    /** Freeze at a given moment (ms since start), settled on the current workspace. */
    pause(at) {
        this._pausedAt = at;
        this._seed = [...this._seedTarget];
        this._calm = this._calmTarget;
        this._ripples = [];
        this._wake();
    }

    resume() {
        this._pausedAt = null;
        this._wake();
    }

    destroy() {
        if (this._timer)
            GLib.source_remove(this._timer);
        GLib.source_remove(this._coverTimer);
        Main.layoutManager.disconnect(this._monitorsId);
        this.layers.forEach(l => l.destroy());
        this.layers = [];
    }

    _time() {
        return this._pausedAt ?? this._animTime;
    }

    _build() {
        this.layers.forEach(l => l.destroy());
        this.layers = Main.layoutManager.monitors.map(monitor => {
            const layer = new ShaderLayer(monitor);
            Main.layoutManager._backgroundGroup.add_child(layer.actor);
            return layer;
        });
        this._wake();
    }

    // A layer is hidden, and its shader not run at all, while a normal window covers the whole work area of its monitor.
    _checkCovered() {
        // global.get_window_actors() is global.compositor.get_window_actors() from GNOME 48
        const actors = global.compositor?.get_window_actors ? global.compositor.get_window_actors() : global.get_window_actors();
        const windows = actors.filter(a =>
            a.visible && a.opacity === 255 && a.meta_window?.get_window_type() === Meta.WindowType.NORMAL);
        this.layers.forEach(layer => {
            const area = Main.layoutManager.getWorkAreaForMonitor(layer.monitor.index);
            const covered = !Main.overview.visible && windows.some(a => {
                const r = a.meta_window.get_frame_rect();
                return r.x <= area.x && r.y <= area.y &&
                    r.x + r.width >= area.x + area.width && r.y + r.height >= area.y + area.height;
            });
            if (covered === layer.covered)
                return;
            layer.covered = covered;
            layer.actor.visible = !covered;
            this._wake();
        });
    }

    // Run a step soon, replacing whatever was planned. Anything that changes what is on screen calls this.
    _wake() {
        if (this._timer)
            GLib.source_remove(this._timer);
        this._plan(1);
    }

    _plan(ms) {
        this._timer = GLib.timeout_add(GLib.PRIORITY_DEFAULT, ms, () => {
            this._timer = 0;
            this._step();
            return GLib.SOURCE_REMOVE;
        });
    }

    // One redraw, then plan the next one only if there is a reason: quickly while something moves,
    // at the idle rate otherwise, and not at all when the idle rate is 0 or every layer is covered.
    _step() {
        const nowMs = now();
        if (this._pausedAt === null)
            this._animTime += clockStep(nowMs - this._lastStep);
        this._lastStep = nowMs;
        const t = this._time();
        this._ripples = this._ripples.filter(r => t - r.t0 < 3200);
        let easing = false;
        if (this._pausedAt === null) {
            this._seed = this._seed.map((v, i) => v + (this._seedTarget[i] - v) * 0.1);
            this._calm += (this._calmTarget - this._calm) * 0.12;
            easing = Math.abs(this._calm - this._calmTarget) > 0.005 ||
                this._seed.some((v, i) => Math.abs(v - this._seedTarget[i]) > 0.005);
        }
        const visible = this.layers.some(layer => !layer.covered);
        if (visible) {
            const state = {now: t, seed: this._seed, ripples: this._ripples, calm: this._calm};
            this.layers.forEach(layer => {
                if (!layer.covered)
                    layer.update(state);
            });
        }
        if (!visible)
            return;
        if (easing || this._ripples.length > 0)
            this._plan(FRAME_MS);
        else if (this._idleMs > 0)
            this._plan(this._idleMs);
    }
}
