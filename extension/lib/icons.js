// Isobar's icon language, as pure functions: a palette goes in, SVG text comes out. Round plates (the logo is round), a few contour
// lines in the corner like a map, a simple glyph. The extension writes these into an icon theme; the preview board draws the same strings.

/** The few colours an icon uses, from a palette (see palette.js). */
export const iconColours = p => ({plate: p.hover, line: p.muted, glyph: p.paper, accent: p.accent.text});

const svg = (body, size = 64) => `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 64 64">${body}</svg>\n`;

/** The plate: a disc with three contour arcs rising from the lower right, the way the logo's rings do. */
function disc(c) {
    return `<defs><clipPath id="d"><circle cx="32" cy="32" r="30"/></clipPath></defs>` +
        `<circle cx="32" cy="32" r="30" fill="${c.plate}"/>` +
        `<g clip-path="url(#d)" fill="none" stroke="${c.line}" stroke-opacity=".32" stroke-width="1.6" stroke-linecap="round">` +
        `<circle cx="56" cy="56" r="14"/><circle cx="56" cy="56" r="22"/><circle cx="56" cy="56" r="30"/></g>`;
}

const S = c => `fill="none" stroke="${c.glyph}" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"`;
const D = c => `fill="none" stroke="${c.glyph}" stroke-width="4.4" stroke-linecap="round"`;
const A = c => `fill="none" stroke="${c.accent}" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"`;

/** Glyphs, drawn in the middle 36 x 36 of the plate. Each takes the colours and returns SVG. */
export const GLYPHS = {
    files: c => `<path d="M17 25a2 2 0 0 1 2-2h8l4 4h14a2 2 0 0 1 2 2v15a2 2 0 0 1-2 2H19a2 2 0 0 1-2-2z" fill="${c.accent}"/>`,
    terminal: c => `<path d="M20 24l9 8-9 8" ${S(c)}/><path d="M33 41h11" ${A(c)}/>`,
    settings: c => `<circle cx="32" cy="32" r="14.5" fill="none" stroke="${c.accent}" stroke-width="5.5" stroke-dasharray="5.7 5.7" stroke-dashoffset="2.8"/><circle cx="32" cy="32" r="12" fill="${c.accent}"/><circle cx="32" cy="32" r="5.5" fill="${c.plate}"/>`,
    calculator: c => `<rect x="20" y="17" width="24" height="30" rx="4" ${S(c)}/><path d="M25 24h14" ${A(c)}/><path d="M26 32h0M32 32h0M38 32h0M26 39h0M32 39h0M38 39h0" ${D(c)}/>`,
    editor: c => `<path d="M22 17h14l7 7v21a2 2 0 0 1-2 2H22a2 2 0 0 1-2-2V19a2 2 0 0 1 2-2z" ${S(c)}/><path d="M26 31h12M26 38h8" ${A(c)}/>`,
    calendar: c => `<rect x="18" y="20" width="28" height="26" rx="4" ${S(c)}/><path d="M18 28h28" ${A(c)}/><path d="M26 16v6M38 16v6" ${S(c)}/><path d="M26 36h0M32 36h0M38 36h0" ${D(c)}/>`,
    images: c => `<rect x="17" y="19" width="30" height="26" rx="4" ${S(c)}/><circle cx="26" cy="27" r="2.6" fill="${c.accent}"/><path d="M19 42l9-8 6 5 5-4 8 7" ${A(c)}/>`,
    music: c => `<path d="M27 40V22l16-3v18" ${S(c)}/><circle cx="23" cy="41" r="4" fill="${c.accent}"/><circle cx="39" cy="38" r="4" fill="${c.accent}"/>`,
    videos: c => `<rect x="17" y="21" width="30" height="22" rx="4" ${S(c)}/><path d="M29 27l8 5-8 5z" fill="${c.accent}"/>`,
    software: c => `<path d="M20 26h24l-2 18a2 2 0 0 1-2 2H24a2 2 0 0 1-2-2z" ${S(c)}/><path d="M26 26v-3a6 6 0 0 1 12 0v3" ${A(c)}/>`,
    disks: c => `<rect x="17" y="22" width="30" height="20" rx="5" ${S(c)}/><path d="M23 32h10" ${A(c)}/><circle cx="41" cy="32" r="1.8" fill="${c.accent}"/>`,
    help: c => `<circle cx="32" cy="32" r="14" ${S(c)}/><path d="M27 28a5 5 0 1 1 7 4.5c-1.5.8-2 1.6-2 3" ${A(c)}/><circle cx="32" cy="41" r="1.9" fill="${c.accent}"/>`,
    trash: c => `<path d="M22 24l2 20a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2l2-20" ${S(c)}/><path d="M19 24h26M28 24v-3a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v3" ${A(c)}/>`,
};

