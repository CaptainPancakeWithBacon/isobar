import {test, eq, done} from './harness.js';
import {duotone, luminance709} from '../lib/duotone.js';

const dark = [0.06, 0.18, 0.2], light = [0.92, 0.96, 0.94];
const close = (a, b) => a.every((v, i) => Math.abs(v - b[i]) < 1e-6);

test('black becomes the dark colour and white the light colour', () => {
    eq([close(duotone([0, 0, 0], dark, light), dark), close(duotone([1, 1, 1], dark, light), light)], [true, true]);
});

test('grey lands halfway between the two colours', () => {
    eq(close(duotone([0.5, 0.5, 0.5], dark, light), dark.map((d, i) => (d + light[i]) / 2)), true);
});

test('colours are judged by how bright they look: green is brighter than blue', () => {
    eq(luminance709([0, 1, 0]) > luminance709([0, 0, 1]) * 5, true);
});

test('two icons of different colours but the same brightness come out the same', () => {
    const a = [0.8, 0.2, 0.2], b = [luminance709(a), luminance709(a), luminance709(a)];
    eq(close(duotone(a, dark, light), duotone(b, dark, light)), true);
});

test('a pure red icon is a fairly dark tone of the pair, not the light one', () => {
    const [r] = duotone([1, 0, 0], dark, light);
    eq(r < 0.4, true);
});

done();
