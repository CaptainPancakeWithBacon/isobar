// The shell's loading wheel is a native widget with nothing to restyle, so Isobar swaps what it shows: the logo's three half-rings,
// each turning at its own pace, in the wallpaper's colours. Only play() and stop() are patched, and put back when Isobar is switched off.
import Clutter from 'gi://Clutter';
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import St from 'gi://St';

import {Spinner} from 'resource:///org/gnome/shell/ui/animation.js';

import {iconColours, ringSvg, spinnerRings} from './icons.js';

const FADE = 350;   // a little longer than the shell's own fade, so the rings stay until it is over

export class IsobarSpinner {
    constructor() {
        this._orig = null;   // set while the patch is in
        this._dir = `${GLib.get_user_cache_dir()}/isobar/spinner`;
        this._rings = [];
    }

    _patch() {
        if (this._orig)
            return;
        this._orig = {play: Spinner.prototype.play, stop: Spinner.prototype.stop};
        const me = this;

        Spinner.prototype.play = function () {
            me._orig.play.call(this);
            if (!me._rings.length)
                return;
            this.set_content(null);   // not the stock arcs: ours
            me._clear(this);
            this._isobar = me._rings.map(ring => {
                const icon = new St.Icon({gicon: Gio.FileIcon.new(Gio.File.new_for_path(ring.path)), icon_size: this._size, reactive: false});
                icon.add_constraint(new Clutter.BindConstraint({source: this, coordinate: Clutter.BindCoordinate.SIZE}));
                icon.set_pivot_point(0.5, 0.5);
                this.add_child(icon);
                me._turn(icon, ring);
                return icon;
            });
        };

        Spinner.prototype.stop = function () {
            me._orig.stop.call(this);
            const mine = this._isobar;
            if (mine)
                GLib.timeout_add(GLib.PRIORITY_DEFAULT, FADE, () => {
                    if (this._isobar === mine)
                        me._clear(this);
                    return GLib.SOURCE_REMOVE;
                });
        };
    }

    /** Turn one ring for ever, at its own pace: ease a full turn, snap back (the same picture), go again. */
    _turn(icon, ring) {
        icon.rotation_angle_z = ring.from;
        const go = () => icon.ease({
            rotation_angle_z: ring.from + ring.dir * 360,
            duration: ring.dur * 1000,
            mode: Clutter.AnimationMode.LINEAR,
            onComplete: () => {
                icon.rotation_angle_z = ring.from;
                go();
            },
        });
        go();
    }

    _clear(spinner) {
        (spinner._isobar ?? []).forEach(icon => {
            icon.remove_all_transitions();
            icon.destroy();
        });
        spinner._isobar = null;
    }

    /** Draw the rings for this palette: new files each time, because the shell keeps an icon it has loaded by its path. */
    apply(p) {
        this._patch();
        GLib.mkdir_with_parents(this._dir, 0o755);
        const stamp = GLib.get_monotonic_time();
        const old = this._rings.map(r => r.path);
        this._rings = spinnerRings(iconColours(p)).map((ring, i) => {
            const path = `${this._dir}/ring-${i}-${stamp}.svg`;
            GLib.file_set_contents(path, ringSvg(ring, 96));
            return {...ring, path};
        });
        old.forEach(path => GLib.unlink(path));
    }

    restore() {
        if (this._orig) {
            Spinner.prototype.play = this._orig.play;
            Spinner.prototype.stop = this._orig.stop;
            this._orig = null;
        }
        this._rings.forEach(r => GLib.unlink(r.path));
        this._rings = [];
    }
}
