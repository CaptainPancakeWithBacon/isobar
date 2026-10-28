# A tour of the code

This is for the person who has to explain it: what each file does, in the order the data flows. Read it with the source open. If something here is wrong, or something in the source is more than the job needs, say so and it gets fixed or removed.

The listing edition is the files marked with a star (★). The others only exist in the GitHub edition.

## The idea in one paragraph

When the extension is enabled, and every time the wallpaper or GNOME's light/dark setting changes, it shrinks the wallpaper to a 48 by 30 thumbnail, turns the pixels into a palette (surface colour, text colour, accent), writes that palette into two stylesheets (one for the shell, one for GNOME apps), and applies a few optional settings. Disabling it undoes everything.

## `extension/extension.js` ★ (the entry point)

A class with `enable()` and `disable()`. GNOME calls `enable()` when the extension turns on and `disable()` when it turns off.

**`enable()`** creates, in this order:
1. The settings objects: Isobar's own (`getSettings()`, from the schema), the wallpaper settings, GNOME's interface settings, and, if it exists, Ubuntu's `com.ubuntu.login-screen`.
2. The bar's left side: a label for the time, a row of workspace dots, and a label for the app in front. Activities and the date menu are hidden.
3. The big clock: a box with two labels, added to the layer behind the windows, placed from the monitor's work area.
4. Signals: workspace count and switches, focus changes, monitor changes. Each goes through `_connect()`, which records the object and the id so `disable()` can disconnect them all.
5. A timer that updates the clocks every 20 seconds.
6. Settings signals: wallpaper keys, colour scheme, and any of Isobar's own switches all call `_restyle()`.

**`_restyle(followWallpaper)`** is the main function: sample the wallpaper, build the palette, then (each only if its switch is on) set light/dark, swap Papirus/DMZ, share the accent colour, write the GTK stylesheet, set Ubuntu's start-up colour. Always: write the shell stylesheet to a new file in `~/.cache/mist/`, unload the old one, load the new one. The new file name each time is deliberate: the shell caches stylesheets by path.

**`disable()`** disconnects every signal, removes the timer, unloads the stylesheet, removes the GTK files, deletes the shared accent file, destroys the actors and shows Activities and the date menu again.

The code between `// @full:start` and `// @full:end` is the dock and Coucou parts. `tools/pack_ego.py` deletes those lines for the listing edition.

## `extension/lib/wallpaper.js` ★

`sample()` finds the wallpaper file (the dark one when GNOME is in dark mode and a dark wallpaper is set), asks GdkPixbuf to scale it to 48 by 30 pixels (decoding a 4K PNG takes about 250 ms on the shell's main thread, which stutters, so the result is kept in `~/.cache/mist/sample.json` per picture, keyed by path, size and change time: only a new wallpaper pays), and returns three lists of `[r, g, b]` pixels: the whole picture, the top 10 percent (under the bar), and a patch at the top left (under the big clock). If there is no file, or it cannot be read (an animated `.xml` wallpaper, a broken file), it returns the flat background colour instead. That `try/catch` and the small one around reading the kept result are the only two in the listing edition.

## `extension/lib/palette.js` ★ (the maths)

`paletteFrom(pixels, top, clock, mode)` returns one object with everything the stylesheets need. It has no GNOME imports, so it runs in the unit tests and on the website.
- `hexOf`, `toHsl`, `fromHsl`: colour conversions. Every colour string in the program comes out of `hexOf`, so only hex digits can ever reach a stylesheet.
- `luminance`, `contrast`: the WCAG formulas.
- `dominantHue`: the hue is the circular average of the pixels' hues, weighted by how saturated they are, so grey pixels have no say.
- Light or dark: dark if the picture's average luminance is below 0.2. The `mode` argument forces one, which is how the GTK stylesheet gets both.
- The surface colours are tints of the hue at fixed lightness steps; the text colour is nearly black or nearly white. The accent is the hue at a lightness lowered step by step until white text on it has 4.5 to 1 contrast, and a second version for use as text on the surface.
- Bar and clock text: dark or light, whichever has more contrast against the average colour of their own patch; if neither reaches 4.5 to 1 the bar gets a soft veil.

## `extension/lib/shell-css.js` ★ and `mist-css.js` ★

Template functions: a palette goes in, CSS text comes out. `shell-css.js` imports GNOME's own dark stylesheet and recolours menus, quick settings, the calendar, notifications, the overview, dialogs and so on. `mist-css.js` adds that on top: a transparent bar, the labels for the clock and dots, the dock's button colours. (The `mist` in names is the project's old working name; it is internal.)

## `extension/lib/gtk-css.js` ★, `gtk-shape.js` ★, `gtk.js` ★

GNOME's own apps (libadwaita) ignore GTK themes but read `~/.config/gtk-4.0/gtk.css`. `gtk-css.js` writes the palette as libadwaita's named colours and CSS variables, once inside `@media (prefers-color-scheme: light)` and once inside `dark`, so GTK picks the right one by itself, even live. `gtk-shape.js` is the shape language (radii, flat headers, round buttons, and small quiet window-control circles: libadwaita stretches those buttons to the header's height, so the button stays an invisible hit area and the 14px circle is a radial gradient drawn inside it) as one CSS string using only those named colours. GTK3 apps (older tools such as Disks) get only the window buttons, from a small fixed sheet (`GTK3` in `gtk-css.js`) that uses their own theme's colours. `gtk.js` writes `mist.css` next to your `gtk.css`, in both `gtk-4.0` and `gtk-3.0`,, adds one `@import` line to `gtk.css` (creating it if needed), and removes exactly that line and the file again.

## `extension/prefs.js` ★ and `schemas/` ★

The preferences window (one `Adw.SwitchRow` per setting, each bound to the schema key) and the schema that defines the six switches and their defaults.

## GitHub edition only

- `lib/dock-plan.js`, `lib/dock.js`: the dock profile. `dock-plan.js` is pure logic (what differs, what to remember); `dock.js` reads and writes the dock's GSettings, saves old values to `~/.cache/isobar/dock-previous.json`, restores them on disable.
- `lib/coucou-settings.js`, `lib/coucou.js`: if `~/.config/mist/coucou` exists, write the card colour into Coucou's settings. It stops Coucou first with `pkill`, writes the file, and starts Coucou again with its own launcher, because Coucou only reads that setting at start-up.

## Everything else in the repo

- `tests/`: unit tests for the pure parts, run with `gjs -m`. `tests/ego.test.js` builds the listing zip and checks it against the review rules.
- `tools/test.sh`, `session.sh`, `driver/`: a throwaway headless GNOME Shell with its own D-Bus session that loads the extension, changes the wallpaper, and checks the result. It refuses to run on your real session bus.
- `tools/pack_ego.py`: builds the listing zip.
- `docs/`, `brand/`, `gdm/`, `tools/build_site.py`, `tools/make_media.py`, `tools/terminal_shot.py`: the website, the logo, the optional login theme and the media scripts. None of it is in the extension.
