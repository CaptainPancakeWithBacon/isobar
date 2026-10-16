# Isobar design

## Target

GNOME Shell on Ubuntu (Wayland). Quickshell was ruled out: it needs `wlr-layer-shell`, which Mutter does not implement. Isobar is therefore a GNOME Shell extension written in GJS. Check `gnome-shell --version` and the extension metadata for the exact shell versions to support.

## Identity

- Light mode only.
- Contour lines are the one memorable element. Everything else stays quiet.
- No accent colour. The only highlight is paper white.
- Motion carries meaning: ripples mark events, switching workspace morphs the terrain, Focus calms it.

## Tokens

| Token | Value | Use |
| --- | --- | --- |
| ground | `#C8E0D8` | desktop |
| line | `#9CC6BB` | minor contour |
| major | `#6FA698` | every fourth contour |
| ink | `#0F2F33` | bar, expanded surfaces |
| paper | `#EAF4F0` | text on ink, active states |
| track | `#1F4A4F` | slider tracks, inactive toggles |

Type: Big Shoulders Display for numerals and headlines, Schibsted Grotesk for text. Both are OFL.

## Parts

- **Top bar:** workspace pills (active one is long), date and battery, which open quick settings.
- **Quick settings:** volume, brightness, Wi-Fi, Focus, Bluetooth, dropped from the right of the bar.
- **Island:** not part of Isobar. Coucou (a separate app) is the island and rests as a small white pill under the bar. Isobar only reacts to it.
- **Overview and app grid:** restyled in the same language. Not designed yet.
- **Notifications:** Coucou already reads them over D-Bus and hides the GNOME banners. Isobar should not duplicate that.

## Open questions

- How does Isobar learn that Coucou expanded, so the terrain can ripple? Options: Coucou emits a D-Bus signal, or Isobar watches the same notification stream. Not decided.
- The live terrain cannot be a wallpaper in GNOME. Candidates are the overview background or a lock-screen layer. Needs a spike.
- Cost of redrawing contours in GJS on every frame. Measure it, and fall back to a lower frame rate if needed.

## Method

Tests first. Pure logic (the contour tracing, token handling) lives in plain modules that run under `gjs` without the shell. The shell wiring is tested in `gnome-shell --nested --wayland`.
