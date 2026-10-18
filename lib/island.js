// What the island shows, and when. Plain data in, plain data out, no shell and no clock of its own,
// so it runs (and is tested) under gjs. All times are milliseconds on one clock the caller supplies.

export const MIN_SHOW_MS = 1500;   // an event is on screen at least this long before a more important one takes over
const MAX_QUEUE = 8;
const MAX_SECONDS = 30;

const KINDS = {
    needs: {priority: 4, seconds: 10, ripple: 2.4},   // an agent is waiting for you
    error: {priority: 3, seconds: 8, ripple: 2.0},
    done: {priority: 2, seconds: 5, ripple: 1.6},
    info: {priority: 1, seconds: 4, ripple: 1.0},
};

export function normalizeEvent({title = '', subtitle = '', kind, seconds}, id, at) {
    const k = kind in KINDS ? kind : 'info';
    const s = seconds > 0 ? Math.min(seconds, MAX_SECONDS) : KINDS[k].seconds;
    return {id, kind: k, title: String(title).slice(0, 60), subtitle: String(subtitle).slice(0, 90), ms: s * 1000, at};
}

const priority = e => KINDS[e.kind].priority;
// most important first, then oldest first
const better = (a, b) => priority(a) - priority(b) || b.at - a.at || b.id - a.id;
const best = queue => queue.reduce((top, e) => (!top || better(e, top) > 0 ? e : top), null);
const worst = queue => queue.reduce((low, e) => (!low || better(e, low) < 0 ? e : low), null);

export function push(state, event, now) {
    let {current} = state;
    let queue = [...state.queue];
    const queued = queue.findIndex(e => e.id === event.id);
    if (queued >= 0)
        queue[queued] = event;
    else if (current && current.event.id === event.id)
        current = {...current, event};
    else
        queue.push(event);
    while (queue.length > MAX_QUEUE)
        queue.splice(queue.indexOf(worst(queue)), 1);
    return advance({current, queue}, now);
}

export function advance(state, now) {
    let {current} = state;
    const queue = [...state.queue];
    if (current && now - current.since >= current.event.ms)
        current = null;
    const top = best(queue);
    if (current && top && priority(top) > priority(current.event) && now - current.since >= MIN_SHOW_MS)
        current = null;                       // the one that was shown has had its moment
    if (!current && top) {
        queue.splice(queue.indexOf(top), 1);
        current = {event: top, since: now};
    }
    return {current, queue};
}

/** Milliseconds from `now` until the island next has something to do; Infinity when it is at rest. */
export function nextWake(state, now) {
    if (!state.current)
        return Infinity;
    const {event, since} = state.current;
    let at = since + event.ms;
    const top = best(state.queue);
    if (top && priority(top) > priority(event))
        at = Math.min(at, since + MIN_SHOW_MS);
    return Math.max(0, at - now);
}

export function view(state) {
    const event = state.current ? state.current.event : null;
    return {event, ripple: event ? KINDS[event.kind].ripple : 0};
}
