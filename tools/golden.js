// Does the screenshot show the same contour lines as the tested JS maths?
// Usage: gjs -m tools/golden.js <driver output dir>
import Gio from 'gi://Gio';
import GdkPixbuf from 'gi://GdkPixbuf';
import System from 'system';

import {sampleField, levelBand} from './reference-terrain.js';

const dir = System.programArgs[0];
const log = new TextDecoder().decode(Gio.File.new_for_path(`${dir}/driver.log`).load_contents(null)[1]);
// one check per saved frame: the plain terrain, and the terrain with a summit
function check(label, image, golden) {
    const {w, h} = golden;

    // what the JS maths says, one sample per pixel
    const field = new Float32Array((w + 1) * (h + 1));
    sampleField(field, w, h, 1, {now: golden.now, seed: golden.seed, ripples: [], calm: golden.calm, peak: golden.peak});
    const band = new Int8Array(w * h);
    for (let y = 0; y < h; y++)
        for (let x = 0; x < w; x++)
            band[y * w + x] = levelBand(field[y * (w + 1) + x]);

    // what the screen shows: any pixel clearly darker than the ground colour
    const pixbuf = GdkPixbuf.Pixbuf.new_from_file(`${dir}/${image}`);
    const px = pixbuf.get_pixels(), stride = pixbuf.get_rowstride(), ch = pixbuf.get_n_channels();
    const GROUND_SUM = 0xC8 + 0xE0 + 0xD8;
    const X0 = 100, Y0 = 60, X1 = w - 4, Y1 = h - 4;     // skip the dock, the bar and the screen edge
    const expected = new Uint8Array(w * h), actual = new Uint8Array(w * h);
    for (let y = Y0; y < Y1; y++) {
        for (let x = X0; x < X1; x++) {
            const i = y * w + x;
            if (band[i] !== band[i + 1] || band[i] !== band[i + w])
                expected[i] = 1;
            const o = y * stride + x * ch;
            if (px[o] + px[o + 1] + px[o + 2] < GROUND_SUM - 30)
                actual[i] = 1;
        }
    }

    // is there a marked pixel within 2 px?
    function near(mask) {
        const tmp = new Uint8Array(w * h), out = new Uint8Array(w * h);
        for (let y = Y0; y < Y1; y++)
            for (let x = X0; x < X1; x++)
                if (mask[y * w + x])
                    for (let d = -2; d <= 2; d++)
                        tmp[y * w + x + d] = 1;
        for (let y = Y0; y < Y1; y++)
            for (let x = X0; x < X1; x++)
                if (tmp[y * w + x])
                    for (let d = -2; d <= 2; d++)
                        out[(y + d) * w + x] = 1;
        return out;
    }
    const expectedNear = near(expected), actualNear = near(actual);
    let nExpected = 0, hit = 0, nActual = 0, right = 0;
    for (let i = 0; i < w * h; i++) {
        if (expected[i]) { nExpected++; hit += actualNear[i]; }
        if (actual[i]) { nActual++; right += expectedNear[i]; }
    }
    const recall = hit / nExpected, precision = right / nActual;
    print(`${label}: expected ${nExpected} line pixels, drawn ${nActual}; recall ${recall.toFixed(3)}, precision ${precision.toFixed(3)}`);
    const ok = nExpected > 5000 && nActual > 5000 && recall >= 0.93 && precision >= 0.93;
    print(ok ? `ok   screen matches the JS terrain (${label})` : `FAIL screen does not match the JS terrain (${label})`);
    return ok;

}

let allOk = true;
for (const [label, image, key] of [['golden', '05-golden.png', 'golden'], ['golden with a summit', '05b-golden-peak.png', 'golden-peak']]) {
    const m = log.match(new RegExp(`${key}: (\\{.*\\})`));
    if (m)
        allOk = check(label, image, JSON.parse(m[1])) && allOk;
}
System.exit(allOk ? 0 : 1);
