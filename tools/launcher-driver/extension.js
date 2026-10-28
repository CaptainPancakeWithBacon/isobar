// Test only: does the launcher work? Searches for an app in the overview and activates the result, then does the same from the app grid.
import Clutter from 'gi://Clutter';
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import Shell from 'gi://Shell';

import {Extension} from 'resource:///org/gnome/shell/extensions/extension.js';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import {ExtensionState} from 'resource:///org/gnome/shell/misc/extensionUtils.js';

const OUT = GLib.getenv('MIST_OUT');
const APP = GLib.getenv('MIST_APP') ?? 'org.gnome.Calculator.desktop';
const sleep = ms => new Promise(resolve => GLib.timeout_add(GLib.PRIORITY_DEFAULT, ms, () => { resolve(); return GLib.SOURCE_REMOVE; }));
const log = line => {
    const stream = Gio.File.new_for_path(`${OUT}/driver.log`).append_to(Gio.FileCreateFlags.NONE, null);
    stream.write_all(new TextEncoder().encode(`${line}\n`), null);
    stream.close(null);
};
const check = (label, ok, detail = '') => log(`${ok ? 'ok  ' : 'FAIL'} ${label}${detail ? ': ' + detail : ''}`);
const stateName = s => Object.keys(Shell.AppState).find(k => Shell.AppState[k] === s);

export default class MistLauncherDriver extends Extension {
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
        await sleep(3000);
        for (const uuid of (GLib.getenv('MIST_EXTRA') ?? '').split(' ').filter(Boolean)) {
            const ext = Main.extensionManager.lookup(uuid);
            const stateName = ext && Object.keys(ExtensionState).find(k => ExtensionState[k] === ext.state);
            check(`extension ${uuid} is enabled`, ext?.state === ExtensionState.ACTIVE, `${stateName}${ext?.error ? ' (' + ext.error + ')' : ''}`);
        }
        const app = Shell.AppSystem.get_default().lookup_app(APP);
        check(`${APP} is known to the shell`, !!app);
        if (!app)
            return;
        const controls = Main.overview._overview.controls;

        // 1. search, as a user types a name
        Main.overview.show();
        await sleep(1500);
        Main.overview.searchEntry.set_text(GLib.getenv('MIST_QUERY') ?? 'calculator');
        await sleep(4000);
        const results = controls._searchController._searchResults;
        let ids;
        try {
            ids = results._providers.map(p => p.id);
            log(`providers: ${ids.join(', ')}`);
        } catch (e) {
            log(`FAIL reading provider ids throws: ${e.message}`);
            ids = [];
        }
        const answered = Object.keys(results._results ?? {});
        log(`providers that answered the search: ${answered.join(', ') || 'none'}`);
        check('the apps provider answered', answered.includes('applications'));
        check('the other providers (Files, Settings, Calculator...) answered too', answered.length > 1, `${answered.length} answered of ${ids.length}`);
        check('a default result is selected', !!results._defaultResult);
        results.activateDefault();
        await sleep(4000);
        check('activating the first search result starts the app', app.state !== Shell.AppState.STOPPED, stateName(app.state));
        app.request_quit?.();
        Main.overview.hide();
        await sleep(2500);

        // 2. the app grid: click an icon, as a user does
        const GRID_APP = GLib.getenv('MIST_GRID_APP') ?? 'org.gnome.Nautilus.desktop';
        const gridApp = Shell.AppSystem.get_default().lookup_app(GRID_APP);
        Main.overview.show();
        await sleep(1500);
        Main.overview.showApps();
        await sleep(2500);
        const grid = controls._appDisplay;
        // the grid fills itself lazily; in a headless shell nothing maps it, so ask for it
        grid._ensureViewLoaded?.();
        grid._redisplay?.();
        await sleep(2500);
        const items = grid._orderedItems ?? [];
        log(`grid items: ${items.length}: ${items.slice(0, 40).map(i => i.app?.get_id() ?? `[folder ${i.id ?? '?'}]`).join(', ')}`);
        const icon = items.find(i => i.app?.get_id() === GRID_APP);
        check(`${GRID_APP} has an icon in the grid`, !!icon);
        if (icon) {
            const before = gridApp.state;
            try {
                icon.activate(Clutter.BUTTON_PRIMARY);
            } catch (e) {
                log(`FAIL activate() threw: ${e.message}\n${e.stack?.split('\n').slice(0, 4).join('\n')}`);
            }
            await sleep(4500);
            check('clicking the grid icon starts the app', gridApp.state !== Shell.AppState.STOPPED, `${stateName(before)} -> ${stateName(gridApp.state)}`);
        }
    }
}
