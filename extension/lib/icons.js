// Isobar's icon language, as pure functions: a palette goes in, SVG text comes out. Round plates (the logo is round), a few contour
// lines in the corner like a map, a simple glyph, the app's initial in the corner. All drawn here, nothing borrowed. The extension writes these into an
// icon theme; the preview board draws the same strings.

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
const DA = c => `fill="none" stroke="${c.accent}" stroke-width="4.4" stroke-linecap="round"`;
const T = c => `fill="none" stroke="${c.glyph}" stroke-width="2.8" stroke-linecap="round"`;
const F = c => `fill="${c.accent}"`;
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

    // ---- kinds of app ----
    browser: c => `<circle cx="32" cy="32" r="14" ${S(c)}/><path d="M18 32h28" ${A(c)}/><ellipse cx="32" cy="32" rx="6.5" ry="14" ${A(c)}/>`,
    mail: c => `<rect x="18" y="22" width="28" height="20" rx="4" ${S(c)}/><path d="M20 25l12 9 12-9" ${A(c)}/>`,
    chat: c => `<path d="M21 21h22a3 3 0 0 1 3 3v12a3 3 0 0 1-3 3H33l-7 6v-6h-5a3 3 0 0 1-3-3V24a3 3 0 0 1 3-3z" ${S(c)}/><path d="M26 30h0M32 30h0M38 30h0" ${DA(c)}/>`,
    code: c => `<path d="M26 23l-9 9 9 9" ${S(c)}/><path d="M38 23l9 9-9 9" ${S(c)}/><path d="M35 21l-6 22" ${A(c)}/>`,
    ide: c => `<rect x="17" y="20" width="30" height="24" rx="4" ${S(c)}/><path d="M26 20v24" ${A(c)}/><path d="M31 28h10M31 34h6" ${S(c)}/>`,
    database: c => `<ellipse cx="32" cy="23" rx="11" ry="4.5" ${S(c)}/><path d="M21 23v17c0 2.5 5 4.5 11 4.5s11-2 11-4.5V23" ${S(c)}/><path d="M21 31.5c0 2.5 5 4.5 11 4.5s11-2 11-4.5" ${A(c)}/>`,
    api: c => `<path d="M20 27h24l-6-6" ${A(c)}/><path d="M44 37H20l6 6" ${S(c)}/>`,
    spark: c => `<path d="M30 17l4 11 11 4-11 4-4 11-4-11-11-4 11-4z" ${F(c)}/><path d="M45 17v8M41 21h8" ${T(c)}/>`,
    notes: c => `<rect x="20" y="18" width="22" height="28" rx="4" ${S(c)}/><path d="M26 26h10M26 32h7" ${A(c)}/><path d="M40 38l8-8 3 3-8 8-4 1z" ${S(c)}/>`,
    book: c => `<path d="M32 24c-4-3-10-3-14-2v20c4-1 10-1 14 2 4-3 10-3 14-2V22c-4-1-10-1-14 2z" ${S(c)}/><path d="M32 24v20" ${A(c)}/>`,
    doc: c => `<path d="M22 17h14l8 8v20a2 2 0 0 1-2 2H22a2 2 0 0 1-2-2V19a2 2 0 0 1 2-2z" ${S(c)}/><path d="M26 25h6M26 32h14M26 38h14" ${A(c)}/>`,
    table: c => `<rect x="18" y="20" width="28" height="24" rx="3" ${S(c)}/><path d="M18 28h28M18 36h28M29 28v16" ${A(c)}/>`,
    slides: c => `<rect x="17" y="20" width="30" height="19" rx="3" ${S(c)}/><path d="M32 39v5M26 44h12" ${S(c)}/><path d="M25 33l5-5 3 3 6-6" ${A(c)}/>`,
    shapes: c => `<circle cx="27" cy="28" r="8" ${S(c)}/><rect x="30" y="29" width="14" height="14" rx="2" ${F(c)}/>`,
    sigma: c => `<path d="M42 21H24l10 11-10 11h18" ${A(c)}/>`,
    office: c => `<rect x="23" y="17" width="20" height="26" rx="3" ${S(c)}/><path d="M19 24v19a3 3 0 0 0 3 3h15" ${A(c)}/>`,
    brush: c => `<path d="M20 44l2-8 17-17 6 6-17 17z" ${S(c)}/><path d="M37 21l6 6" ${A(c)}/>`,
    pen: c => `<path d="M32 17l9 13-9 17-9-17z" ${S(c)}/><circle cx="32" cy="29" r="2.5" ${F(c)}/><path d="M32 32v10" ${A(c)}/>`,
    map: c => `<path d="M32 47s-11-9-11-18a11 11 0 0 1 22 0c0 9-11 18-11 18z" ${S(c)}/><circle cx="32" cy="29" r="4" ${F(c)}/>`,
    camera: c => `<rect x="17" y="23" width="30" height="21" rx="4" ${S(c)}/><circle cx="32" cy="33.5" r="5.5" ${A(c)}/><path d="M26 23l2-4h8l2 4" ${S(c)}/>`,
    key: c => `<circle cx="25" cy="32" r="7" ${S(c)}/><path d="M32 32h16M43 32v6M48 32v5" ${A(c)}/>`,
    shield: c => `<path d="M32 17l13 4.5v10c0 8.5-6 13-13 15.5-7-2.5-13-7-13-15.5v-10z" ${S(c)}/><path d="M26.5 32l4 4 7.5-8.5" ${A(c)}/>`,
    graph: c => `<path d="M20 19v26h27" ${S(c)}/><path d="M25 38l7-9 6 5 8-13" ${A(c)}/>`,
    pie: c => `<circle cx="32" cy="32" r="14" ${S(c)}/><path d="M32 32V18a14 14 0 0 1 13 9z" ${F(c)}/>`,
    sliders: c => `<path d="M20 25h24M20 32h24M20 39h24" ${S(c)}/><circle cx="36" cy="25" r="3.2" ${F(c)}/><circle cx="27" cy="32" r="3.2" ${F(c)}/><circle cx="38" cy="39" r="3.2" ${F(c)}/>`,
    puzzle: c => `<path d="M21 26h9a4 4 0 1 1 8 0h8v8a4 4 0 1 0 0 8v4H21z" ${A(c)}/>`,
    font: c => `<text x="32" y="42" text-anchor="middle" font-family="sans-serif" font-weight="700" font-size="24" fill="${c.glyph}">A<tspan font-size="16" fill="${c.accent}">a</tspan></text>`,
    omega: c => `<path d="M21 42h7c-5-3-8-6-8-11a12 12 0 0 1 24 0c0 5-3 8-8 11h7" ${A(c)}/>`,
    clock: c => `<circle cx="32" cy="32" r="14" ${S(c)}/><path d="M32 24v8l6 4" ${A(c)}/>`,
    phone: c => `<rect x="24" y="17" width="16" height="30" rx="4" ${S(c)}/><path d="M30 42h4" ${A(c)}/>`,
    share: c => `<circle cx="22" cy="32" r="4" ${F(c)}/><circle cx="41" cy="23" r="4" ${F(c)}/><circle cx="41" cy="41" r="4" ${F(c)}/><path d="M25 31l13-6M25 33l13 6" ${S(c)}/>`,
    wifi: c => `<path d="M18 29a20 20 0 0 1 28 0M23 34.5a12 12 0 0 1 18 0" ${S(c)}/><path d="M28.5 40a4.5 4.5 0 0 1 7 0" ${A(c)}/><circle cx="32" cy="44" r="1.8" ${F(c)}/>`,
    printer: c => `<path d="M25 28v-9h14v9" ${S(c)}/><rect x="19" y="28" width="26" height="12" rx="3" ${S(c)}/><rect x="25" y="36" width="14" height="9" rx="1.5" ${A(c)}/>`,
    scanner: c => `<rect x="18" y="34" width="28" height="9" rx="3" ${S(c)}/><path d="M22 28h20" ${A(c)}/><path d="M24 23l16 5" ${S(c)}/>`,
    updates: c => `<path d="M44 27a13 13 0 0 0-23-4" ${S(c)}/><path d="M44 19v8h-8" ${S(c)}/><path d="M20 37a13 13 0 0 0 23 4" ${A(c)}/><path d="M20 45v-8h8" ${A(c)}/>`,
    chip: c => `<rect x="24" y="24" width="16" height="16" rx="3" ${S(c)}/><path d="M29 20v4M35 20v4M29 40v4M35 40v4M20 29h4M20 35h4M40 29h4M40 35h4" ${A(c)}/>`,
    palette: c => `<path d="M32 18a14 14 0 1 0 0 28c3 0 4-2 3-4s0-4 3-4h5c3 0 4-2 4-5 0-8-6-15-15-15z" ${S(c)}/><circle cx="25" cy="30" r="2" ${F(c)}/><circle cx="32" cy="25" r="2" ${F(c)}/><circle cx="39" cy="29" r="2" ${F(c)}/>`,
    clipboard: c => `<rect x="22" y="21" width="20" height="25" rx="3" ${S(c)}/><rect x="27" y="17" width="10" height="7" rx="2" ${F(c)}/><path d="M27 33h10M27 38h7" ${S(c)}/>`,
    gamepad: c => `<g transform="translate(32 33) scale(.78) translate(-32 -33)"><path d="M22 24h20a9 9 0 0 1 9 9l1.5 7a4.5 4.5 0 0 1-8 3L41 38H23l-4.500 5a4.500 4.500 0 0 1-8-3L12 33a9 9 0 0 1 10-9z" ${S(c)}/><path d="M23 29v7M19.500 32.500h7" ${A(c)}/><path d="M40 30h0M44 34h0" ${DA(c)}/></g>`,
    cube: c => `<path d="M32 17l13 7.5v15L32 47 19 39.5v-15z" ${S(c)}/><path d="M32 32l13-7.5M32 32L19 24.5M32 32v15" ${A(c)}/>`,
    remote: c => `<rect x="17" y="21" width="30" height="19" rx="3" ${S(c)}/><path d="M26 46h12M32 40v6" ${S(c)}/><path d="M25 31h14M35 27l4 4-4 4" ${A(c)}/>`,
    radio: c => `<rect x="17" y="26" width="30" height="18" rx="4" ${S(c)}/><circle cx="27" cy="35" r="4.5" ${A(c)}/><path d="M36 33h7M36 37h5" ${S(c)}/><path d="M22 26l18-9" ${A(c)}/>`,
    play: c => `<circle cx="32" cy="32" r="14" ${S(c)}/><path d="M28 26l11 6-11 6z" ${F(c)}/>`,
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

