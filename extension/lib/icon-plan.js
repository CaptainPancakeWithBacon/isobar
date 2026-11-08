// The pure part of Isobar's icon theme: what the theme inherits, what its index says, which icons are drawn and which apps get a plate.
// The file writing is in icon-theme.js. Tested under gjs.
import {CORE, coreIcon, iconColours} from './icons.js';

const PLACES = new Set(['user-trash', 'user-trash-full']);
const DRAWN = new Set(Object.values(CORE).flat());

/** The theme Isobar's icons sit in front of: Papirus follows light and dark, anything else is inherited as it is. */
export function baseTheme(current, dark) {
    if (!current || /^Isobar/.test(current))
        return 'Adwaita';
    return current.startsWith('Papirus') ? (dark ? 'Papirus-Dark' : 'Papirus-Light') : current;
}

export const indexTheme = (name, inherits) => `[Icon Theme]
Name=${name}
Comment=Isobar icons, drawn from your wallpaper
Inherits=${inherits}
Directories=scalable/apps,scalable/places

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
`;

/** The drawn icons as files: [{name, dir, svg}]. */
export function coreFiles(p) {
    const c = iconColours(p);
    return Object.entries(CORE).flatMap(([glyph, names]) => names.map(name => ({name, dir: PLACES.has(name) ? 'places' : 'apps', svg: coreIcon(glyph, c)})));
}

/** Which apps get a plate. `apps` is each app's icon names; the first of each counts, unless it is symbolic, drawn already or not a plain name
 * (a name with a slash would write outside the theme folder). Sorted and unique. */
export function plateNames(apps) {
    const out = new Set();
    for (const names of apps) {
        const name = names[0];
        if (typeof name === 'string' && name && !name.includes('/') && !name.startsWith('.') && !name.endsWith('-symbolic') && !DRAWN.has(name))
            out.add(name);
    }
    return [...out].sort();
}

const hash = text => {
    let h = 5381;
    for (let i = 0; i < text.length; i++)
        h = ((h << 5) + h + text.charCodeAt(i)) | 0;
    return (h >>> 0).toString(16);
};

/** Changes when the theme has to be written again: new colours, another parent theme, other apps. */
export const themeKey = (p, inherits, names) => hash(JSON.stringify([iconColours(p), inherits, names]));
