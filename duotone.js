import Clutter from 'gi://Clutter';
import GObject from 'gi://GObject';

import * as Main from 'resource:///org/gnome/shell/ui/main.js';

import {PALETTES, DEFAULT, rgb} from './lib/palettes.js';

const NAME = 'isobar-duotone';
const TRAY = /appindicator|tray|legacy/i;   // status area entries that hold other apps' icons

// The same maths as lib/duotone.js, per pixel. The effect gets premultiplied colour, so undo that and redo it.
const FRAGMENT = `
uniform sampler2D tex;
uniform float uDr; uniform float uDg; uniform float uDb;
uniform float uLr; uniform float uLg; uniform float uLb;
void main() {
    vec4 c = texture2D(tex, cogl_tex_coord_in[0].xy);
    vec3 base = c.a > 0.0 ? c.rgb / c.a : c.rgb;
    float l = dot(base, vec3(0.2126, 0.7152, 0.0722));
    float t = 0.12 + 0.88 * smoothstep(0.08, 0.92, l);   // the same curve and floor as tone() in lib/duotone.js
    cogl_color_out = vec4(mix(vec3(uDr, uDg, uDb), vec3(uLr, uLg, uLb), t) * c.a, c.a);
}
`;

const DuotoneEffect = GObject.registerClass(class IsobarDuotoneEffect extends Clutter.ShaderEffect {
    _init(palette) {
        super._init({shader_type: Clutter.ShaderType.FRAGMENT_SHADER});
        this.set_shader_source(FRAGMENT);
        this.set_uniform_value('tex', 0);   // the actor's own pixels, which the effect draws offscreen first
        this.setPalette(palette);
    }

    setPalette({ink, paper}) {
        // a whole-number JS value would be handed to the shader as an int, so nudge it
        const set = (name, v) => this.set_uniform_value(name, Number.isInteger(v) ? v + 1e-6 : v);
        rgb(ink).forEach((v, i) => set(`uD${'rgb'[i]}`, v));
        rgb(paper).forEach((v, i) => set(`uL${'rgb'[i]}`, v));
        this.queue_repaint();
    }
});

// Puts the palette's two colours on the icons of the Ubuntu Dock and of tray icons (AppIndicator and the like).
// One effect per container, not per icon, so it does not depend on how the dock builds its icons.
export class Duotone {
    constructor(paletteName) {
        this._palette = PALETTES[paletteName] ?? PALETTES[DEFAULT];
        this._effects = new Map();   // actor -> effect
        const ui = Main.layoutManager.uiGroup, right = Main.panel._rightBox;
        this._watched = [ui, right];
        this._ids = [
            [ui, ui.connect('child-added', () => this._scan())],
            [ui, ui.connect('child-removed', () => this._scan())],
            [right, right.connect('child-added', () => this._scan())],
        ];
        this._scan();
    }

    setPalette(name) {
        this._palette = PALETTES[name] ?? PALETTES[DEFAULT];
        this._effects.forEach(effect => effect.setPalette(this._palette));
    }

    get targets() {
        return [...this._effects.keys()];
    }

    destroy() {
        this._ids.forEach(([actor, id]) => actor.disconnect(id));
        this._effects.forEach((_effect, actor) => actor.remove_effect_by_name(NAME));
        this._effects.clear();
    }

    _scan() {
        const found = new Set();
        // the dock's icon strip, not its background
        const dock = Main.layoutManager.uiGroup.get_children().find(a => a.name === 'dashtodockContainer');
        const strip = dock && this._find(dock, 'dashtodockDashScrollview');
        if (strip)
            found.add(strip);
        for (const [key, entry] of Object.entries(Main.panel.statusArea))
            if (TRAY.test(key) && entry.container)
                found.add(entry.container);
        for (const actor of found)
            if (!this._effects.has(actor))
                this._attach(actor);
        for (const actor of [...this._effects.keys()])
            if (!found.has(actor)) {
                actor.remove_effect_by_name(NAME);
                this._effects.delete(actor);
            }
    }

    _attach(actor) {
        const effect = new DuotoneEffect(this._palette);
        actor.add_effect_with_name(NAME, effect);
        this._effects.set(actor, effect);
        actor.connect('destroy', () => this._effects.delete(actor));
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
}
