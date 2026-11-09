// Which drawn glyph an app gets. Known apps by name first (rules), then the desktop file's categories, then nothing: such an app, and every
// game, gets its initials on the plate instead. Pure, tested under gjs. Icons that GNOME's own apps already have are left to icons.js (CORE).
import {CORE} from './icons.js';

const DRAWN = new Set(Object.values(CORE).flat());

/** [what to look for in the app's icon name or desktop id, glyph]; the first that matches wins, so the specific ones come first. */
export const RULES = [
    [/kdeconnect.*sms|whatsapp|whatsie|discord|telegram|signal|slack|element|teams|skype|zoom|mattermost/i, 'chat'],
    [/kdeconnect/i, 'phone'],
    [/proton-?mail|thunderbird|geary|evolution|mailspring/i, 'mail'],
    [/firefox|zen[_-]?browser|app\.zen_browser|chromium|google-chrome|brave|vivaldi|opera|epiphany|librewolf|microsoft-edge/i, 'browser'],
    [/spotify|rhythmbox|audacious|clementine|lollypop|amberol/i, 'music'],
    [/radio/i, 'radio'],
    [/vlc|mpv|celluloid|kodi/i, 'play'],
    [/libreoffice-writer|abiword/i, 'doc'],
    [/libreoffice-calc|gnumeric/i, 'table'],
    [/libreoffice-impress/i, 'slides'],
    [/libreoffice-draw/i, 'shapes'],
    [/libreoffice-math/i, 'sigma'],
    [/libreoffice-base|dbeaver|pgadmin|sqlitebrowser/i, 'database'],
    [/libreoffice/i, 'office'],
    [/org\.gnome\.papers|evince|okular|foliate|calibre|zathura/i, 'book'],
    [/postman|insomnia|bruno/i, 'api'],
    [/claude|chatgpt|gemini|copilot/i, 'spark'],
    [/obsidian|joplin|logseq|xournal|simplenote/i, 'notes'],
    [/jetbrains|phpstorm|pycharm|intellij|webstorm|clion|goland|rider|rubymine|datagrip|android-studio|vscodium|code-oss|^code[_ ]|^code$/i, 'ide'],
    [/sysprof|resources|qps|conky|org\.gnome\.logs|htop|btop/i, 'graph'],
    [/gimp|krita|mypaint|pinta/i, 'brush'],
    [/inkscape|drawio|draw\.io|figma|penpot/i, 'pen'],
    [/lximage|display-im|shotwell|digikam|geeqie/i, 'images'],
    [/wonderdraft|dungeondraft|qgis|org\.gnome\.maps/i, 'map'],
    [/cheese|snapshot|obs-studio/i, 'camera'],
    [/seahorse|proton\.pass|keepass|bitwarden|1password/i, 'key'],
    [/security|firewall|clamav/i, 'shield'],
    [/baobab|filelight/i, 'pie'],
    [/tweaks|dconf|galternatives|alternatives/i, 'sliders'],
    [/extension/i, 'puzzle'],
    [/font-viewer|font/i, 'font'],
    [/characters|gucharmap|charmap/i, 'omega'],
    [/clocks?$|org\.gnome\.clocks|alarm/i, 'clock'],
    [/localsend|warpinator|nearby/i, 'share'],
    [/eduroam|nm-connection|network|wifi/i, 'wifi'],
    [/epsonscan|simple-scan|scanner/i, 'scanner'],
    [/printer/i, 'printer'],
    [/firmware|bios/i, 'chip'],
    [/update|upgrade/i, 'updates'],
    [/theme|appearance|desktop-theme/i, 'palette'],
    [/clipboard|qlipper|clipman/i, 'clipboard'],
    [/minecraft/i, 'cube'],
    [/moonlight|remmina|vnc|anydesk|teamviewer/i, 'remote'],
    [/steam$|valvesoftware\.steam|lutris|prism|heroic|bottles|itch|gamemode/i, 'gamepad'],
    [/bazaar|flathub|discover/i, 'software'],
    [/pcmanfm|thunar|dolphin|nemo|caja/i, 'files'],
    [/konsole|alacritty|kitty|tilix|xterm|wezterm|terminal/i, 'terminal'],
    [/user-desktop|preferences-system|systemsettings/i, 'settings'],
];

/** desktop-file category -> glyph, most specific first (an IDE is also Development). Game and Utility are left out on purpose: they get initials. */
export const CATEGORIES = {
    IDE: 'ide', Database: 'database', InstantMessaging: 'chat', Chat: 'chat', Email: 'mail', WebBrowser: 'browser',
    Spreadsheet: 'table', Presentation: 'slides', WordProcessor: 'doc', Calculator: 'calculator',
    Music: 'music', Player: 'play', Video: 'play', Audio: 'music', VectorGraphics: 'pen', RasterGraphics: 'brush', Photography: 'camera',
    Viewer: 'images', TerminalEmulator: 'terminal', FileManager: 'files', TextEditor: 'editor', Monitor: 'graph', Security: 'key',
    PackageManager: 'software', Development: 'code', Graphics: 'brush', Office: 'doc', Network: 'wifi', Settings: 'settings',
};

/** The glyph for an app `{id, names, categories}`, or null when there is none to give. */
export function glyphFor(app) {
    const subject = `${app.names?.[0] ?? ''} ${app.id ?? ''}`;
    for (const [pattern, glyph] of RULES)
        if (pattern.test(subject))
            return glyph;
    for (const [category, glyph] of Object.entries(CATEGORIES))
        if (app.categories?.includes(category))
            return glyph;
    return null;
}

const SKIP = new Set(['of', 'the', 'and', 'a', 'an', 'for', 'to', 'in', 'on']);

/** Initials: the first letters of the first two real words, upper case; one word gives one letter; no name gives a question mark. */
export function lettersOf(name) {
    const words = String(name ?? '').trim().split(/\s+/).filter(w => w && !SKIP.has(w.toLowerCase()));
    if (!words.length)
        return '?';
    return words.slice(0, 2).map(w => Array.from(w)[0].toUpperCase()).join('');
}

/** Which icons to write, from `[{id, name, names, categories}]`: one per icon name, in order, for apps that are not drawn already; names that
 * are symbolic, empty or paths (a slash would write outside the theme folder) are skipped. Returns `[{icon, glyph, letters}]`. */
export function appIcons(apps) {
    const seen = new Set(), out = [];
    for (const app of apps) {
        const icon = app.names?.[0];
        if (typeof icon !== 'string' || !icon || icon.includes('/') || icon.startsWith('.') || icon.endsWith('-symbolic') || DRAWN.has(icon) || seen.has(icon))
            continue;
        seen.add(icon);
        out.push({icon, glyph: glyphFor(app), letters: lettersOf(app.name)});
    }
    return out;
}
