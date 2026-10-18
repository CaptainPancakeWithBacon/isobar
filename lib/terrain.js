// Timing of the terrain animation. Pure maths, no shell, so it runs (and is tested) under plain gjs.
// The terrain itself is drawn by the shader in terrain-layer.js; tools/reference-terrain.js has the same maths in JS for the tests.

export const FRAME_MS = 33;   // ~30 fps while something moves
const SLEEP_GAP_MS = 1500;     // a longer pause than this means the timer was asleep

/** Milliseconds between redraws at rest for a given fps, 0 meaning never. */
export function idleInterval(fps) {
    if (!(fps > 0))
        return 0;
    return Math.round(1000 / fps);
}

/** How far the animation clock moves after `gapMs` of real time: after a long sleep it carries on where it stopped. */
export function clockStep(gapMs) {
    return gapMs > SLEEP_GAP_MS ? FRAME_MS : gapMs;
}
