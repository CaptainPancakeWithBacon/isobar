// Multi Monitor Bar (if it is installed) draws a bar on every other screen: a mirrored date in the middle and nothing on the left.
// Isobar puts its own strip on those bars and hides the mirrored date (the main bar has none), so every screen's bar looks alike.
import * as Main from 'resource:///org/gnome/shell/ui/main.js';

function extraPanels() {
    const out = [];
    const walk = (actor, depth) => {
        if (actor.has_style_class_name?.('multimonitor-panel'))
            out.push(actor);
        else if (depth < 3)
            actor.get_children?.().forEach(child => walk(child, depth + 1));
    };
    walk(Main.layoutManager.uiGroup, 0);
    return out;
}

export class ExtraBars {
    /** make(): a new Strip, already showing the current time, workspace and app. */
    constructor(make) {
        this._make = make;
        this._strips = new Map();   // panel -> strip
    }

    /** Give every extra bar that has no strip yet one. Panels come and go with the screens, so call this after each change. */
    sync() {
        for (const panel of extraPanels()) {
            const [left, centre] = ['panelLeft', 'panelCenter'].map(name => panel.get_children().find(child => child.name === name));
            centre?.hide();   // it only holds the mirrored date, which Multi Monitor Bar adds after the box itself
            if (this._strips.has(panel) || !left)
                continue;
            const strip = this._make();
            left.insert_child_at_index(strip.box, 0);
            this._strips.set(panel, strip);
            strip.box.connect('destroy', () => this._strips.delete(panel));   // the panel took it along
        }
    }

    destroy() {
        [...this._strips.values()].forEach(strip => strip.box.destroy());
        this._strips.clear();
    }
}
