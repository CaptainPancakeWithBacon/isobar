// The pure part of Isobar's icon theme: what the theme inherits, what its index says and which icons are drawn (the apps': app-glyphs.js).
// The file writing is in icon-theme.js. Tested under gjs.
import {CORE, coreIcon, iconColours, spinnerSymbolic} from './icons.js';

const PLACES = new Set(['user-trash', 'user-trash-full']);

/** The theme Isobar's icons sit in front of: Papirus follows light and dark, anything else is inherited as it is. */
export function baseTheme(current, dark) {
    if (!current || /^Isobar/.test(current))
        return 'Adwaita';
    return current.startsWith('Papirus') ? (dark ? 'Papirus-Dark' : 'Papirus-Light') : current;
}

export const indexTheme = (name, inherits) => `[Icon Theme]
Name=${name}
Comment=Isobar's loading wheel, on top of your icon theme
Inherits=${inherits}
Directories=scalable/apps,scalable/places,scalable/status

[scalable/apps]
Size=64
MinSize=8
MaxSize=512
Type=Scalable
Context=Applications

[scalable/places]
Size=64
MinSize=8
MaxSize=512
Type=Scalable
Context=Places

[scalable/status]
Size=64
MinSize=8
MaxSize=512
Type=Scalable
Context=Status
`;

/** The drawn icons as files: [{name, dir, svg}], and the symbolic loading wheel that Gtk.Spinner draws. */
export function coreFiles(p) {
    const c = iconColours(p);
    return [
        ...Object.entries(CORE).flatMap(([glyph, names]) => names.map(name => ({name, dir: PLACES.has(name) ? 'places' : 'apps', svg: coreIcon(glyph, c)}))),
        {name: 'process-working-symbolic', dir: 'status', svg: spinnerSymbolic()},
    ];
}

const hash = text => {
    let h = 5381;
    for (let i = 0; i < text.length; i++)
        h = ((h << 5) + h + text.charCodeAt(i)) | 0;
    return (h >>> 0).toString(16);
};

/** Changes when the theme has to be written again: new colours, another parent theme, other apps or other glyphs for them. */
export const themeKey = (p, inherits, plan) => hash(JSON.stringify([iconColours(p), inherits, plan]));
