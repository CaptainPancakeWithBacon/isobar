import Gio from 'gi://Gio';

import {musicChange} from './lib/music.js';

// Listens to every media player on the session bus (MPRIS) and tells the island when a new song starts.
export class Music {
    constructor(island) {
        this._island = island;
        this._state = {};
        this._id = Gio.DBus.session.signal_subscribe(null, 'org.freedesktop.DBus.Properties', 'PropertiesChanged',
            '/org/mpris/MediaPlayer2', 'org.mpris.MediaPlayer2.Player', Gio.DBusSignalFlags.NONE,
            (_conn, sender, _path, _iface, _signal, params) => this._changed(sender, params));
    }

    destroy() {
        Gio.DBus.session.signal_unsubscribe(this._id);
    }

    _changed(sender, params) {
        const [, changed] = params.recursiveUnpack();
        const {state, event} = musicChange(this._state, sender, changed);
        this._state = state;
        if (event)
            this._island.Show(event.title, event.subtitle, event.kind, event.seconds);
    }
}
