import {test, eq, done} from './harness.js';
import {duotone, luminance709, tone, FLOOR} from '../lib/duotone.js';

const dark = [0.06, 0.18, 0.2], light = [0.92, 0.96, 0.94];
const close = (a, b) => a.every((v, i) => Math.abs(v - b[i]) < 1e-6);
const between = (t, a, b) => a.map((v, i) => v + (b[i] - v) * t);

test('white becomes the light colour exactly', () => {
    eq(close(duotone([1, 1, 1], dark, light), light), true);
});

test('black does not sink all the way into the dark colour: the floor keeps shadows apart from the dock behind them', () => {
    eq(close(duotone([0, 0, 0], dark, light), between(FLOOR, dark, light)), true);
    eq(FLOOR > 0.05 && FLOOR < 0.3, true);
});

test('the tone curve only goes up: a brighter icon is never darker', () => {
    let last = -1, ok = true;
    for (let l = 0; l <= 1.0001; l += 0.01) {
        ok = ok && tone(l) >= last;
        last = tone(l);
    }
    eq(ok, true);
});

test('the contrast boost: midtones are spread further apart than a plain mapping would', () => {
    eq(tone(0.7) - tone(0.3) > 0.5, true);   // a plain mapping would give 0.4
});

test('colours are judged by how bright they look: green is brighter than blue', () => {
    eq(luminance709([0, 1, 0]) > luminance709([0, 0, 1]) * 5, true);
});

test('two icons of different colours but the same brightness come out the same', () => {
    const a = [0.8, 0.2, 0.2], b = [luminance709(a), luminance709(a), luminance709(a)];
    eq(close(duotone(a, dark, light), duotone(b, dark, light)), true);
});

test('a pure red icon is a dark tone of the pair, not the light one', () => {
    const [r] = duotone([1, 0, 0], dark, light);
    eq(r < 0.4, true);
});

done();
