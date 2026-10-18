import {test, eq, done} from './harness.js';
import {notificationEvent, URGENCY} from '../lib/notifications.js';

const n = (urgency, extra = {}) => notificationEvent({title: 'New message', body: 'From Anna', urgency, ...extra}, 'Mail');

test('a normal notification is a calm info event with its app and text', () => {
    eq(n(URGENCY.NORMAL), {title: 'New message', subtitle: 'Mail · From Anna', kind: 'info', seconds: 0});
});

test('a critical notification needs you', () => {
    eq(n(URGENCY.CRITICAL).kind, 'needs');
});

test('a low-urgency notification stays off the island, as GNOME shows no banner for it either', () => {
    eq(n(URGENCY.LOW), null);
});

test('without a title the app name is the title, and without a body the subtitle is the app', () => {
    eq(n(URGENCY.NORMAL, {title: '', body: undefined}), {title: 'Mail', subtitle: 'Mail', kind: 'info', seconds: 0});
});

test('line breaks in the body become spaces', () => {
    eq(n(URGENCY.NORMAL, {body: 'one\n\ntwo'}).subtitle, 'Mail · one two');
});

done();
