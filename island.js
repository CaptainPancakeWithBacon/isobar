import Clutter from 'gi://Clutter';
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import Pango from 'gi://Pango';
import St from 'gi://St';

import * as Main from 'resource:///org/gnome/shell/ui/main.js';

import {normalizeEvent, push, advance, nextWake, view, dismiss, hold, release} from './lib/island.js';

const PATH = '/org/gnome/Shell/Extensions/Isobar';
const IFACE = `
<node>
  <interface name="org.gnome.Shell.Extensions.Isobar">
    <method name="Show">
      <arg type="s" direction="in" name="title"/>
      <arg type="s" direction="in" name="subtitle"/>
      <arg type="s" direction="in" name="kind"/>
      <arg type="i" direction="in" name="seconds"/>
      <arg type="u" direction="out" name="id"/>
    </method>
  </interface>
</node>`;

const REST = [64, 18];
const OPEN = [280, 60];
const HANG = 8;       // px the island reaches up into the bar, so it looks hung from it
const nowMs = () => GLib.get_monotonic_time() / 1000;

// A white pill under the middle of the bar. Events sent over D-Bus open it, ripple the terrain, and close it again.
export class Island {
    constructor(terrain) {
        this._terrain = terrain;
        this._state = {current: null, queue: []};
        this._id = 0;
        this._timer = 0;
        this._shown = null;

        this._title = new St.Label({style_class: 'isobar-island-title', opacity: 0});
        this._sub = new St.Label({style_class: 'isobar-island-sub', opacity: 0});
        // a Clutter layout manager, because St.BoxLayout's `vertical` (46) became `orientation` (48)
        this.actor = new St.Widget({
            style_class: 'isobar-island', reactive: false, clip_to_allocation: true,
            layout_manager: new Clutter.BoxLayout({orientation: Clutter.Orientation.VERTICAL}),
        });
        // long text is cut with an ellipsis instead of running out of the pill
        for (const label of [this._title, this._sub])
            label.clutter_text.ellipsize = Pango.EllipsizeMode.END;
        this.actor.add_child(this._title);
        this.actor.add_child(this._sub);
        this._place(REST, false);
        this._track(false);
        // resting, the pill never gets in the way of the windows below; open, it takes the pointer
        this.actor.connect('enter-event', () => this._pointer(hold(this._state)));
        this.actor.connect('leave-event', () => this._pointer(release(this._state, nowMs())));
        this.actor.connect('button-press-event', () => {
            this._pointer(dismiss(this._state, nowMs()));
            return Clutter.EVENT_STOP;
        });

        this._monitorsId = Main.layoutManager.connect('monitors-changed', () => this._place(this._shown ? OPEN : REST, false));
        this._dbus = Gio.DBusExportedObject.wrapJSObject(IFACE, this);
        this._dbus.export(Gio.DBus.session, PATH);
    }

    get shown() {
        return this._shown;
    }

    get timerArmed() {
        return this._timer !== 0;
    }

    /** D-Bus: org.gnome.Shell.Extensions.Isobar.Show(title, subtitle, kind, seconds) -> id */
    Show(title, subtitle, kind, seconds) {
        const id = ++this._id;
        this._state = push(this._state, normalizeEvent({title, subtitle, kind, seconds}, id, nowMs()), nowMs());
        this._sync();
        return id;
    }

    // out of sight over a fullscreen window; `input`: whether the pill catches the pointer
    _track(input) {
        const lm = Main.layoutManager;
        const params = {affectsInputRegion: input, trackFullscreen: true};
        if (this._tracked) {
            lm.untrackChrome(this.actor);
            lm.trackChrome(this.actor, params);
        } else {
            lm.addTopChrome(this.actor, params);
        }
        this._tracked = true;
        this.actor.reactive = input;
    }

    _pointer(state) {
        this._state = state;
        this._sync();
    }

    destroy() {
        if (this._timer)
            GLib.source_remove(this._timer);
        this._timer = 0;
        this._dbus.unexport();
        Main.layoutManager.disconnect(this._monitorsId);
        Main.layoutManager.removeChrome(this.actor);
        this.actor.destroy();
    }

    _place([width, height], animate) {
        const mon = Main.layoutManager.primaryMonitor;
        const x = Math.round(mon.x + (mon.width - width) / 2);
        const y = mon.y + Math.round(Main.layoutManager.panelBox.height) - HANG;
        if (!animate) {
            this.actor.set_position(x, y);
            this.actor.set_size(width, height);
            return;
        }
        this.actor.ease({x, y, width, height, duration: 420, mode: Clutter.AnimationMode.EASE_OUT_BACK});
    }

    // Show what the logic says should be shown, and plan the next moment it has something to do.
    _sync() {
        const now = nowMs();
        this._state = advance(this._state, now);
        const {event, ripple} = view(this._state);
        if (event !== this._shown) {
            this._shown = event;
            if (event)
                this._open(event, ripple);
            else
                this._close();
        }
        if (this._timer)
            GLib.source_remove(this._timer);
        this._timer = 0;
        const wait = nextWake(this._state, now);
        if (Number.isFinite(wait)) {
            this._timer = GLib.timeout_add(GLib.PRIORITY_DEFAULT, Math.max(1, Math.ceil(wait)), () => {
                this._timer = 0;
                this._sync();
                return GLib.SOURCE_REMOVE;
            });
        }
    }

    _open(event, ripple) {
        this._title.text = event.title;
        this._sub.text = event.subtitle;
        this._sub.visible = event.subtitle !== '';
        this.actor.add_style_class_name('isobar-island-open');
        if (!this.actor.reactive)
            this._track(true);
        this._place(OPEN, true);
        for (const label of [this._title, this._sub])
            label.ease({opacity: 255, delay: 150, duration: 200, mode: Clutter.AnimationMode.EASE_OUT_QUAD});
        const mon = Main.layoutManager.primaryMonitor;
        this._terrain.ripple(mon.x + mon.width / 2, mon.y + Math.round(Main.layoutManager.panelBox.height) - HANG + OPEN[1], ripple);
    }

    _close() {
        for (const label of [this._title, this._sub])
            label.ease({opacity: 0, duration: 120, mode: Clutter.AnimationMode.EASE_OUT_QUAD});
        this.actor.remove_style_class_name('isobar-island-open');
        this._track(false);
        this._place(REST, true);
    }
}
