import {test, eq, done} from './harness.js';
import {contourSegments, sampleField, levelBand, idleInterval, clockStep, LEVELS} from '../lib/terrain.js';

const near = (a, b) => Math.abs(a - b) < 1e-6;

test('one corner above the level gives one segment between the two edges it touches', () => {
    // 1 cell of 10px. Only the bottom-left corner is above level 1.
    const field = Float32Array.from([0, 0, 2, 0]);   // tl, tr, bl, br (row-major, 2x2)
    const out = new Float32Array(16);
    const n = contourSegments(field, 1, 1, 10, 1, out);
    eq(n, 1);
    eq([...out.slice(0, 4)], [0, 5, 5, 10]);
});

test('a cell entirely above or entirely below the level gives no segment', () => {
    const out = new Float32Array(16);
    eq(contourSegments(Float32Array.from([2, 2, 2, 2]), 1, 1, 10, 1, out), 0);
    eq(contourSegments(Float32Array.from([0, 0, 0, 0]), 1, 1, 10, 1, out), 0);
});

test('a single peak is traced as one closed loop', () => {
    // 3x3 cells (4x4 grid) with the middle 2x2 raised
    const field = new Float32Array(16);
    for (const [i, j] of [[1, 1], [2, 1], [1, 2], [2, 2]])
        field[j * 4 + i] = 1;
    const out = new Float32Array(4 * 64);
    const n = contourSegments(field, 3, 3, 10, 0.5, out);
    eq(n, 8);
    // every end point must be shared by exactly two segments, so the loop is closed
    const ends = {};
    for (let s = 0; s < n; s++)
        for (const k of [0, 2]) {
            const key = `${out[s * 4 + k].toFixed(3)},${out[s * 4 + k + 1].toFixed(3)}`;
            ends[key] = (ends[key] ?? 0) + 1;
        }
    eq(Object.values(ends).every(c => c === 2), true);
});

test('calm 0 flattens the terrain completely', () => {
    const field = new Float32Array(9);
    sampleField(field, 2, 2, 10, {now: 5000, seed: [1, 2], ripples: [], calm: 0});
    eq([...field].every(v => v === 0), true);
});

test('the terrain at a given moment is the same every time', () => {
    const a = new Float32Array(9), b = new Float32Array(9);
    const opts = {now: 12345, seed: [0.5, 1.5], ripples: [], calm: 1};
    sampleField(a, 2, 2, 10, opts);
    sampleField(b, 2, 2, 10, opts);
    eq([...a], [...b]);
});

test('a ripple raises a ring that moves outwards and leaves the centre alone', () => {
    // flat terrain so only the ripple shows. Grid 1 cell of 400px: corners are 0 and 400px away.
    const field = new Float32Array(4);
    // after 0.5 s the ring is 115 px out. A point 115px from the origin sits on it.
    sampleField(field, 1, 1, 115, {now: 500, seed: [0, 0], ripples: [{x: 0, y: 0, amp: 2, t0: 0}], calm: 0});
    // grid corners: (0,0) centre, (115,0) on the ring, (0,115) on the ring, (115,115) 163px out
    eq(near(field[0], 0) || field[0] < 0.01, true);
    eq(field[1] > 0.5 && field[2] > 0.5, true);
    eq(field[3] < field[1], true);
});

test('an old ripple has faded away', () => {
    const field = new Float32Array(4);
    sampleField(field, 1, 1, 115, {now: 10000, seed: [0, 0], ripples: [{x: 0, y: 0, amp: 2, t0: 0}], calm: 0});
    eq([...field].every(v => Math.abs(v) < 0.001), true);
});

test('there are 13 contour levels, evenly spaced from -1.8 to 1.8', () => {
    eq(LEVELS.length, 13);
    eq([LEVELS[0], LEVELS[12]].map(v => Math.round(v * 10) / 10), [-1.8, 1.8]);
});

test('a height falls in one band between two levels, clamped at both ends', () => {
    eq([-5, -1.79, 0.01, 1.7, 5].map(levelBand), [-1, 0, 6, 11, 12]);
});

test('redraws per second at rest become a gap in milliseconds', () => {
    eq([30, 10, 5, 2, 1].map(idleInterval), [33, 100, 200, 500, 1000]);
});

test('0 fps, or anything that is not a positive number, means no redraws at rest', () => {
    eq([0, -4, NaN, undefined].map(idleInterval), [0, 0, 0, 0]);
});

test('the animation clock follows real time while the timer runs', () => {
    eq([33, 100, 500, 1500].map(clockStep), [33, 100, 500, 1500]);
});

test('after a long sleep the animation clock carries on from where it stopped', () => {
    eq([1501, 10000, 600000].map(clockStep), [33, 33, 33]);
});

done();
