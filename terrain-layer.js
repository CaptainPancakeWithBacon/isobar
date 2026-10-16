import GLib from 'gi://GLib';
import St from 'gi://St';

import * as Main from 'resource:///org/gnome/shell/ui/main.js';

import {contourSegments, sampleField} from './lib/terrain.js';

const CS = 11;            // grid cell in px
const FRAME_MS = 33;      // ~30 fps
const LEVELS = Array.from({length: 13}, (_, n) => -1.8 + n * 0.3);
const GROUND = [0xC8, 0xE0, 0xD8].map(v => v / 255);
const MINOR = [0x9C, 0xC6, 0xBB].map(v => v / 255);
const MAJOR = [0x6F, 0xA6, 0x98].map(v => v / 255);
const SEEDS = [[0, 0], [2.3, 1.1], [4.1, 3.7], [1.2, 5.4]];
const WINDOW = 120;       // frames kept for the cost statistics

const now = () => GLib.get_monotonic_time() / 1000;

class Layer {
    constructor(monitor) {
        this.monitor = monitor;
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
        this.costs = new Float32Array(WINDOW);
        this.computeCosts = new Float32Array(WINDOW);
        this.paintCosts = new Float32Array(WINDOW);
        this.frames = 0;
    }

    update(state) {
        const t0 = now();
        const {x, y} = this.monitor;
        sampleField(this.field, this.cols, this.rows, CS, {
            ...state, ripples: state.ripples.map(r => ({...r, x: r.x - x, y: r.y - y})),
        });
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
        const paintMs = now() - t0;
        this.costs[this.frames % WINDOW] = this.computeMs + paintMs;
        this.computeCosts[this.frames % WINDOW] = this.computeMs;
        this.paintCosts[this.frames % WINDOW] = paintMs;
        this.frames++;
    }

    destroy() {
        this.actor.destroy();
    }
}

export class Terrain {
    constructor() {
        this.layers = [];
        this._ripples = [];
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

    ripple(x, y, amp) {
        this._ripples.push({x, y, amp, t0: now()});
    }

    setWorkspace(index) {
        this._seedTarget = SEEDS[index % SEEDS.length];
    }

    setCalm(calm) {
        this._calmTarget = calm ? 0.3 : 1;
    }

    stats() {
        const layer = this.layers[0];
        const n = Math.min(layer?.frames ?? 0, WINDOW);
        if (!n)
            return {frames: 0, avgMs: 0, p95Ms: 0, maxMs: 0, computeAvgMs: 0, paintAvgMs: 0};
        const costs = Array.from(layer.costs.slice(0, n)).sort((a, b) => a - b);
        return {
            frames: layer.frames,
            avgMs: costs.reduce((a, b) => a + b, 0) / n,
            p95Ms: costs[Math.min(n - 1, Math.floor(n * 0.95))],
            maxMs: costs[n - 1],
            computeAvgMs: Array.from(layer.computeCosts.slice(0, n)).reduce((a, b) => a + b, 0) / n,
            paintAvgMs: Array.from(layer.paintCosts.slice(0, n)).reduce((a, b) => a + b, 0) / n,
        };
    }

    destroy() {
        GLib.source_remove(this._timer);
        Main.layoutManager.disconnect(this._monitorsId);
        this.layers.forEach(l => l.destroy());
        this.layers = [];
    }

    _build() {
        this.layers.forEach(l => l.destroy());
        this.layers = Main.layoutManager.monitors.map(monitor => {
            const layer = new Layer(monitor);
            Main.layoutManager._backgroundGroup.add_child(layer.actor);
            return layer;
        });
    }

    _tick() {
        const t = now();
        this._ripples = this._ripples.filter(r => t - r.t0 < 3200);
        this._seed = this._seed.map((v, i) => v + (this._seedTarget[i] - v) * 0.1);
        this._calm += (this._calmTarget - this._calm) * 0.12;
        const state = {now: t, seed: this._seed, ripples: this._ripples, calm: this._calm};
        this.layers.forEach(layer => layer.update(state));
    }
}
