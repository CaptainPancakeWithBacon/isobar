import {test, eq, done} from './harness.js';
import {PROFILE, mergeProfile, planDock, remember, same} from '../extension/lib/dock-plan.js';

test('nothing changes when the dock already has the profile (floating-point values included)', () => {
    eq(planDock(PROFILE, k => k === 'hide-delay' ? 0.20000000000000001 : PROFILE[k]), {set: {}, previous: {}});
});

test('only the differing keys are set, and their old values are kept', () => {
    const now = {...PROFILE, 'dock-position': 'LEFT', autohide: false};
    eq(planDock(PROFILE, k => now[k]), {set: {'dock-position': 'BOTTOM', autohide: true}, previous: {'dock-position': 'LEFT', autohide: false}});
});

test('a key this dock does not have is skipped, not invented', () => {
    eq(planDock({'made-up-key': 1, autohide: true}, k => k === 'autohide' ? false : undefined), {set: {autohide: true}, previous: {autohide: false}});
});

test('overrides win, unknown keys and values of the wrong type are ignored', () => {
    const p = mergeProfile(PROFILE, {autohide: false, 'dash-max-icon-size': 56, 'dock-position': 7, 'nonsense': 1});
    eq([p.autohide, p['dash-max-icon-size'], p['dock-position'], 'nonsense' in p], [false, 56, 'BOTTOM', false]);
});

test('{"manage": false} switches management off', () => {
    eq(mergeProfile(PROFILE, {manage: false}), null);
});

test('the oldest remembered value survives a second apply', () => {
    eq(remember({autohide: false}, {autohide: true, 'dock-position': 'LEFT'}), {autohide: false, 'dock-position': 'LEFT'});
});

test('numbers compare with a tolerance, other types exactly', () => {
    eq([same(0.2, 0.20000000000000001), same(1, 2), same('a', 'a'), same(true, false)], [true, false, true, false]);
});

done();
