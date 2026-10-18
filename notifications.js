import * as Main from 'resource:///org/gnome/shell/ui/main.js';

import {notificationEvent} from './lib/notifications.js';

// Shows app notifications on the island instead of in GNOME's banner. They stay in the message list.
// If anything below fails, the banner is left alone, so a notification is never lost.
export class Notifications {
    constructor(island) {
        this._island = island;
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
        const event = notificationEvent(notification, source.title);
        if (!event)
            return;
        // GNOME skips acknowledged notifications, so nothing queues up behind the blocked banner
        notification.acknowledged = true;
        this._island.Show(event.title, event.subtitle, event.kind, event.seconds);
    }
}
