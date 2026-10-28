# Listing Isobar on extensions.gnome.org

The listing edition is built from the same source as the GitHub version. It leaves out the parts that GNOME's review guidelines are likely to reject, and it makes every behaviour that reaches outside the shell a switch in the preferences.

```bash
python3 tools/pack_ego.py        # writes dist/isobar@captainpancakewithbacon.github.io.shell-extension.zip
gjs -m tests/ego.test.js         # checks the zip against the rules below
```

## What differs from the GitHub edition

| | GitHub edition | Listing edition |
| --- | --- | --- |
| Dock management (`lib/dock*.js`) | yes | **left out**: it writes another extension's settings |
| Coucou sync (`lib/coucou*.js`) | yes | **left out**: it runs `pkill` and `setsid` and rewrites another app's settings |
| Style GNOME apps | on | on, with a switch |
| Follow brightness, Papirus/DMZ swap, start-up colour, shared accent | on | **off until switched on**, one switch each |
| Extension id | `mist@gijs.dev` | `isobar@captainpancakewithbacon.github.io` (a `username.github.io` namespace, as the rules allow) |

## The guidelines, one by one

Source: [GNOME Shell extension review guidelines](https://gjs.guide/extensions/review-guidelines/review-guidelines.html).

| Rule | Status |
| --- | --- |
| Create nothing and connect nothing at load time; do it in `enable()` | Done. The class has no constructor work, and `Gio.Settings` objects are created in `enable()`. |
| Undo everything in `disable()`: objects, signals, main-loop sources | Done. Signals go through one helper that records them, the clock timer is removed, actors are destroyed. Files Isobar wrote are removed. |
| Do not disable selectively | The listing edition always cleans up. (The GitHub edition skips restoring the dock while the screen is locked; that code is not in the listing edition.) |
| No `Gtk`, `Gdk` or `Adw` in the shell process; no `Clutter`, `Meta`, `St`, `Shell` in prefs | Done, and tested (`tests/ego.test.js`). |
| No deprecated modules (`ByteArray`, `Lang`, `Mainloop`) | Done, tested. |
| No obfuscated or minified code, no excessive logging, no telemetry, no binaries | Done. There is no logging at all, no network, no clipboard. |
| Subprocesses | None in the listing edition. |
| Other extensions | The shell stylesheet contains CSS selectors that style Ubuntu Dock's look, like any theme. No code touches another extension or its settings. |
| Settings schema base `org.gnome.shell.extensions` | Done: `org.gnome.shell.extensions.isobar`, path `/org/gnome/shell/extensions/isobar/`, file `<id>.gschema.xml` in the zip. |
| `metadata.json`: id, name, description, `shell-version`, `url`; no `version` | Done. `shell-version` lists only `50`. |
| `session-modes` only if needed | Not used. |
| Licence compatible with GPL-2.0-or-later | MIT, which the guidelines accept. |
| Package only what is needed | The zip has 13 files and 15 KB: `extension.js`, `prefs.js`, `metadata.json`, `lib/`, the schema. |
| No copyrighted or trademarked content | The logo is original. Papirus and DMZ are only named in text, never shipped. |
| Reviewable, explainable code; no AI bloat | See "Before you submit". |
| ESLint | **Not run yet.** `eslint.config.js` is in the repo; run `npx eslint extension` yourself. |

Things the guidelines do not settle, which a reviewer may still ask about: writing `~/.config/gtk-4.0/mist.css`, changing GNOME's light/dark, icon and cursor settings, and Ubuntu's `com.ubuntu.login-screen` key. All of them are switches, declared in the description, and the system-wide ones are off by default.

## Before you submit

1. **Read the code and be able to explain it.** GNOME added a rule that lets reviewers reject extensions with unnecessary code that shows signs of AI generation, and they ask the developer to explain the code. AI assistance is allowed, but the explanation has to be yours. Isobar was written with an AI assistant, so read [CODE-TOUR.md](CODE-TOUR.md) next to the source until you can answer every question in the list below without it. If a part looks unnecessary to you, tell me and I will remove it.
2. Run `npx eslint extension` and fix what it reports.
3. Test the packed zip once on your own session: `gnome-extensions install --force dist/*.zip`, log out and in, enable it, and open its preferences.
4. Take screenshots for the listing page: the ones in `docs/media/` work, and `docs/media/prefs.webp` shows the preferences window.

## Submitting

1. Make an account on extensions.gnome.org.
2. Use **Upload** (in the user menu) and choose the zip from `dist/`.
3. Add screenshots and check the description.
4. Wait. The GNOME 50 review queue was 400 to 500 extensions deep in April and May 2026, and each extension is handled by one reviewer, so plan for weeks. Smaller, simpler code is reviewed faster.
5. Answer reviewers yourself, in your own words. They can be reached on the extension's page and in the Extensions room on Matrix.

## Questions reviewers are likely to ask

| Question | Answer |
| --- | --- |
| Why write outside the extension's folder? | Four places, all declared: `~/.config/gtk-4.0/mist.css` and one import line in `gtk.css` (libadwaita apps can only be recoloured this way), and the same two things in `gtk-3.0` for the GTK3 window buttons, `~/.cache/mist/` for the shell stylesheet (St loads stylesheets from a file, and caches them by path, so each one gets a new name and the old is deleted) and `sample.json` (the 48 by 30 wallpaper thumbnail, so a 4K picture is not decoded on every login), and `~/.cache/isobar/accent`. Everything but the thumbnail is removed on disable; the thumbnail is a cache and is replaced when the wallpaper changes. |
| Why load a stylesheet instead of a theme? | The colours depend on the wallpaper, so the stylesheet is generated. It is loaded and unloaded through `St.ThemeContext` like other extensions do. |
| Why GdkPixbuf in the shell process? | To shrink the wallpaper to 48 by 30 pixels. It is not `Gdk` or `Gtk`. The thumbnail is kept in the cache folder because decoding a 4K picture takes about 250 ms. Unreadable images (animated XML wallpapers, broken files) fall back to the flat background colour; that is the `try/catch`, plus a small one that ignores a missing or damaged thumbnail file. |
| Why change light/dark, icons, cursor? | Optional, off by default, only touches Papirus or DMZ if already in use. |
| Why the Ubuntu key? | Optional and off by default: the shell paints a stock grey while starting, and on Ubuntu that colour is a setting. The schema is looked up first and skipped if missing. |
| What does the palette code do? | Plain arithmetic in `lib/palette.js`: average colour, hue from saturated pixels, light or dark from luminance, text colours checked for contrast. No network. |
| Is any code copied from another extension? | No. The shell stylesheet imports GNOME's own dark stylesheet and recolours it; the template was written for this project. |
