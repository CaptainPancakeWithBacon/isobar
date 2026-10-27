// What Mist adds on top of the shell template: a bar with no background, a big clock, the dots.
import {shellCss} from './shell-css.js';

const alpha = (hex, a) => {
    const [r, g, b] = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16));
    return `rgba(${r}, ${g}, ${b}, ${a})`;
};

export function mistCss(p) {
    const {text, muted, veil, veilColor} = p.bar;
    const bar = veil ? alpha(veilColor, veil) : 'transparent';
    return `${shellCss(p)}
/* Mist: the bar sits straight on the wallpaper. !important because Ubuntu's Yaru stylesheet paints it black. */
#panel,
#panel:overview {
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

#panel .panel-button:hover,
#panel .panel-button:focus,
#panel .panel-button:active,
#panel .panel-button:checked {
    background-color: ${alpha(text, 0.1)} !important;
    color: ${text} !important;
}

#panel .system-status-icon,
#panel .panel-button StIcon,
#panel:overview .panel-button StIcon {
    color: ${text} !important;
}

/* the search hint is stock-coloured and vanishes on a light card */
StLabel.hint-text,
.search-entry StLabel.hint-text {
    color: ${p.muted};
}

.search-entry StIcon {
    color: ${p.paper};
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
    color: ${text};
}

.mist-bigdate {
    font-size: 19px;
    color: ${muted};
}
`;
}
