import Clutter from 'gi://Clutter';
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import GObject from 'gi://GObject';
import St from 'gi://St';

import {Extension} from 'resource:///org/gnome/shell/extensions/extension.js';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import {QuickToggle, SystemIndicator} from 'resource:///org/gnome/shell/ui/quickSettings.js';

import {workspacePills, formatDate, batteryLabel} from './lib/bar.js';
import {Terrain} from './terrain-layer.js';

const DOT = 8;
const LONG = 28;

const UPowerProxy = Gio.DBusProxy.makeProxyWrapper(`
<node>
  <interface name="org.freedesktop.UPower.Device">
    <property name="Percentage" type="d" access="read"/>
    <property name="IsPresent" type="b" access="read"/>
  </interface>
</node>`);

// Focus calms the terrain; ripples from events still show.
const FocusToggle = GObject.registerClass(class IsobarFocusToggle extends QuickToggle {
    _init(checked, onChange) {
        super._init({title: 'Focus', iconName: 'weather-clear-night-symbolic', toggleMode: true, checked});
        this.connect('notify::checked', () => onChange(this.checked));
    }
});

export default class Isobar extends Extension {
    enable() {
        const panel = Main.panel;
        const wm = global.workspace_manager;

        this._terrain = new Terrain();
        this._terrain.setWorkspace(wm.get_active_workspace_index(), true);

        // Focus survives logging out and turning the extension off and on
        this._settings = this.getSettings();
        const focusOn = this._settings.get_boolean('focus');
        this._terrain.setCalm(focusOn, true);
        const focusToggle = new FocusToggle(focusOn, on => {
            this._settings.set_boolean('focus', on);
            this._terrain.setCalm(on);
        });
        this._focusId = this._settings.connect('changed::focus', () => {
            focusToggle.checked = this._settings.get_boolean('focus');
        });
        this._focus = new SystemIndicator();
        this._focus.quickSettingsItems.push(focusToggle);
        panel.statusArea.quickSettings.addExternalIndicator(this._focus);

        this._hidden = [panel.statusArea.activities, panel.statusArea.dateMenu];
        this._hidden.forEach(item => item.container.hide());

        this._pills = new St.BoxLayout({style_class: 'isobar-pills', y_align: Clutter.ActorAlign.CENTER});
        panel._leftBox.insert_child_at_index(this._pills, 0);
        this._buildPills();
        this._wmIds = [
            wm.connect('notify::n-workspaces', () => this._buildPills()),
            wm.connect('active-workspace-changed', () => this._updatePills()),
        ];

        this._date = new St.Label({y_align: Clutter.ActorAlign.CENTER});
        this._battery = new St.Label({y_align: Clutter.ActorAlign.CENTER});
        const row = new St.BoxLayout({style: 'spacing: 14px;'});
        row.add_child(this._date);
        row.add_child(this._battery);
        this._meta = new St.Button({
            style_class: 'isobar-meta', child: row, can_focus: true, track_hover: true,
            y_align: Clutter.ActorAlign.CENTER, accessible_name: 'Quick settings',
        });
        this._meta.connect('clicked', () => panel.statusArea.quickSettings.menu.toggle());
        panel._rightBox.insert_child_at_index(this._meta, 0);
        this._qsMenuId = panel.statusArea.quickSettings.menu.connect('open-state-changed', (_menu, open) => {
            if (!open)
                return;
            const [x, y] = this._meta.get_transformed_position();
            this._terrain.ripple(x + this._meta.width / 2, y + this._meta.height, 1.4);
        });

        // the bar shows the battery percentage itself, so drop the system's battery icon
        this._battery_icon = panel.statusArea.quickSettings._system?._indicator;
        if (this._battery_icon) {
            this._batteryIconId = this._battery_icon.connect('notify::visible', () => {
                if (this._battery_icon.visible)
                    this._battery_icon.hide();
            });
            this._battery_icon.hide();
        }

        this._syncDate();
        this._clock = GLib.timeout_add_seconds(GLib.PRIORITY_DEFAULT, 60, () => {
            this._syncDate();
            return GLib.SOURCE_CONTINUE;
        });

        this._upower = new UPowerProxy(Gio.DBus.system, 'org.freedesktop.UPower',
            '/org/freedesktop/UPower/devices/DisplayDevice', () => this._syncBattery());
        this._upowerId = this._upower.connect('g-properties-changed', () => this._syncBattery());
    }

    disable() {
        const wm = global.workspace_manager;
        this._wmIds?.forEach(id => wm.disconnect(id));
        this._upower?.disconnect(this._upowerId);
        Main.panel.statusArea.quickSettings.menu.disconnect(this._qsMenuId);
        if (this._focusId)
            this._settings.disconnect(this._focusId);
        this._focus?.quickSettingsItems.forEach(item => item.destroy());
        this._focus?.destroy();
        this._terrain?.destroy();
        if (this._battery_icon) {
            this._battery_icon.disconnect(this._batteryIconId);
            Main.panel.statusArea.quickSettings._system._sync?.();
        }
        if (this._clock)
            GLib.source_remove(this._clock);
        this._pills?.destroy();
        this._meta?.destroy();
        this._hidden?.forEach(item => item.container.show());
        this._settings = this._focusId = this._focus = this._terrain = this._battery_icon = this._wmIds = this._upower = this._clock = this._pills = this._meta = this._hidden = null;
    }

    _buildPills() {
        const wm = global.workspace_manager;
        this._pills.destroy_all_children();
        for (const {index, active} of workspacePills(wm.n_workspaces, wm.get_active_workspace_index())) {
            const dot = new St.Widget({style_class: 'isobar-dot', y_align: Clutter.ActorAlign.CENTER, y_expand: true, width: active ? LONG : DOT});
            if (active)
                dot.add_style_class_name('isobar-dot-active');
            const pill = new St.Button({style_class: 'isobar-pill', child: dot, can_focus: true, track_hover: true, accessible_name: `Workspace ${index + 1}`});
            pill.connect('clicked', () => wm.get_workspace_by_index(index)?.activate(global.get_current_time()));
            this._pills.add_child(pill);
        }
    }

    _updatePills() {
        const current = global.workspace_manager.get_active_workspace_index();
        this._pills.get_children().forEach((pill, i) => {
            const dot = pill.get_child();
            const active = i === current;
            if (active)
                dot.add_style_class_name('isobar-dot-active');
            else
                dot.remove_style_class_name('isobar-dot-active');
            dot.ease({width: active ? LONG : DOT, duration: 350, mode: Clutter.AnimationMode.EASE_OUT_BACK});
            if (active) {
                const [x, y] = pill.get_transformed_position();
                this._terrain.ripple(x + DOT, y + pill.height / 2, 1.3);
            }
        });
        this._terrain.setWorkspace(current);
    }

    _syncDate() {
        this._date.text = formatDate(new Date());
    }

    _syncBattery() {
        this._battery.text = this._upower.IsPresent ? batteryLabel(this._upower.Percentage) : '';
    }
}
