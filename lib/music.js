// When a media player (MPRIS) starts a new song, the island says which. Plain data, so it runs under gjs.
// `state` holds, per player, what it last said and which song was already announced.

const SECONDS = 3;

/** Feed in one PropertiesChanged of a player. Returns the new state and the island event to show, or null. */
export function musicChange(state, player, changed) {
    const was = state[player] ?? {status: '', track: '', announced: ''};
    const now = {...was};
    if (changed.PlaybackStatus !== undefined)
        now.status = changed.PlaybackStatus;
    let artists = was.artists ?? [];
    if (changed.Metadata !== undefined) {
        now.title = changed.Metadata['xesam:title'] ?? '';
        artists = changed.Metadata['xesam:artist'] ?? [];
        now.artists = artists;
        now.track = `${now.title}\n${artists.join(',')}`;
    }
    let event = null;
    if (now.status === 'Playing' && now.title && now.track !== was.announced) {
        now.announced = now.track;
        event = {title: now.title, subtitle: artists.join(', '), kind: 'info', seconds: SECONDS};
    }
    return {state: {...state, [player]: now}, event};
}
