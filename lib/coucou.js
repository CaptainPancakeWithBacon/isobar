// Finding Coucou's island window, and where the terrain's summit goes. Plain data, so it runs (and is tested) under gjs.
// A window is {wmClass, rect: {x, y, width, height}}; a monitor is {x, y, width, height}.

const TOP_EDGE = 60;     // Coucou's island window starts within this many px of the monitor's top edge
const MAX_WIDTH = 1000;  // and is far narrower than a screen; its settings window is not at the top

/** Coucou's island window on this monitor, or null. */
export function findCoucou(windows, monitor) {
    return windows.find(({wmClass, rect}) =>
        /coucou/i.test(wmClass ?? '') &&
        rect.y - monitor.y <= TOP_EDGE && rect.width <= MAX_WIDTH &&
        rect.x + rect.width / 2 >= monitor.x && rect.x + rect.width / 2 < monitor.x + monitor.width) ?? null;
}

/** Where the summit goes: under the middle of the island window, a little below the bar. */
export function summit({rect}, barBottom) {
    return {x: rect.x + rect.width / 2, y: Math.max(rect.y, barBottom) + 24};
}
