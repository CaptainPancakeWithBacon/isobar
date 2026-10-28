# Isobar logo guidelines

## The idea

A solid half disc whose other half dissolves into contour lines: **light and dark in one shape**, drawn with the lines of an isobar map. It says what the interface does: it takes its colours from your wallpaper, in light or in dark.

The mark has **no colour of its own**. Where it can adapt, it takes the wallpaper's hue; where it cannot, it is ink or paper.

## Files

| File | Use |
| --- | --- |
| `symbol/isobar-symbol.svg` | Master symbol. 48 px and up. |
| `symbol/isobar-symbol-small.svg` | Two lines instead of three. 24 to 47 px. |
| `symbol/isobar-symbol-favicon.svg` | Heaviest lines. Below 24 px: tab icon, tray icon. |
| `symbol/isobar-symbol-reversed.svg`, `-favicon-reversed.svg` | Thinner lines for light on dark. Light always looks heavier. |
| `symbol/*-black`, `*-white`, `*-mono-101418`, `*-square`, `*-app-icon` | One-colour, square and app-icon versions. SVG and PNG. |
| `symbol/favicon.svg` | Theme-aware favicon: a dark mark in light mode, a light mark in dark mode. |
| `symbol/favicon.ico`, `favicon-16/32/48.png`, `apple-touch-icon.png`, `icon-192/512.png`, `maskable-512.png`, `site.webmanifest`, `head-snippet.html` | The web icon set. These use the dark rounded tile, so they read on any tab or home screen. |
| `horizontal/isobar-horizontal.svg` | Symbol and wordmark side by side. The default logo. |
| `stacked/isobar-stacked.svg` | Symbol above the wordmark. For square spaces. |
| `wordmark/isobar-wordmark.svg` | The word alone. |
| `isobar-adaptive.png` | The mark taking its colour from four different wallpapers. |
| `board/board.html` | Presentation board with mockups. Open it in a browser. |
| `src/` | The scripts that draw the symbol cuts and the lockups. |

Masters are filled outlines with no live text and no strokes. Each lockup has `-black`, `-white` (from the thinned reversed drawing) and `-mono-101418` versions.

## Colour

The static palette is also the default look of Isobar itself.

| Name | Hex | Use |
| --- | --- | --- |
| Ink | `#101418` | The logo on light. Dark cards and tiles. |
| Paper | `#F6F8F9` | The logo on ink. Light cards. |
| Fog | `#DDE2E6` | Backgrounds. |
| Slate | `#4A5764` | Secondary text. |

Contrast: ink on paper 17.4 to 1, ink on fog 14.2 to 1, slate on paper 6.9 to 1, slate on fog 5.7 to 1.

### Adaptive colour

Wherever Isobar can read the wallpaper (the extension, the README header on a theme-aware surface, the login screen), the mark is drawn in the wallpaper's own **accent** and the wordmark in the card's text colour. The accent is chosen so that it keeps at least 4.5 to 1 against its card, in light and in dark, for any hue. See `isobar-adaptive.png`.

Wherever it cannot (print, a favicon, someone else's website), use ink on light and paper on dark. Never pick a brand colour by hand: a fixed hue would be wrong on most wallpapers.

## Clear space

Keep a margin equal to a quarter of the symbol's height on every side, which is about the width of the outer ring and its gap together.

## Minimum size

| Version | Minimum |
| --- | --- |
| Master symbol | 48 px |
| Small symbol | 24 px |
| Favicon symbol | 16 px |
| Horizontal logo | 96 px wide |
| Wordmark | 64 px wide |

Below 16 px do not use the logo; use the favicon tile.

## Type

The wordmark is **Inter Display Medium**, all lowercase, tracking minus 2 percent, drawn as outlines (Inter is licensed under the SIL Open Font License). It is round and even, which suits the circle and the line weight of the rings. For text beside the logo use Inter.

## Do

- Use the cut that matches the size band. The master turns to noise at 16 px.
- Use the reversed drawing on dark backgrounds.
- Let the mark take the wallpaper's hue where the interface allows it.

## Do not

- Use two hues in one mark, or give the two halves different colours.
- Add a gradient, shadow, glow or outline.
- Rotate, flip or stretch the mark. The solid half is on the left.
- Put the master symbol under 48 px or the favicon cut above 48 px.
- Place the logo on a background with less than 4.5 to 1 contrast against the mark's colour.
- Recreate the wordmark in another font or by hand.

## Open items

- Pantone and CMYK values are not set; match them by eye when printing.
- No trademark or reverse-image search has been done. Do one before relying on the name and mark commercially.