/** The icon names (freedesktop / GNOME app ids) each glyph stands in for. */
export const CORE = {
    files: ['org.gnome.Nautilus', 'system-file-manager'],
    terminal: ['org.gnome.Console', 'org.gnome.Terminal', 'utilities-terminal', 'com.mitchellh.ghostty'],
    settings: ['org.gnome.Settings', 'preferences-system'],
    calculator: ['org.gnome.Calculator', 'accessories-calculator'],
    editor: ['org.gnome.TextEditor', 'org.gnome.gedit', 'accessories-text-editor'],
    calendar: ['org.gnome.Calendar', 'gnome-calendar'],
    images: ['org.gnome.Loupe', 'org.gnome.eog', 'eog'],
    music: ['org.gnome.Rhythmbox3', 'org.gnome.Music', 'rhythmbox'],
    videos: ['org.gnome.Showtime', 'org.gnome.Totem', 'totem'],
    software: ['org.gnome.Software', 'snap-store', 'ubuntu-software'],
    disks: ['org.gnome.DiskUtility', 'gnome-disks'],
    help: ['org.gnome.Yelp', 'help-browser', 'help-contents'],
    trash: ['user-trash', 'user-trash-full'],
};

/** A finished icon: plate plus glyph. */
export const coreIcon = (name, c) => svg(disc(c) + GLYPHS[name](c));

/** Any other app: its own icon (SVG text) on the same plate, scaled into the middle. Papirus and friends keep their drawing, Isobar adds the plate. */
export function plated(c, inner) {
    const root = inner.match(/<svg\b[^>]*>/)?.[0] ?? '';
    const num = re => parseFloat(root.match(re)?.[1] ?? '');
    const box = root.match(/viewBox="([^"]+)"/)?.[1] ?? `0 0 ${num(/\bwidth="([\d.]+)/) || 64} ${num(/\bheight="([\d.]+)/) || 64}`;
    const body = inner.replace(/^[\s\S]*?<svg\b[^>]*>/, '').replace(/<\/svg>\s*$/, '');
    return svg(disc(c) + `<svg x="13" y="13" width="38" height="38" viewBox="${box}">${body}</svg>`);
}

/** The loading wheel's three half-rings: how they look and how fast each turns (seconds per turn, direction, where it starts). */
export const spinnerRings = c => [
    {r: 25, w: 4.2, color: c.accent, dur: 1.2, dir: 1, from: 0},
    {r: 17, w: 3.6, color: c.glyph, dur: 1.8, dir: -1, from: 90},
    {r: 9, w: 3, color: c.accent, dur: 2.4, dir: 1, from: 200},
];

/** One half-ring as an SVG on its own, for a widget that turns it. */
export function ringSvg(ring, size = 64) {
    const a = (150 * Math.PI) / 180, x = 32 + ring.r * Math.cos(a), y = 32 + ring.r * Math.sin(a);
    return svg(`<path d="M${32 + ring.r} 32A${ring.r} ${ring.r} 0 0 1 ${x.toFixed(2)} ${y.toFixed(2)}" fill="none" stroke="${ring.color}" stroke-width="${ring.w}" stroke-linecap="round"/>`, size);
}

/** The loading wheel: the three half-rings of the logo, turning at their own pace. `t` freezes it at a moment in seconds (for filmstrip frames), otherwise it animates. */
export function spinner(c, size = 64, t = null) {
    return svg(spinnerRings(c).map(ring => {
        const path = ringSvg(ring).replace(/^<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '');
        const turn = t === null
            ? `<animateTransform attributeName="transform" type="rotate" from="${ring.from} 32 32" to="${ring.from + ring.dir * 360} 32 32" dur="${ring.dur}s" repeatCount="indefinite"/>`
            : '';
        const at = t === null ? 0 : ring.from + ring.dir * 360 * ((t / ring.dur) % 1);
        return `<g${t === null ? '' : ` transform="rotate(${at.toFixed(2)} 32 32)"`}>${path}${turn}</g>`;
    }).join(''), size);
}
