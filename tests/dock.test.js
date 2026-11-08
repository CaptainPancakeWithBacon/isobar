import {test, eq, done} from './harness.js';
import {PROFILE, leftmost, mergeProfile, planDock, remember, same} from '../extension/lib/dock-plan.js';

test('nothing changes when the dock already has the profile (floating-point values included)', () => {
    eq(planDock(PROFILE, k => k === 'hide-delay' ? 0.20000000000000001 : PROFILE[k]), {set: {}, previous: {}});
});

test('only the differing keys are set, and their old values are kept', () => {
    const now = {...PROFILE, 'dock-position': 'BOTTOM', autohide: true};
    eq(planDock(PROFILE, k => now[k]), {set: {'dock-position': 'LEFT', autohide: false}, previous: {'dock-position': 'BOTTOM', autohide: true}});
});

test('a key this dock does not have is skipped, not invented', () => {
    eq(planDock({'made-up-key': 1, autohide: true}, k => k === 'autohide' ? false : undefined), {set: {autohide: true}, previous: {autohide: false}});
});

test('overrides win, unknown keys and values of the wrong type are ignored', () => {
    const p = mergeProfile(PROFILE, {autohide: true, 'dash-max-icon-size': 56, 'dock-position': 7, 'nonsense': 1});
    eq([p.autohide, p['dash-max-icon-size'], p['dock-position'], 'nonsense' in p], [true, 56, 'LEFT', false]);
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

test('the dock is permanent and on the left: fixed, never hiding, one dock on a chosen monitor', () => {
    eq([PROFILE['dock-position'], PROFILE['dock-fixed'], PROFILE.autohide, PROFILE.intellihide, PROFILE['multi-monitor'], PROFILE['preferred-monitor']],
        ['LEFT', true, false, false, false, -2]);
});

test('the left-most screen is the one with the smallest x', () => {
    eq(leftmost([{connector: 'eDP-1', x: 1920, y: 0}, {connector: 'DP-3', x: 0, y: 0}, {connector: 'HDMI-1', x: 3840, y: 0}]), 'DP-3');
});

test('the laptop screen counts as left-most when the external screen sits to its right', () => {
    eq(leftmost([{connector: 'DP-3', x: 2256, y: 0}, {connector: 'eDP-1', x: 0, y: 0}]), 'eDP-1');
});

test('screens at the same x: the upper one wins, then the connector name, so the answer never flips', () => {
    eq(leftmost([{connector: 'B', x: 0, y: 1080}, {connector: 'A', x: 0, y: 0}]), 'A');
    eq(leftmost([{connector: 'B', x: 0, y: 0}, {connector: 'A', x: 0, y: 0}]), 'A');
});

test('negative coordinates work, and no screens means no answer', () => {
    eq(leftmost([{connector: 'a', x: 0, y: 0}, {connector: 'b', x: -1920, y: 0}]), 'b');
    eq(leftmost([]), undefined);
});

test('the chosen connector goes through the same plan as the rest, so it is remembered and restored', () => {
    eq(planDock({'preferred-monitor-by-connector': 'eDP-1'}, () => 'primary'), {set: {'preferred-monitor-by-connector': 'eDP-1'}, previous: {'preferred-monitor-by-connector': 'primary'}});
});

done();
