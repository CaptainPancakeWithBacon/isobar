// Gives Coucou's island the colour of Mist's cards. Coucou reads its colour only at startup, so a change restarts it.
// Opt-in: nothing happens unless ~/.config/mist/coucou exists. Only the island colour is written.
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';

import {nextCoucouSettings} from './coucou-settings.js';

// the XDG folders, not the home folder: the throwaway test shell points them elsewhere and so can never touch the real Coucou
const OPT_IN = `${GLib.get_user_config_dir()}/mist/coucou`;
const SETTINGS = `${GLib.get_user_config_dir()}/coucou/settings.json`;
const LAUNCHER = `${GLib.get_user_data_dir()}/coucou/start.sh`;

const run = argv => new Promise(resolve => {
    const proc = Gio.Subprocess.new(argv, Gio.SubprocessFlags.STDOUT_SILENCE | Gio.SubprocessFlags.STDERR_SILENCE);
    proc.wait_async(null, (p, res) => { p.wait_finish(res); resolve(p.get_exit_status()); });
});
const sleep = ms => new Promise(resolve => GLib.timeout_add(GLib.PRIORITY_DEFAULT, ms, () => { resolve(); return GLib.SOURCE_REMOVE; }));

export class CoucouSync {
    constructor() {
        this._busy = false;
        this._pending = null;
        this._dead = false;
    }

    destroy() {
        this._dead = true;
    }

    sync(color) {
        if (!GLib.file_test(OPT_IN, GLib.FileTest.EXISTS) || !GLib.file_test(SETTINGS, GLib.FileTest.EXISTS))
            return;
        // wallpaper changes can arrive in a burst: the last colour wins, one restart at a time
        this._pending = color;
        if (!this._busy)
            this._apply().catch(e => log(`Mist: Coucou sync failed: ${e.message}`)).finally(() => { this._busy = false; });
    }

    async _apply() {
        this._busy = true;
        while (this._pending && !this._dead) {
            const color = this._pending;
            this._pending = null;
            const [, bytes] = GLib.file_get_contents(SETTINGS);
            const next = nextCoucouSettings(new TextDecoder().decode(bytes), color);
            if (!next)
                continue;
            // stop Coucou first: it saves its settings when it quits and would overwrite ours
            const running = await run(['pgrep', '-x', 'coucou-sys']) === 0;
            if (running) {
                await run(['pkill', '-x', 'coucou-sys']);
                await sleep(1200);
            }
            Gio.File.new_for_path(SETTINGS).replace_contents(new TextEncoder().encode(next), null, false, Gio.FileCreateFlags.NONE, null);
            if (running && !this._dead)
                Gio.Subprocess.new(['setsid', LAUNCHER], Gio.SubprocessFlags.STDOUT_SILENCE | Gio.SubprocessFlags.STDERR_SILENCE);
        }
    }
}
