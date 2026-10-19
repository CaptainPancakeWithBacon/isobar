import Clutter from 'gi://Clutter';

import * as Main from 'resource:///org/gnome/shell/ui/main.js';

import {DIM_OPACITY} from './lib/focus.js';

const TRAY = /appindicator|tray|legacy/i;   // status area entries that hold other apps' icons

// What Focus does to the rest of the screen: tray icons out of sight, the dock dimmed (full again while the pointer is on it).
// Everything it changes is put back when Focus ends or Isobar is turned off.
export class CalmSpace {
    constructor() {
        this._active = false;
        this._hiddenTray = new Set();
        this._dock = null;
        this._box = null;
        this._dockIds = [];
        const ui = Main.layoutManager.uiGroup, right = Main.panel._rightBox;
        this._ids = [
            [ui, ui.connect('child-added', () => this._apply())],
            [right, right.connect('child-added', () => this._apply())],
        ];
    }

    setActive(on) {
        this._active = on;
        this._apply();
    }

    destroy() {
        this._active = false;
        this._apply();
        this._ids.forEach(([actor, id]) => actor.disconnect(id));
    }

    _apply() {
        this._applyTray();
        this._applyDock();
    }

    _applyTray() {
        for (const [key, entry] of Object.entries(Main.panel.statusArea)) {
            const container = entry.container;
            if (!TRAY.test(key) || !container)
                continue;
            if (this._active && container.visible) {
                container.visible = false;
                this._hiddenTray.add(container);
            }
        }
        if (!this._active) {
            // only what Focus hid comes back: an icon that was hidden before stays hidden
            this._hiddenTray.forEach(container => { container.visible = true; });
            this._hiddenTray.clear();
        }
    }

    _applyDock() {
        const dock = Main.layoutManager.uiGroup.get_children().find(a => a.name === 'dashtodockContainer') ?? null;
        if (dock !== this._dock) {
            this._unwatchDock();
            this._dock = dock;
            // the dock's inner box is the part that tracks the pointer; the container itself does not
            const box = dock && this._find(dock, 'dashtodockBox');
            if (box) {
                this._box = box;
                this._dockIds = [
                    box.connect('notify::hover', () => this._fade(dock, box.hover || !this._active ? 255 : DIM_OPACITY)),
                    dock.connect('destroy', () => { this._dock = this._box = null; this._dockIds = []; }),
                ];
            }
        }
        if (this._dock)
            this._fade(this._dock, this._active && !this._box?.hover ? DIM_OPACITY : 255);
    }

    _unwatchDock() {
        if (this._box)
            this._box.disconnect(this._dockIds[0]);
        if (this._dock && this._dockIds[1])
            this._dock.disconnect(this._dockIds[1]);
        this._dockIds = [];
        this._box = null;
    }

    _find(actor, name) {
        if (actor.name === name)
            return actor;
        for (const child of actor.get_children()) {
            const hit = this._find(child, name);
            if (hit)
                return hit;
        }
        return null;
    }

    _fade(actor, opacity) {
        actor.ease({opacity, duration: 300, mode: Clutter.AnimationMode.EASE_OUT_QUAD});
    }
}
