// The dock profile Isobar applies, and the pure logic around it (what to change, what to remember). Tested under gjs.
// The defaults are the dock as it was set up when Isobar took it over: a floating pill at the bottom that hides when windows get in the way.
export const PROFILE = {
    'dock-position': 'BOTTOM',
    'dock-fixed': false,
    'extend-height': false,
    'autohide': true,
    'intellihide': true,
    'intellihide-mode': 'ALL_WINDOWS',
    'hide-delay': 0.2,
    'show-delay': 0.25,
    'animation-time': 0.2,
    'dash-max-icon-size': 44,
    'background-opacity': 1.0,        // solid: the card colour comes from the wallpaper
    'transparency-mode': 'FIXED',
    'multi-monitor': true,
    'show-apps-at-top': false,
    'show-mounts': false,
    'show-trash': true,
    'apply-custom-theme': false,      // Isobar styles the dock itself
};

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
