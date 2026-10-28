// Test only: loads the Mist login theme the way the greeter would, locks the screen, takes a screenshot.
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import Clutter from 'gi://Clutter';
import Shell from 'gi://Shell';
import St from 'gi://St';

import {Extension} from 'resource:///org/gnome/shell/extensions/extension.js';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';

const OUT = GLib.getenv('MIST_OUT');
const sleep = ms => new Promise(resolve => GLib.timeout_add(GLib.PRIORITY_DEFAULT, ms, () => { resolve(); return GLib.SOURCE_REMOVE; }));
const log = line => {
    const stream = Gio.File.new_for_path(`${OUT}/driver.log`).append_to(Gio.FileCreateFlags.NONE, null);
    stream.write_all(new TextEncoder().encode(`${line}\n`), null);
    stream.close(null);
};
const screenshot = name => new Promise(resolve => {
    const stream = Gio.File.new_for_path(`${OUT}/${name}.png`).replace(null, false, Gio.FileCreateFlags.NONE, null);
    new Shell.Screenshot().screenshot(false, stream, (shot, res) => {
        try { shot.screenshot_finish(res); log(`screenshot ${name}: ok`); } catch (e) { log(`screenshot ${name}: FAIL ${e.message}`); }
        stream.close(null);
        resolve();
    });
});

export default class MistGdmDriver extends Extension {
    enable() {
        if (this._started)
            return;
        this._started = true;
        this._run().catch(e => log(`FAIL driver crashed: ${e.message}\n${e.stack}`)).finally(() => GLib.file_set_contents(`${OUT}/done`, 'done'));
    }

    disable() {}

    async _run() {
        while (Main.layoutManager._startingUp)
            await sleep(500);
        await sleep(2000);
        const res = Gio.Resource.load(GLib.getenv('MIST_GDM_RESOURCE'));
        res._register();
        log('ok   the resource registers');
        // setThemeStylesheet wants a path, so the stylesheet from the resource goes to a file first; its url(resource:///...) still resolves
        const data = Gio.resources_lookup_data('/org/gnome/shell/theme/gdm.css', Gio.ResourceLookupFlags.NONE);
        const path = `${OUT}/gdm.css`;
        GLib.file_set_contents(path, data.get_data());
        Main.setThemeStylesheet(path);
        Main.loadTheme();
        log('ok   the login stylesheet loads as a theme without error');
        await sleep(1500);
        // a headless lock screen renders black, so the greeter is rebuilt from the style names it uses
        const stage = global.stage;
        const group = new St.Widget({name: 'lockDialogGroup', width: stage.width, height: stage.height, reactive: false});
        Main.uiGroup.add_child(group);
        const dialog = new St.BoxLayout({style_class: 'login-dialog', vertical: true, x_align: Clutter.ActorAlign.CENTER, y_align: Clutter.ActorAlign.CENTER, x_expand: true, y_expand: true});
        group.add_child(dialog);
        dialog.set_size(stage.width, stage.height);
        const logo = new St.Bin({style_class: 'login-dialog-logo-bin', child: new St.Label({text: 'UBUNTU LOGO (must be hidden)'})});
        dialog.add_child(logo);
        const list = new St.BoxLayout({style_class: 'login-dialog-user-list', vertical: true});
        const view = new St.BoxLayout({style_class: 'login-dialog-user-list-view', x_align: Clutter.ActorAlign.CENTER});
        view.add_child(list);
        const widget = new St.BoxLayout({style_class: 'user-widget horizontal', style: 'spacing: 12px;'});
        widget.add_child(new St.Icon({icon_name: 'avatar-default-symbolic', icon_size: 48}));
        widget.add_child(new St.Label({style_class: 'user-widget-label', text: 'Your Name', y_align: Clutter.ActorAlign.CENTER}));
        list.add_child(new St.Button({style_class: 'login-dialog-user-list-item', child: widget, reactive: true, can_focus: true}));
        dialog.add_child(view);
        dialog.add_child(new St.Button({style_class: 'login-dialog-not-listed-button', child: new St.Label({style_class: 'login-dialog-not-listed-label', text: 'Not listed?'}), x_align: Clutter.ActorAlign.CENTER}));
        const node = group.get_theme_node();
        log(`lockDialogGroup background-image: ${node.get_background_image()?.get_uri?.() ?? 'none'}`);
        log(`logo bin height: ${logo.get_theme_node().get_height()} opacity: ${logo.get_theme_node().lookup_double?.('opacity', false)?.[1] ?? 'n/a'}`);
        await sleep(800);
        await screenshot('lock');
    }
}
