// Libadwaita's own way to recolour its apps: named colours, overridden in ~/.config/gtk-4.0/gtk.css.
// (A GTK theme does nothing for libadwaita apps, which is why this is not one.) Pure text, tested under gjs.
// Both palettes are in one file, inside prefers-color-scheme blocks: GTK 4.20+ picks the right one and follows light/dark live.
import {SHAPE} from './gtk-shape.js';

function colours(p) {
    const shade = p.dark ? 'rgba(0, 0, 0, 0.36)' : 'rgba(0, 0, 0, 0.07)';
    const border = p.dark ? 'rgba(255, 255, 255, 0.10)' : 'rgba(0, 0, 0, 0.12)';
    return `    @define-color accent_color ${p.accent.text};
    @define-color accent_bg_color ${p.accent.bg};
    @define-color accent_fg_color #ffffff;

    @define-color window_bg_color ${p.ink};
    @define-color window_fg_color ${p.paper};
    @define-color view_bg_color ${p.view};
    @define-color view_fg_color ${p.paper};

    @define-color headerbar_bg_color ${p.header};
    @define-color headerbar_fg_color ${p.paper};
    @define-color headerbar_backdrop_color ${p.ink};
    @define-color headerbar_border_color ${border};
    @define-color headerbar_shade_color ${shade};

    @define-color sidebar_bg_color ${p.sidebar};
    @define-color sidebar_fg_color ${p.paper};
    @define-color sidebar_backdrop_color ${p.ink};
    @define-color sidebar_shade_color ${shade};

    @define-color card_bg_color ${p.card};
    @define-color card_fg_color ${p.paper};
    @define-color card_shade_color ${shade};

    @define-color dialog_bg_color ${p.ink};
    @define-color dialog_fg_color ${p.paper};
    @define-color popover_bg_color ${p.card};
    @define-color popover_fg_color ${p.paper};
    @define-color popover_shade_color ${shade};

    /* libadwaita 1.6+ reads CSS variables first; the names above are kept for GTK itself and older libadwaita */
    :root {
        --accent-color: ${p.accent.text};
        --accent-bg-color: ${p.accent.bg};
        --accent-fg-color: #ffffff;
        --window-bg-color: ${p.ink};
        --window-fg-color: ${p.paper};
        --view-bg-color: ${p.view};
        --view-fg-color: ${p.paper};
        --headerbar-bg-color: ${p.header};
        --headerbar-fg-color: ${p.paper};
        --headerbar-backdrop-color: ${p.ink};
        --headerbar-border-color: ${border};
        --headerbar-shade-color: ${shade};
        --sidebar-bg-color: ${p.sidebar};
        --sidebar-fg-color: ${p.paper};
        --sidebar-backdrop-color: ${p.ink};
        --sidebar-border-color: transparent;
        --sidebar-shade-color: ${shade};
        --secondary-sidebar-bg-color: ${p.ink};
        --secondary-sidebar-fg-color: ${p.paper};
        --secondary-sidebar-backdrop-color: ${p.ink};
        --card-bg-color: ${p.card};
        --card-fg-color: ${p.paper};
        --card-shade-color: ${shade};
        --dialog-bg-color: ${p.ink};
        --dialog-fg-color: ${p.paper};
        --popover-bg-color: ${p.card};
        --popover-fg-color: ${p.paper};
        --popover-shade-color: ${shade};
    }
`;
}

/** light and dark: the same wallpaper's palette forced into each mode */
export function gtkCss(light, dark) {
    return `/* Isobar, generated from your wallpaper. Do not edit: it is rewritten whenever the wallpaper changes. */
@media (prefers-color-scheme: light) {
${colours(light)}}

@media (prefers-color-scheme: dark) {
${colours(dark)}}
${SHAPE}`;
}

/** GTK3 apps ignore the libadwaita colours; they only get the window buttons, in the colours of whichever theme they are in. */
export const GTK3 = `/* Isobar: window buttons for GTK3 apps. Do not edit: it is rewritten by the extension. */
headerbar button.titlebutton,
.titlebar button.titlebutton {
    min-width: 14px;
    min-height: 14px;
    padding: 0;
    margin: 0 4px;
    border: none;
    border-radius: 999px;
    box-shadow: none;
    background-image: none;
    background-color: alpha(@theme_fg_color, 0.16);
}

headerbar button.titlebutton:hover,
.titlebar button.titlebutton:hover {
    background-color: @theme_fg_color;
}

headerbar button.titlebutton:active,
.titlebar button.titlebutton:active {
    background-color: alpha(@theme_fg_color, 0.7);
}

headerbar button.titlebutton:backdrop,
.titlebar button.titlebutton:backdrop {
    background-color: alpha(@theme_fg_color, 0.08);
}

headerbar button.titlebutton image,
.titlebar button.titlebutton image {
    opacity: 0;
}
`;
