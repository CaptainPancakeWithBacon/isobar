import {test, eq, done} from './harness.js';
import {findCoucou, summit} from '../lib/coucou.js';

const monitor = {x: 0, y: 0, width: 1920, height: 1080};
const win = (wmClass, x, y, width, height) => ({wmClass, rect: {x, y, width, height}});
const island = win('coucou', 600, 28, 720, 320);

test('Coucou\'s island window is found by its class', () => {
    eq(findCoucou([win('Firefox', 0, 0, 1900, 1000), island], monitor), island);
});

test('the class is matched whatever its case', () => {
    eq(findCoucou([win('Coucou', 600, 28, 720, 320)], monitor) !== null, true);
});

test('nothing is found when Coucou is not running', () => {
    eq(findCoucou([win('Firefox', 0, 0, 800, 600)], monitor), null);
});

test('Coucou\'s settings window is not its island: it is not at the top edge', () => {
    eq(findCoucou([win('coucou', 300, 200, 900, 700)], monitor), null);
});

test('a very wide window of the same class is not the island either', () => {
    eq(findCoucou([win('coucou', 0, 0, 1920, 1080)], monitor), null);
});

test('on a second monitor the island sits at that monitor\'s top', () => {
    const second = {x: 1920, y: 0, width: 1920, height: 1080};
    eq(findCoucou([win('coucou', 2400, 28, 720, 320)], second) !== null, true);
    eq(findCoucou([win('coucou', 2400, 28, 720, 320)], monitor), null);
});

test('the summit is under the middle of the island window, a little below the bar', () => {
    eq(summit(island, 32), {x: 960, y: 56});
});

test('a window that starts above the bar bottom still gets its summit below the bar', () => {
    eq(summit(win('coucou', 0, 0, 720, 320), 32), {x: 360, y: 56});
});

done();
