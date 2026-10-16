import Clutter from 'gi://Clutter';
import GLib from 'gi://GLib';
import GObject from 'gi://GObject';
import Meta from 'gi://Meta';
import St from 'gi://St';

import * as Main from 'resource:///org/gnome/shell/ui/main.js';

import {contourSegments, sampleField, LEVELS} from './lib/terrain.js';

const CS = 11;            // cairo grid cell in px
const FRAME_MS = 33;      // ~30 fps
const GROUND = [0xC8, 0xE0, 0xD8].map(v => v / 255);
const MINOR = [0x9C, 0xC6, 0xBB].map(v => v / 255);
const MAJOR = [0x6F, 0xA6, 0x98].map(v => v / 255);
const SEEDS = [[0, 0], [2.3, 1.1], [4.1, 3.7], [1.2, 5.4]];
const WINDOW = 120;       // frames kept for the cost statistics
const MAX_RIPPLES = 4;    // the shader takes four at a time
const IDLE_EVERY = 3;     // with nothing moving, redraw on every third tick: ~10 fps
const COVER_EVERY = 15;   // look for covering windows twice a second

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
    float half_ = mix(0.5, 0.9, major);        // line half width in px, like the cairo version
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
        this.costs = new Float32Array(WINDOW);
        this.computeCosts = new Float32Array(WINDOW);
        this.paintCosts = new Float32Array(WINDOW);
        this.frames = 0;
        this.covered = false;
    }

    record(computeMs, paintMs) {
        const i = this.frames % WINDOW;
        this.costs[i] = computeMs + paintMs;
        this.computeCosts[i] = computeMs;
        this.paintCosts[i] = paintMs;
        this.frames++;
    }

    local(ripples) {
        return ripples.map(r => ({...r, x: r.x - this.monitor.x, y: r.y - this.monitor.y}));
    }

    destroy() {
        this.actor.destroy();
    }
}

// CPU renderer: marching squares into a cairo surface the size of the monitor.
class CairoLayer extends BaseLayer {
    constructor(monitor) {
        super(monitor);
        this.cols = Math.ceil(monitor.width / CS) + 1;
        this.rows = Math.ceil(monitor.height / CS) + 1;
        this.field = new Float32Array((this.cols + 1) * (this.rows + 1));
        this.segments = new Float32Array(this.cols * this.rows * 2 * 4);   // at most 2 per cell
        this.actor = new St.DrawingArea({
            style_class: 'isobar-terrain', reactive: false,
            x: monitor.x, y: monitor.y, width: monitor.width, height: monitor.height,
        });
        this.actor.connect('repaint', area => this._paint(area));
        this.computeMs = 0;
    }

    update(state) {
        const t0 = now();
        sampleField(this.field, this.cols, this.rows, CS, {...state, ripples: this.local(state.ripples)});
        this.computeMs = now() - t0;
        this.actor.queue_repaint();
    }

    _paint(area) {
        const t0 = now();
        const cr = area.get_context();
        cr.setSourceRGB(...GROUND);
        cr.paint();
        for (const major of [false, true]) {
            cr.newPath();
            LEVELS.forEach((level, n) => {
                if ((n % 4 === 0) !== major)
                    return;
                const count = contourSegments(this.field, this.cols, this.rows, CS, level, this.segments);
                for (let s = 0; s < count; s++) {
                    const o = s * 4;
                    cr.moveTo(this.segments[o], this.segments[o + 1]);
                    cr.lineTo(this.segments[o + 2], this.segments[o + 3]);
                }
            });
            cr.setSourceRGB(...(major ? MAJOR : MINOR));
            cr.setLineWidth(major ? 1.8 : 1);
            cr.stroke();
        }
        cr.$dispose();
        this.record(this.computeMs, now() - t0);
    }
}

// GPU renderer: a fragment shader draws the lines, JS only passes a handful of numbers per frame.
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
        const t0 = now();
        const fx = this.effect;
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
        this.record(now() - t0, 0);
    }
}

const RENDERERS = {cairo: CairoLayer, shader: ShaderLayer, none: null};

