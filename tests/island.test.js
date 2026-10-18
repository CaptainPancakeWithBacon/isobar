import {test, eq, done} from './harness.js';
import {normalizeEvent, push, advance, nextWake, view, MIN_SHOW_MS} from '../lib/island.js';

const empty = {current: null, queue: []};
const ev = (kind, at = 0, extra = {}) => normalizeEvent({title: `t-${kind}`, subtitle: '', kind, seconds: 0, ...extra}, 1, at);

test('an event has a default time on screen per kind', () => {
    eq(['needs', 'error', 'done', 'info'].map(k => ev(k).ms), [10000, 8000, 5000, 4000]);
});

test('a given number of seconds wins over the default, within limits', () => {
    eq([ev('done', 0, {seconds: 7}).ms, ev('done', 0, {seconds: 99}).ms, ev('done', 0, {seconds: -3}).ms], [7000, 30000, 5000]);
});

test('an unknown kind is treated as info', () => {
    eq(ev('banana').kind, 'info');
});

test('titles and subtitles are cut to a sane length', () => {
    const e = normalizeEvent({title: 'x'.repeat(500), subtitle: 'y'.repeat(500), kind: 'info', seconds: 0}, 1, 0);
    eq([e.title.length <= 60, e.subtitle.length <= 90], [true, true]);
});

test('the first event shows at once', () => {
    const s = push(empty, ev('done'), 0);
    eq(view(s).event.title, 't-done');
});

test('a second event of the same priority waits until the first is over', () => {
    let s = push(empty, ev('done', 0, {title: 'first'}), 0);
    s = push(s, normalizeEvent({title: 'second', kind: 'done'}, 2, 100), 100);
    eq(view(advance(s, 4000)).event.title, 'first');
    eq(view(advance(s, 5000)).event.title, 'second');
});

test('a more important event takes over, but not before the current one has had a moment', () => {
    let s = push(empty, normalizeEvent({title: 'calm', kind: 'info'}, 1, 0), 0);
    s = push(s, normalizeEvent({title: 'urgent', kind: 'needs'}, 2, 200), 200);
    eq(view(s).event.title, 'calm');
    eq(view(advance(s, MIN_SHOW_MS - 1)).event.title, 'calm');
    eq(view(advance(s, MIN_SHOW_MS)).event.title, 'urgent');
});

test('a less important event never takes over', () => {
    let s = push(empty, normalizeEvent({title: 'urgent', kind: 'needs'}, 1, 0), 0);
    s = push(s, normalizeEvent({title: 'calm', kind: 'info'}, 2, 100), 100);
    eq(view(advance(s, 3000)).event.title, 'urgent');
});

test('queued events of the same priority come out oldest first', () => {
    let s = push(empty, normalizeEvent({title: 'a', kind: 'done'}, 1, 0), 0);
    s = push(s, normalizeEvent({title: 'b', kind: 'done'}, 2, 10), 10);
    s = push(s, normalizeEvent({title: 'c', kind: 'done'}, 3, 20), 20);
    const order = [view(s).event.title];
    s = advance(s, 5000); order.push(view(s).event.title);
    s = advance(s, 10000); order.push(view(s).event.title);
    eq(order, ['a', 'b', 'c']);
});

test('the island is empty again once everything has had its time', () => {
    const s = advance(push(empty, ev('done'), 0), 5000);
    eq(view(s).event, null);
});

test('the queue never holds more than eight, and drops the least important first', () => {
    let s = push(empty, normalizeEvent({title: 'shown', kind: 'info'}, 0, 0), 0);
    for (let i = 1; i <= 10; i++)
        s = push(s, normalizeEvent({title: `q${i}`, kind: i === 9 ? 'needs' : 'info'}, i, i), i);
    eq([s.queue.length, s.queue.some(e => e.title === 'q9')], [8, true]);
});

test('the same id replaces its event instead of queueing twice', () => {
    let s = push(empty, normalizeEvent({title: 'shown', kind: 'done'}, 1, 0), 0);
    s = push(s, normalizeEvent({title: 'v1', kind: 'done'}, 5, 10), 10);
    s = push(s, normalizeEvent({title: 'v2', kind: 'done'}, 5, 20), 20);
    eq([s.queue.length, s.queue[0].title], [1, 'v2']);
});

test('the island says when it next has something to do', () => {
    const s = push(empty, ev('done'), 1000);
    eq(nextWake(s, 1000), 5000);
    eq(nextWake(empty, 1000), Infinity);
});

test('a waiting urgent event wakes the island as soon as it may take over', () => {
    let s = push(empty, normalizeEvent({title: 'calm', kind: 'info'}, 1, 0), 0);
    s = push(s, normalizeEvent({title: 'urgent', kind: 'needs'}, 2, 100), 100);
    eq(nextWake(s, 100), MIN_SHOW_MS - 100);   // milliseconds from now, and 100 ms have passed
});

test('the ripple grows with how much the event matters', () => {
    eq(['needs', 'error', 'done', 'info'].map(k => view(push(empty, ev(k), 0)).ripple), [2.4, 2.0, 1.6, 1.0]);
    eq(view(empty).ripple, 0);
});

done();
