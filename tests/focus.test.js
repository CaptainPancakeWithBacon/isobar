import {test, eq, done} from './harness.js';
import {focusAllows, DIM_OPACITY} from '../lib/focus.js';

test('in Focus only what needs you, or has failed, gets through', () => {
    eq(['needs', 'error', 'done', 'info'].map(focusAllows), [true, true, false, false]);
});

test('an unknown kind is treated like info and stays out', () => {
    eq(focusAllows('banana'), false);
});

test('the dimmed dock is still there: visible, but well under full opacity', () => {
    eq(DIM_OPACITY > 40 && DIM_OPACITY < 160, true);
});

done();