export class Terrain {
    constructor(renderer = 'shader') {
        this.renderer = renderer;
        this.layers = [];
        this._ripples = [];
        this._t0 = now();
        this._pausedAt = null;
        this._ticks = 0;
        this._refresh = true;
        this._seed = [...SEEDS[0]];
        this._seedTarget = SEEDS[0];
        this._calm = 1;
        this._calmTarget = 1;
        this._build();
        this._monitorsId = Main.layoutManager.connect('monitors-changed', () => this._build());
        this._timer = GLib.timeout_add(GLib.PRIORITY_DEFAULT, FRAME_MS, () => {
            this._tick();
            return GLib.SOURCE_CONTINUE;
        });
    }

    get seed() {
        return [...this._seed];
    }

    get calm() {
        return this._calm;
    }

    ripple(x, y, amp) {
        this._ripples.push({x, y, amp, t0: this._time()});
    }

    setWorkspace(index, immediately = false) {
        this._seedTarget = SEEDS[index % SEEDS.length];
        if (immediately)
            this._seed = [...this._seedTarget];
    }

    setCalm(calm, immediately = false) {
        this._calmTarget = calm ? 0.3 : 1;
        if (immediately)
            this._calm = this._calmTarget;
    }

    setRenderer(renderer) {
        this.renderer = renderer;
        this._build();
    }

    /** Freeze at a given moment (ms since start), settled on the current workspace. */
    pause(at) {
        this._refresh = true;
        this._pausedAt = at;
        this._seed = [...this._seedTarget];
        this._calm = this._calmTarget;
        this._ripples = [];
    }

    resume() {
        this._pausedAt = null;
    }

    stats() {
        const layer = this.layers[0];
        const n = Math.min(layer?.frames ?? 0, WINDOW);
        if (!n)
            return {frames: 0, avgMs: 0, p95Ms: 0, maxMs: 0, computeAvgMs: 0, paintAvgMs: 0};
        const mean = a => Array.from(a.slice(0, n)).reduce((x, y) => x + y, 0) / n;
        const sorted = Array.from(layer.costs.slice(0, n)).sort((a, b) => a - b);
        return {
            frames: layer.frames,
            avgMs: mean(layer.costs),
            p95Ms: sorted[Math.min(n - 1, Math.floor(n * 0.95))],
            maxMs: sorted[n - 1],
            computeAvgMs: mean(layer.computeCosts),
            paintAvgMs: mean(layer.paintCosts),
        };
    }

    destroy() {
        GLib.source_remove(this._timer);
        Main.layoutManager.disconnect(this._monitorsId);
        this.layers.forEach(l => l.destroy());
        this.layers = [];
    }

    _time() {
        return this._pausedAt ?? now() - this._t0;
    }

    _build() {
        this._refresh = true;
        this.layers.forEach(l => l.destroy());
        const Layer = RENDERERS[this.renderer];
        this.layers = Layer ? Main.layoutManager.monitors.map(monitor => {
            const layer = new Layer(monitor);
            Main.layoutManager._backgroundGroup.add_child(layer.actor);
            return layer;
        }) : [];
    }

    // A layer is hidden, and its shader not run at all, while a normal window covers the whole work area of its monitor.
    _checkCovered() {
        const windows = global.get_window_actors().filter(a =>
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
            this._refresh = true;
        });
    }

    _tick() {
        this._ticks++;
        if (this._ticks % COVER_EVERY === 0)
            this._checkCovered();
        const t = this._time();
        this._ripples = this._ripples.filter(r => t - r.t0 < 3200);
        let easing = false;
        if (this._pausedAt === null) {
            this._seed = this._seed.map((v, i) => v + (this._seedTarget[i] - v) * 0.1);
            this._calm += (this._calmTarget - this._calm) * 0.12;
            easing = Math.abs(this._calm - this._calmTarget) > 0.005 ||
                this._seed.some((v, i) => Math.abs(v - this._seedTarget[i]) > 0.005);
        }
        // full speed only while something moves quickly: a ripple, an easing change, a fresh start
        const busy = easing || this._ripples.length > 0 || this._refresh;
        if (!busy && this._ticks % IDLE_EVERY !== 0)
            return;
        this._refresh = false;
        const state = {now: t, seed: this._seed, ripples: this._ripples, calm: this._calm};
        this.layers.forEach(layer => {
            if (!layer.covered)
                layer.update(state);
        });
    }
}