const esc = t => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** An app nobody has drawn a glyph for: its initials, big, on the plate. */
const monogram = (c, letters) => {
    const t = esc(letters), big = Array.from(letters).length > 1 ? 19 : 25;
    return `<text x="32" y="${big > 20 ? 39.5 : 41}" text-anchor="middle" font-family="sans-serif" font-weight="700" font-size="${big}" fill="${c.glyph}">${t}</text><path d="M26 47h12" fill="none" stroke="${c.accent}" stroke-width="3.4" stroke-linecap="round"/>`;
};

/** An icon for any app: the glyph for what it does with its initial in the corner, or just its initials when there is no glyph. */
export function appIcon(c, glyph, letters) {
    if (!glyph || !(glyph in GLYPHS))
        return svg(disc(c) + monogram(c, letters));
    const badge = `<circle cx="46.5" cy="46.5" r="8.2" fill="${c.accent}"/><text x="46.500" y="50.600" text-anchor="middle" font-family="sans-serif" font-weight="700" font-size="11.500" fill="${c.plate}">${esc(Array.from(letters)[0] ?? '')}</text>`;
    return svg(disc(c) + GLYPHS[glyph](c) + badge);
}

/** A finished icon: plate plus glyph. */
export const coreIcon = (name, c) => svg(disc(c) + GLYPHS[name](c));

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
