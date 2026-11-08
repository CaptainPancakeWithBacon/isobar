// The left of the bar: the time, a dot per workspace (the active one long), the app in front. One per screen's bar.
import Clutter from 'gi://Clutter';
import St from 'gi://St';

const DOT = 6;
const LONG = 20;

export class Strip {
    constructor() {
        this.time = new St.Label({style_class: 'mist-clock', y_align: Clutter.ActorAlign.CENTER});
        this.dots = new St.BoxLayout({y_align: Clutter.ActorAlign.CENTER, style: 'spacing: 6px; margin: 0 18px;'});
        this.app = new St.Label({style_class: 'mist-app', y_align: Clutter.ActorAlign.CENTER});
        this.box = new St.BoxLayout({style: 'margin-left: 10px;', y_align: Clutter.ActorAlign.CENTER});
        [this.time, this.dots, this.app].forEach(a => this.box.add_child(a));
    }

    setDots(count, current) {
        this.dots.destroy_all_children();
        for (let i = 0; i < count; i++) {
            const active = i === current;
            this.dots.add_child(new St.Widget({
                style_class: active ? 'mist-dot mist-dot-active' : 'mist-dot',
                width: active ? LONG : DOT,
                y_align: Clutter.ActorAlign.CENTER,
                y_expand: true,
            }));
        }
    }
}
