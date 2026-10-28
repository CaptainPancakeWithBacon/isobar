// Isobar's shape language for GTK4 and libadwaita apps: large soft radii, flat quiet headers, pill controls, thin lines.
// It only uses the named colours (so it is the same in light and dark) and plain selectors, which keeps it small.
export const SHAPE = `
/* ---- shape ---- */
window.csd,
window.csd decoration {
    border-radius: 22px;
}

/* headers sit on the window instead of on a bar of their own */
headerbar,
.titlebar {
    background: @window_bg_color;
    box-shadow: none;
    border-bottom: none;
    min-height: 46px;
}

headerbar:backdrop {
    background: @window_bg_color;
}

headerbar .title,
windowtitle .title {
    font-weight: 500;
}

/* buttons: quiet by default, round, pill when they matter */
button {
    border-radius: 14px;
    box-shadow: none;
    border: none;
    background-image: none;
    background-color: alpha(@window_fg_color, 0.07);
    min-height: 34px;
    padding: 0 14px;
}

button:hover {
    background-color: alpha(@window_fg_color, 0.12);
}

button:active,
button:checked {
    background-color: alpha(@window_fg_color, 0.18);
}

headerbar button,
button.flat,
button.image-button.flat {
    background-color: transparent;
}

headerbar button:hover,
button.flat:hover {
    background-color: alpha(@window_fg_color, 0.09);
}

button.suggested-action,
button.pill {
    border-radius: 999px;
    padding: 0 22px;
}

button.suggested-action {
    background-color: @accent_bg_color;
    color: @accent_fg_color;
}

button.suggested-action:hover {
    background-color: mix(@accent_bg_color, @window_fg_color, 0.12);
}

button.circular {
    border-radius: 999px;
}

/* window buttons: small quiet circles; the glyph shows when you point at one, and the colours come from the palette.
   libadwaita stretches these buttons to the height of the header, so the button stays an invisible hit area and the
   14px circle is drawn inside it. */
windowcontrols button {
    min-width: 22px;
    padding: 0;
    margin-left: 2px;
    margin-right: 2px;
    background-color: transparent;
    background-image: radial-gradient(circle at center, alpha(@window_fg_color, 0.16) 6.5px, transparent 7.5px);
}

windowcontrols button image {
    -gtk-icon-size: 8px;
    opacity: 0;
}

windowcontrols button:hover {
    background-image: radial-gradient(circle at center, @window_fg_color 6.5px, transparent 7.5px);
    color: @window_bg_color;
}

windowcontrols button:hover image {
    opacity: 1;
}

windowcontrols button:active {
    background-image: radial-gradient(circle at center, alpha(@window_fg_color, 0.7) 6.5px, transparent 7.5px);
}

windowcontrols:backdrop button {
    background-image: radial-gradient(circle at center, alpha(@window_fg_color, 0.08) 6.5px, transparent 7.5px);
}

/* entries and search */
entry,
spinbutton,
searchentry,
.search-entry {
    border-radius: 14px;
    border: none;
    box-shadow: none;
    background-color: alpha(@window_fg_color, 0.07);
    min-height: 36px;
}

entry:focus-within,
searchentry:focus-within {
    background-color: alpha(@window_fg_color, 0.1);
    box-shadow: 0 0 0 2px alpha(@accent_bg_color, 0.55);
}

searchentry,
headerbar entry {
    border-radius: 999px;
}

/* lists, sidebars: rounded rows with room around them */
.navigation-sidebar row,
sidebar row,
list.navigation-sidebar > row {
    border-radius: 14px;
    margin: 2px 8px;
    padding: 4px 6px;
}

row:selected,
.navigation-sidebar row:selected,
listview > row:selected,
row.activatable:selected {
    background-color: alpha(@accent_bg_color, 0.2);
    color: @window_fg_color;
}

row:hover:not(:selected) {
    background-color: alpha(@window_fg_color, 0.06);
}

list.boxed-list,
.boxed-list,
.card,
.content {
    border-radius: 22px;
    border: none;
    box-shadow: 0 0 0 1px alpha(@window_fg_color, 0.08);
    background-color: @card_bg_color;
}

list.boxed-list > row {
    border-radius: 0;
    margin: 0;
}

/* menus and popovers */
popover > contents,
popover.menu > contents {
    border-radius: 22px;
    padding: 6px;
    border: none;
    box-shadow: 0 8px 28px rgba(0, 0, 0, 0.22), 0 0 0 1px alpha(@window_fg_color, 0.06);
}

popover modelbutton,
popover.menu modelbutton {
    border-radius: 12px;
    min-height: 34px;
    padding: 0 12px;
}

popover modelbutton:hover {
    background-color: alpha(@window_fg_color, 0.08);
}

/* switches, sliders, progress: thin and round */
switch {
    border-radius: 999px;
    border: none;
    background-color: alpha(@window_fg_color, 0.16);
    min-height: 26px;
    min-width: 46px;
}

switch:checked {
    background-color: @window_fg_color;
}

switch slider {
    border-radius: 999px;
    background-color: @window_bg_color;
    box-shadow: none;
    min-width: 22px;
    min-height: 22px;
    margin: 2px;
}

scale trough {
    min-height: 6px;
    border-radius: 3px;
    background-color: alpha(@window_fg_color, 0.14);
}

scale highlight {
    background-color: @window_fg_color;
    border-radius: 3px;
}

scale slider {
    min-width: 18px;
    min-height: 18px;
    border-radius: 999px;
    background-color: @window_fg_color;
    box-shadow: none;
    border: none;
}

progressbar trough,
levelbar trough {
    min-height: 6px;
    border-radius: 3px;
}

progressbar progress,
levelbar block {
    border-radius: 3px;
}

/* tabs and toggle groups */
tabbar tab,
notebook > header > tabs > tab {
    border-radius: 14px;
}

.linked > button {
    border-radius: 14px;
}

/* scrollbars: slim, no track */
scrollbar slider {
    min-width: 6px;
    min-height: 6px;
    border-radius: 999px;
}

/* dialogs */
window.dialog,
dialog-host,
messagedialog {
    border-radius: 24px;
}
`;
