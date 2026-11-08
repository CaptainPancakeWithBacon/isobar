// The dock profile Isobar applies, and the pure logic around it (what to change, what to remember). Tested under gjs.
// The defaults: a permanent dock on the left, top to bottom, one dock only, on the left-most screen (see leftmost and Dock.pin).
export const PROFILE = {
    'dock-position': 'LEFT',
    'dock-fixed': true,               // always there, and windows stop at its edge
    'extend-height': true,            // the whole side, like the bar is the whole top
    'autohide': false,
    'intellihide': false,
    'intellihide-mode': 'ALL_WINDOWS',
    'hide-delay': 0.2,
    'show-delay': 0.25,
    'animation-time': 0.2,
    'dash-max-icon-size': 44,
    'background-opacity': 0.55,       // the card colour comes from the wallpaper; Dock.setOpacity keeps the opacity level with the bar's
    'transparency-mode': 'FIXED',
    'multi-monitor': false,           // one dock, not one per screen
    'preferred-monitor': -2,          // -2: the screen named in preferred-monitor-by-connector, which Dock.pin keeps on the left-most one
    'show-apps-at-top': false,
    'show-mounts': false,
    'show-trash': true,
    'apply-custom-theme': false,      // Isobar styles the dock itself
};

/** The dock's opacity: the bar's veil when it has one, else a fixed card (a dock with no background at all would leave icons loose on the wallpaper). */
export const dockOpacity = veil => veil > 0 ? veil : 0.55;

export const same = (a, b) => typeof a === 'number' && typeof b === 'number' ? Math.abs(a - b) < 1e-6 : a === b;

/** The profile with the user's overrides on top, or null when they switched management off ({"manage": false}). */
export function mergeProfile(base, override) {
    if (!override || typeof override !== 'object')
        return {...base};
    if (override.manage === false)
        return null;
    const {manage, ...rest} = override;
    return {...base, ...Object.fromEntries(Object.entries(rest).filter(([k, v]) => k in base && typeof v === typeof base[k]))};
}

/** The connector of the left-most screen, from [{connector, x, y}]. Ties go to the upper one, then to the name, so the answer never flips. */
export function leftmost(monitors) {
    const sorted = [...monitors].sort((a, b) => a.x - b.x || a.y - b.y || (a.connector < b.connector ? -1 : a.connector > b.connector ? 1 : 0));
    return sorted[0]?.connector;
}

/** What has to change: {set, previous}. `read(key)` gives the current value, or undefined for a key this dock does not have. */
export function planDock(profile, read) {
    const set = {}, previous = {};
    for (const [key, value] of Object.entries(profile)) {
        const now = read(key);
        if (now === undefined || same(now, value))
            continue;
        set[key] = value;
        previous[key] = now;
    }
    return {set, previous};
}

/** Remember the oldest value of each key: applying again (after a re-login) must not overwrite what the user had before Isobar. */
export const remember = (saved, previous) => ({...previous, ...saved});
