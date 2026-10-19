import * as Main from 'resource:///org/gnome/shell/ui/main.js';

import {notificationEvent} from './lib/notifications.js';

// Shows app notifications on the island instead of in GNOME's banner. They stay in the message list.
// If anything below fails, the banner is left alone, so a notification is never lost.
export class Notifications {
    constructor(island, level, toIsland = () => true) {
        this._island = island;
        this._toIsland = toIsland;   // false in Focus without the island: the banner is held back and the message only waits in the list
        this._level = level;   // a function, so a change in settings applies to the next notification
        this._sources = new Map();
        const tray = Main.messageTray;
        try {
            tray.getSources().forEach(source => this._watch(source));
            this._sourceAddedId = tray.connect('source-added', (_tray, source) => this._watch(source));
            tray.bannerBlocked = true;
        } catch (e) {
            console.error(`Isobar: cannot replace GNOME banners, leaving them alone: ${e.message}`);
            this.destroy();
        }
    }

    destroy() {
        const tray = Main.messageTray;
        if (this._sourceAddedId)
            tray.disconnect(this._sourceAddedId);
        this._sourceAddedId = 0;
        this._sources.forEach((id, source) => source.disconnect(id));
        this._sources.clear();
        tray.bannerBlocked = false;
    }

    _watch(source) {
        if (this._sources.has(source))
            return;
        const id = source.connect('notification-added', (_source, notification) => this._show(source, notification));
        this._sources.set(source, id);
        source.connect('destroy', () => this._sources.delete(source));
    }

    _show(source, notification) {
        const event = notificationEvent(notification, source.title, this._level());
        if (!event)
            return;
        // GNOME skips acknowledged notifications, so nothing queues up behind the blocked banner
        notification.acknowledged = true;
        if (!this._toIsland())
            return;
        this._island.Show(event.title, event.subtitle, event.kind, event.seconds);
    }
}
