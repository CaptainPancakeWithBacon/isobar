import Adw from 'gi://Adw';
import Gio from 'gi://Gio';

import {ExtensionPreferences} from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';

// One switch per behaviour that reaches outside the shell. The shell's own look is always on.
const GROUPS = [
    {
        title: 'Your apps',
        rows: [
            ['style-apps', 'Style GNOME apps', 'Writes ~/.config/gtk-4.0/mist.css and imports it from gtk.css. Removed when Isobar is turned off.'],
        ],
    },
    {
        title: 'System settings',
        description: 'These change settings outside the shell.',
        rows: [
            ['follow-scheme', 'Follow the wallpaper\'s brightness', 'Sets GNOME\'s light/dark preference when the wallpaper changes.'],
            ['swap-icons', 'Switch Papirus light and dark', 'Only if the icon theme is already Papirus.'],
            ['swap-cursor', 'Switch the DMZ pointer', 'Only if the cursor theme is already DMZ.'],
            ['startup-colour', 'Start-up colour (Ubuntu)', 'Keeps the colour shown while the shell starts at the wallpaper\'s average.'],
            ['terminal-accent', 'Share the accent colour', 'Writes ~/.cache/isobar/accent for a terminal logo.'],
        ],
    },
];

export default class IsobarPreferences extends ExtensionPreferences {
    fillPreferencesWindow(window) {
        const settings = this.getSettings();
        const page = new Adw.PreferencesPage();
        for (const {title, description, rows} of GROUPS) {
            const group = new Adw.PreferencesGroup({title, description: description ?? ''});
            for (const [key, rowTitle, subtitle] of rows) {
                const row = new Adw.SwitchRow({title: rowTitle, subtitle});
                settings.bind(key, row, 'active', Gio.SettingsBindFlags.DEFAULT);
                group.add(row);
            }
            page.add(group);
        }
        window.add(page);
    }
}
