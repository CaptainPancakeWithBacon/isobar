// What Isobar adds on top of the shell template: a bar with no background, a big clock, the dots.
import {shellCss} from './shell-css.js';

const alpha = (hex, a) => {
    const [r, g, b] = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16));
    return `rgba(${r}, ${g}, ${b}, ${a})`;
};

export function mistCss(p) {
    const {text, muted, veil, veilColor} = p.bar;
    const bar = veil ? alpha(veilColor, veil) : 'transparent';
    return `${shellCss(p)}
/* Isobar: the bar sits straight on the wallpaper. !important because Ubuntu's Yaru stylesheet paints it black. */
#panel,
#panel:overview {
    height: 28px !important;
    background-color: ${bar} !important;
    background-gradient-direction: none !important;
    box-shadow: none !important;
}

#panel .panel-button,
#panel:overview .panel-button,
#panel .panel-button.clock-display,
#panel:overview .panel-button.clock-display {
    color: ${text} !important;
    background-color: transparent !important;
    box-shadow: none !important;
}

/* pointing at anything in the bar fills it with the accent, and its icons and text turn white (white reads on every accent) */
#panel .panel-button:hover,
#panel .panel-button:focus,
#panel .panel-button:active,
#panel .panel-button:checked {
    background-color: ${p.accent.bg} !important;
    color: #FFFFFF !important;
}

#panel .system-status-icon,
#panel .panel-button StIcon,
#panel:overview .panel-button StIcon {
    color: ${text} !important;
}

#panel .panel-button:hover .system-status-icon,
#panel .panel-button:focus .system-status-icon,
#panel .panel-button:active .system-status-icon,
#panel .panel-button:checked .system-status-icon,
#panel .panel-button:hover StIcon,
#panel .panel-button:focus StIcon,
#panel .panel-button:active StIcon,
#panel .panel-button:checked StIcon,
#panel .panel-button:hover StLabel,
#panel .panel-button:focus StLabel,
#panel .panel-button:active StLabel,
#panel .panel-button:checked StLabel {
    color: #FFFFFF !important;
}

/* the search hint is stock-coloured and vanishes on a light card */
StLabel.hint-text,
.search-entry StLabel.hint-text {
    color: ${p.muted};
}

.search-entry StIcon {
    color: ${p.paper};
}

/* the dock's app-grid button is drawn in white by the dock itself, which vanishes on a light pill */
#dashtodockContainer .show-apps StIcon,
#dashtodockContainer .show-apps .overview-icon,
#dashtodockContainer #dash .show-apps StIcon,
#dash .show-apps StIcon {
    color: ${p.paper} !important;
    -st-icon-style: symbolic;
}

.mist-clock {
    font-size: 22px;
    font-weight: 300;
    color: ${text};
}

.mist-app {
    font-size: 15px;
    font-weight: 500;
    color: ${muted};
}

.mist-dot {
    background-color: ${muted};
    border-radius: 3px;
    height: 6px;
}

.mist-dot-active {
    background-color: ${text};
    border-radius: 4px;
}

.mist-bigclock {
    font-size: 132px;
    font-weight: 200;
    color: ${p.clock.text};
    text-shadow: 0 2px 22px ${p.clock.shadow};
}

.mist-bigdate {
    font-size: 19px;
    font-weight: 500;
    color: ${p.clock.muted};
    text-shadow: 0 1px 12px ${p.clock.shadow};
}
`;
}
