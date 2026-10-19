// What Focus lets through, and how far it dims the dock. Plain data, so it runs (and is tested) under gjs.

const THROUGH = ['needs', 'error'];   // something is waiting for you, or something failed
export const DIM_OPACITY = 110;       // of 255: the dock is still there, but out of the way

/** Whether an event of this kind may open the island while Focus is on. */
export const focusAllows = kind => THROUGH.includes(kind);
