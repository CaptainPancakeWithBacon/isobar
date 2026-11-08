// Applies Isobar's dock profile to the Ubuntu Dock / Dash to Dock settings, remembers what was there, and puts it back when Isobar is switched off.
// Override anything in ~/.config/isobar/dock.json, for example {"autohide": true}; {"manage": false} leaves the dock alone.
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';

import * as Main from 'resource:///org/gnome/shell/ui/main.js';

import {PROFILE, leftmost, mergeProfile, planDock, remember} from './dock-plan.js';

const SCHEMA = 'org.gnome.shell.extensions.dash-to-dock';
const readJson = path => {
    try {
        return JSON.parse(new TextDecoder().decode(GLib.file_get_contents(path)[1]));
    } catch (e) {
        return null;
    }
};

export class Dock {
    constructor() {
        const source = Gio.SettingsSchemaSource.get_default().lookup(SCHEMA, true);
        this._settings = source ? new Gio.Settings({settings_schema: source}) : null;
        this._schema = source;
        this._saved = `${GLib.get_user_cache_dir()}/isobar/dock-previous.json`;
    }

    apply() {
        if (!this._settings)
            return;
        const profile = mergeProfile(PROFILE, readJson(`${GLib.get_user_config_dir()}/isobar/dock.json`));
        this._managed = !!profile;
        if (profile) {
            this._write(profile);
            this.pin();
        }
    }

    /** The one dock lives on the left-most screen. Called again when screens come and go (docking at a desk), because left-most changes. */
    pin() {
        if (!this._settings || !this._managed)
            return;
        const manager = global.backend.get_monitor_manager();
        const screens = manager.get_monitors().map(m => m.get_connector()).map(connector => {
            const geometry = Main.layoutManager.monitors[manager.get_monitor_for_connector(connector)];
            return {connector, x: geometry?.x, y: geometry?.y};
        }).filter(s => s.x !== undefined);
        const connector = leftmost(screens);
        if (connector)
            this._write({'preferred-monitor-by-connector': connector});
    }

    _write(profile) {
        const {set, previous} = planDock(profile, key => this._schema.has_key(key) ? this._settings.get_value(key).deepUnpack() : undefined);
        if (Object.keys(previous).length) {
            GLib.mkdir_with_parents(`${GLib.get_user_cache_dir()}/isobar`, 0o755);
            GLib.file_set_contents(this._saved, JSON.stringify(remember(readJson(this._saved) ?? {}, previous), null, 2));
        }
        for (const [key, value] of Object.entries(set)) {
            const type = this._settings.get_value(key).get_type_string();
            this._settings.set_value(key, new GLib.Variant(type, value));
        }
    }

    /** Put back what the user had before Isobar. */
    restore() {
        const saved = readJson(this._saved);
        if (!this._settings || !saved)
            return;
        for (const [key, value] of Object.entries(saved)) {
            if (!this._schema.has_key(key))
                continue;
            this._settings.set_value(key, new GLib.Variant(this._settings.get_value(key).get_type_string(), value));
        }
        GLib.unlink(this._saved);
    }
}
