import {test, eq, done} from './harness.js';
import {nextCoucouSettings} from '../extension/lib/coucou-settings.js';

const file = o => JSON.stringify(o, null, 2) + '\n';

test('a different colour is written, and only that key changes', () => {
    const next = JSON.parse(nextCoucouSettings(file({soundEnabled: false, islandColor: 'custom', islandCustomColor: '#e8dcc8', model: 'x'}), '#212623'));
    eq(next, {soundEnabled: false, islandColor: 'custom', islandCustomColor: '#212623', model: 'x'});
});

test('the island is switched to a custom colour when it was not', () => {
    const next = JSON.parse(nextCoucouSettings(file({islandColor: 'default'}), '#F4F6F8'));
    eq([next.islandColor, next.islandCustomColor], ['custom', '#f4f6f8']);
});

test('the same colour, in any case, means nothing to do (no restart)', () => {
    eq(nextCoucouSettings(file({islandColor: 'custom', islandCustomColor: '#212623'}), '#212623'), null);
    eq(nextCoucouSettings(file({islandColor: 'custom', islandCustomColor: '#212623'}), '#212623'.toUpperCase()), null);
});

test('a file that is not JSON is left alone', () => {
    eq(nextCoucouSettings('{ broken', '#212623'), null);
});

done();
