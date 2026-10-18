import {test, eq, done} from './harness.js';
import {musicChange} from '../lib/music.js';

const song = (title, artist = ['Kate Bush']) => ({'xesam:title': title, 'xesam:artist': artist});
const start = {};

test('a player that starts a song announces it', () => {
    const {event} = musicChange(start, ':1.5', {PlaybackStatus: 'Playing', Metadata: song('Cloudbusting')});
    eq(event, {title: 'Cloudbusting', subtitle: 'Kate Bush', kind: 'info', seconds: 3});
});

test('the next song announces itself', () => {
    let r = musicChange(start, ':1.5', {PlaybackStatus: 'Playing', Metadata: song('A')});
    r = musicChange(r.state, ':1.5', {Metadata: song('B')});
    eq(r.event.title, 'B');
});

test('pausing and resuming the same song says nothing', () => {
    let r = musicChange(start, ':1.5', {PlaybackStatus: 'Playing', Metadata: song('A')});
    r = musicChange(r.state, ':1.5', {PlaybackStatus: 'Paused'});
    eq(r.event, null);
    r = musicChange(r.state, ':1.5', {PlaybackStatus: 'Playing'});
    eq(r.event, null);
});

test('a song chosen while paused is announced once it plays', () => {
    let r = musicChange(start, ':1.5', {PlaybackStatus: 'Paused', Metadata: song('A')});
    eq(r.event, null);
    r = musicChange(r.state, ':1.5', {PlaybackStatus: 'Playing'});
    eq(r.event.title, 'A');
});

test('a change that is not about the song is ignored', () => {
    eq(musicChange(start, ':1.5', {Volume: 0.5}).event, null);
});

test('two players keep their own state', () => {
    let r = musicChange(start, ':1.5', {PlaybackStatus: 'Playing', Metadata: song('A')});
    r = musicChange(r.state, ':1.9', {PlaybackStatus: 'Playing', Metadata: song('A')});
    eq(r.event.title, 'A');
});

test('a song without a title or artist still shows what it can', () => {
    eq(musicChange(start, ':1.5', {PlaybackStatus: 'Playing', Metadata: {'xesam:title': 'Only title'}}).event.subtitle, '');
    eq(musicChange(start, ':1.5', {PlaybackStatus: 'Playing', Metadata: {}}).event, null);
});

test('several artists are joined', () => {
    eq(musicChange(start, ':1.5', {PlaybackStatus: 'Playing', Metadata: song('X', ['A', 'B'])}).event.subtitle, 'A, B');
});

done();
