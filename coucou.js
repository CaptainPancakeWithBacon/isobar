import * as Main from 'resource:///org/gnome/shell/ui/main.js';

import {findCoucou, summit} from './lib/coucou.js';

// Watches for Coucou's island window and tells the extension where its summit goes, or null when Coucou is not there.
export class Coucou {
    constructor(onChange) {
        this._onChange = onChange;
        this._watched = new Map();
        this._at = null;
        this._createdId = global.display.connect('window-created', (_display, win) => this._watch(win));
        global.display.list_all_windows().forEach(win => this._watch(win));
        this._scan();
    }

    destroy() {
        global.display.disconnect(this._createdId);
        this._watched.forEach((ids, win) => ids.forEach(id => win.disconnect(id)));
        this._watched.clear();
    }

    _watch(win) {
        if (this._watched.has(win))
            return;
        const rescan = () => this._scan();
        this._watched.set(win, [
            win.connect('position-changed', rescan),
            win.connect('size-changed', rescan),
            win.connect('notify::minimized', rescan),
            win.connect('unmanaged', () => {
                this._watched.delete(win);
                this._scan();
            }),
        ]);
        this._scan();
    }

    _scan() {
        const windows = global.display.list_all_windows()
            .filter(win => !win.minimized)
            .map(win => ({wmClass: win.get_wm_class(), rect: win.get_frame_rect()}));
        let found = null;
        for (const monitor of Main.layoutManager.monitors) {
            found = findCoucou(windows, monitor);
            if (found)
                break;
        }
        const at = found ? summit(found, Main.layoutManager.panelBox.height) : null;
        if (at?.x === this._at?.x && at?.y === this._at?.y)
            return;
        this._at = at;
        this._onChange(at);
    }
}
