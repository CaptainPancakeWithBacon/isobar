import {test, eq, done} from './harness.js';
import {workspacePills, formatDate, batteryLabel} from '../lib/bar.js';

test('one pill per workspace, only the current one is active', () => {
    eq(workspacePills(3, 1), [
        {index: 0, active: false},
        {index: 1, active: true},
        {index: 2, active: false},
    ]);
});

test('no pill is active when the current workspace is out of range', () => {
    eq(workspacePills(2, 5).map(p => p.active), [false, false]);
});

test('date reads like "Fri 16 Oct"', () => {
    eq(formatDate(new Date(2026, 9, 16)), 'Fri 16 Oct');
});

test('battery is rounded and shown as a percentage', () => {
    eq(batteryLabel(81.6), '82%');
});

test('battery never shows more than 100% or less than 0%', () => {
    eq([batteryLabel(104), batteryLabel(-3)], ['100%', '0%']);
});

test('no battery gives an empty label', () => {
    eq([batteryLabel(null), batteryLabel(undefined), batteryLabel(NaN)], ['', '', '']);
});

done();
