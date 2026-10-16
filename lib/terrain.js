// Contour terrain: a height field that drifts slowly, plus ripples, traced into contour lines.
// Pure maths, no shell or cairo, so it runs (and is tested) under plain gjs.

export const LEVEL_MIN = -1.8;
export const LEVEL_STEP = 0.3;
export const LEVEL_COUNT = 13;
export const LEVELS = Array.from({length: LEVEL_COUNT}, (_, n) => LEVEL_MIN + n * LEVEL_STEP);

/** Which band between two contour levels a height falls in: -1 below the lowest level, up to 12 above the highest. */
export function levelBand(v) {
    return Math.max(-1, Math.min(LEVEL_COUNT - 1, Math.floor((v - LEVEL_MIN) / LEVEL_STEP)));
}

const RIPPLE_SPEED = 230;   // px per second
const RIPPLE_DECAY = 0.9;   // per second
const RIPPLE_WIDTH = 700;   // 2 * sigma^2, in px^2

/**
 * Fill `field` ((cols + 1) * (rows + 1) values, row-major) with the height at each grid corner.
 * `calm` scales the drifting base terrain only, ripples always show.
 */
export function sampleField(field, cols, rows, cs, {now, seed, ripples, calm}) {
    const t = now / 1000;
    const [sx, sy] = seed;
    for (let j = 0; j <= rows; j++) {
        const y = j * cs;
        for (let i = 0; i <= cols; i++) {
            const x = i * cs;
            let v = Math.sin(x * 0.0125 + sx + t * 0.10) * Math.cos(y * 0.0165 - sy + t * 0.08)
                + 0.6 * Math.sin((x + y) * 0.0085 + sx * 0.7 - t * 0.06)
                + 0.4 * Math.sin(x * 0.03 - y * 0.026 + sy + t * 0.12);
            v *= calm;
            for (const r of ripples) {
                const age = (now - r.t0) / 1000;
                const off = Math.hypot(x - r.x, y - r.y) - age * RIPPLE_SPEED;
                v += r.amp * Math.exp(-off * off / RIPPLE_WIDTH) * Math.exp(-age * RIPPLE_DECAY);
            }
            field[j * (cols + 1) + i] = v;
        }
    }
}

// Marching squares. Corner bits: top-left 8, top-right 4, bottom-right 2, bottom-left 1.
// Edges: 0 top, 1 right, 2 bottom, 3 left.
const SEGMENTS = [
    null, [[3, 2]], [[2, 1]], [[3, 1]], [[0, 1]], [[0, 1], [3, 2]], [[0, 2]], [[0, 3]],
    [[0, 3]], [[0, 2]], [[0, 3], [2, 1]], [[0, 1]], [[3, 1]], [[2, 1]], [[3, 2]], null,
];

/**
 * Trace the contour at `level`. Writes segments as x1, y1, x2, y2 into `out` and returns how many.
 */
export function contourSegments(field, cols, rows, cs, level, out) {
    let n = 0;
    for (let j = 0; j < rows; j++) {
        for (let i = 0; i < cols; i++) {
            const k = j * (cols + 1) + i;
            const a = field[k], b = field[k + 1], d = field[k + cols + 1], c = field[k + cols + 2];
            const m = (a > level ? 8 : 0) | (b > level ? 4 : 0) | (c > level ? 2 : 0) | (d > level ? 1 : 0);
            const segs = SEGMENTS[m];
            if (!segs)
                continue;
            const x0 = i * cs, y0 = j * cs;
            const ta = (level - a) / (b - a), tr = (level - b) / (c - b);
            const tb = (level - d) / (c - d), tl = (level - a) / (d - a);
            for (const [p, q] of segs) {
                const o = n * 4;
                out[o] = p === 0 ? x0 + ta * cs : p === 1 ? x0 + cs : p === 2 ? x0 + tb * cs : x0;
                out[o + 1] = p === 0 ? y0 : p === 1 ? y0 + tr * cs : p === 2 ? y0 + cs : y0 + tl * cs;
                out[o + 2] = q === 0 ? x0 + ta * cs : q === 1 ? x0 + cs : q === 2 ? x0 + tb * cs : x0;
                out[o + 3] = q === 0 ? y0 : q === 1 ? y0 + tr * cs : q === 2 ? y0 + cs : y0 + tl * cs;
                n++;
            }
        }
    }
    return n;
}
