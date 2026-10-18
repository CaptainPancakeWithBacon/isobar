<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="brand/horizontal/isobar-horizontal-white.svg">
    <img alt="Isobar" src="brand/horizontal/isobar-horizontal-mono-0f2f33.svg" width="360">
  </picture>
</p>

<p align="center"><b>A quiet, light GNOME Shell that draws itself as a living contour map.</b></p>

<p align="center">
  <img alt="GNOME Shell 46" src="https://img.shields.io/badge/GNOME_Shell-46-4a86cf">
  <img alt="Wayland" src="https://img.shields.io/badge/Wayland-tested-3d7a6b">
  <img alt="Status: early" src="https://img.shields.io/badge/status-early-e0a030">
  <img alt="License: MIT" src="https://img.shields.io/badge/license-MIT-0f2f33">
</p>

Isobar is an extension for GNOME Shell. The desktop is a contour map that drifts and ripples, the top bar is a thin ink strip, and a small pill under the bar, the **island**, opens for what matters: a notification, a song, an AI agent that needs you.

> **Early and personal.** It runs on one laptop and is checked by automated tests. [Read the status](#status-and-limits) before you install it.

<p align="center">
  <img alt="The island opens for a notification, then for an agent that needs you, and the terrain ripples from it" src="docs/media/island.gif" width="480">
</p>

## Why

GNOME is calm but plain, and most shell themes only repaint it. Isobar changes what the shell *does*: events arrive in one place, they move the whole desktop a little, and then they leave. An isobar is a line of equal pressure on a weather map, and the desktop is drawn with them.

## The island

- 🏝️ **A pill that opens for events.** It rests as a small white pill, grows wide and then tall, fades its ink in, and sends a ripple through the terrain. The ripple grows with how much the event matters.
- 🔔 **Notifications land there**, not in GNOME's banner, and stay in the message list.
- 🙈 **Privacy.** A toggle in quick settings decides how much a notification shows: everything, the title only, or just the app name.
- 🎵 **Music.** When a media player starts a new song, the island shows its title and artist.
- 🤖 **AI agents.** Claude Code, OpenCode and Copilot CLI can tell the island when they are done or need you.
- 👆 **Hover and click.** Rest the pointer on an open island to keep it open. Click it to dismiss it and move on to the next event.

## Looks

- 🎨 **Five light palettes**, picked from a menu in quick settings: mint, sand, sky, blush and stone. They change the terrain, bar, menus and island together.
- 🐣 **Coucou-aware.** If [Coucou](#coucou) is running, the terrain builds a summit under it and Isobar's own island steps aside, so nothing shows twice.
- 🗺️ **A contour desktop.** A shader draws the lines behind your windows. The terrain drifts slowly, ripples when you switch workspace or open quick settings, and calms down in Focus mode.
- 📏 **A different bar.** Workspace pills on the left (the current one is long), date and battery as one button that opens quick settings.
- 🖤 **Quick settings in ink and paper**, with Focus, Privacy and Palette toggles.
- 🔋 **Cheap when you are not looking.** The terrain hides while a window covers the screen, and can redraw rarely, or never, at rest.

<p align="center">
  <img alt="The five palettes: mint, sand, sky, blush, stone" src="docs/media/palettes.gif" width="640">
</p>

<p align="center">
  <img alt="The Palette menu open in quick settings" src="docs/screenshots/palette-menu.png" width="360">
  &nbsp;
  <img alt="The terrain with Focus off, then with Focus on" src="docs/screenshots/focus.png" width="420">
</p>

## Install

Isobar is not on extensions.gnome.org yet. You need GNOME Shell 46 on Wayland and `glib-compile-schemas` (package `libglib2.0-bin` on Ubuntu). Link the folder:

```bash
git clone https://github.com/CaptainPancakeWithBacon/isobar.git
cd isobar
glib-compile-schemas schemas
ln -s "$PWD" ~/.local/share/gnome-shell/extensions/isobar@gijs.dev
```

On Wayland, log out and in once so the shell finds the extension. Then:

```bash
gnome-extensions enable isobar@gijs.dev
```

The shell keeps the code it loaded until the next login, so after changing a file you need to log in again to see it.

### Uninstall

```bash
gnome-extensions disable isobar@gijs.dev
rm ~/.local/share/gnome-shell/extensions/isobar@gijs.dev
dconf reset -f /org/gnome/shell/extensions/isobar/
```

Disabling puts the bar back. GNOME may briefly disable and enable the extensions that come after Isobar in your list when you toggle it.

## Settings

Most settings are toggles in quick settings. All of them are also GSettings keys under `/org/gnome/shell/extensions/isobar/`, which change live:

| Setting | In quick settings | Key | Default |
| --- | --- | --- | --- |
| Colours of terrain, bar, menus and island | **Palette** menu | `palette`: `mint`, `sand`, `sky`, `blush`, `stone` | `mint` |
| Calm terrain | **Focus** toggle | `focus` | off |
| How much a notification shows | **Privacy** toggle, cycles on click | `privacy`: `all`, `title`, `app` | `all` |
| Notifications on the island instead of GNOME's banner | — | `replace-banners` | on |
| Step aside for Coucou, with a summit in the terrain under it | — | `coucou-aware` | on |
| Terrain redraws per second at rest (0 = still until something happens) | — | `idle-fps`, 0 to 30 | 10 |

```bash
dconf write /org/gnome/shell/extensions/isobar/idle-fps 5
```

The colours live in [`lib/palettes.js`](lib/palettes.js). The stylesheets in `palettes/` are generated from it with `gjs -m tools/gen-palettes.js`, and a test fails if they drift apart.

## Send your own events

Anything can send the island an event over D-Bus: it opens, ripples the terrain, and closes again.

```bash
gdbus call --session --dest org.gnome.Shell --object-path /org/gnome/Shell/Extensions/Isobar --method org.gnome.Shell.Extensions.Isobar.Show "Build finished" "isobar took 2m 14s" done 5
```

The arguments are a title, a subtitle, a kind and the number of seconds (0 for the default of that kind).

| Kind | Means | Default seconds | Ripple |
| --- | --- | --- | --- |
| `needs` | something is waiting for you | 10 | strongest |
| `error` | something failed | 8 | strong |
| `done` | something finished | 5 | medium |
| `info` | anything else | 4 | gentle |

A more important kind takes over once the current event has been shown for 1.5 seconds. The others queue, up to eight. Titles are cut at 60 characters and subtitles at 90. Events you send yourself are always shown in full, whatever the privacy level.

## AI agent hooks

One small relay ([`hooks/relay.py`](hooks/relay.py)) turns an agent's hook into a call to the island, and [`hooks/install.py`](hooks/install.py) sets the hook up. The hooks are not part of the extension, and nothing is installed until you run the installer.

| Agent | Shows | Install | Status |
| --- | --- | --- | --- |
| Claude Code | needs you (`Notification`), done (`Stop`) | `python3 hooks/install.py claude` | tested end to end through the relay, not with a live Claude Code session |
| OpenCode | needs you (`permission.asked`), done (`session.idle`) | `python3 hooks/install.py opencode` | written from its plugin docs, untested |
| Copilot CLI | done (`sessionEnd`), error (`errorOccurred`) | `python3 hooks/install.py copilot --repo DIR` | written from the GitHub hooks docs, untested; unclear whether the CLI runs them |

`--remove` takes them away again and only touches entries that mention `relay.py`. Cursor, Gemini CLI and Codex are not supported yet; the relay needs one new line in its table once their hook format is known.

## Things to try

| Do this | Isobar does this |
| --- | --- |
| Send a notification: `notify-send -a Mail "New message" "From Anna"` | the island opens, the message stays in the list |
| Send a critical one: `notify-send -u critical Backup "Disk almost full"` | a bigger ripple, longer on screen |
| Click **Privacy** twice, then send the same notification | only the app name shows |
| Start a song in any media player | title and artist on the island |
| Switch workspace | the terrain ripples and settles into a new landscape |
| Turn on **Focus** | the terrain calms to a third of its strength; ripples still show |
| Open a maximised window | the terrain stops drawing |

## How it works

- **Terrain:** a fragment shader (`Clutter.ShaderEffect`) draws the height field and its contour lines. JavaScript only passes a handful of numbers per frame. The same maths in plain JavaScript (`tools/reference-terrain.js`) is what the tests compare the pixels against.
- **Island:** an `St.Widget` in the top chrome with three layers (paper, ink that fades in, text). The logic of what to show and when is plain data in [`lib/island.js`](lib/island.js) with its own tests.
- **Notifications:** Isobar listens to every message-tray source, blocks GNOME's banner, and shows the notification on the island. If hooking fails, GNOME's banner is left alone, so a notification is never lost.
- **Colours:** one palette file; the stylesheets are generated from it.
- **Tests:** unit tests for the plain logic, and a test-only extension that drives a throwaway GNOME Shell: clicks, colours, animation requests, redraw rate, screenshots checked pixel by pixel.

More in [`docs/design.md`](docs/design.md).

## Status and limits

An early, personal project. Be careful with it.

- Written for **GNOME Shell 46** and tested on Ubuntu 24.04 on **Wayland**, by automated checks in a throwaway shell and by hand on one laptop with one monitor.
- **Not tested:** X11, other GNOME versions, several monitors (a layer is made per monitor, but that has not been looked at), windows with transparency, and the lock screen.
- **The island is new.** It has automated checks but has not been used on a real desktop for any length of time.
- Light colours only. The overview, the dock and the message list are not restyled.
- The island title uses Big Shoulders Display if it is installed, then a condensed system font, then the default font; an extension cannot load a font of its own.
- **It costs GPU while the terrain is visible.** On one AMD laptop, on battery in `power-saver`, an empty desktop at 10 fps used about 9 points more GPU, 4 to 5 points more CPU and roughly 0.6 W more than without Isobar. At 0 fps and while a window covers the screen the difference was not measurable. Blur my Shell's panel blur accounts for about 40 % of the visible cost if you use it. The numbers, and what did not help, are in [`docs/design.md`](docs/design.md).

## Development

Unit tests for the plain logic run under `gjs`:

```bash
for t in tests/*.test.js; do gjs -m $t; done
python3 hooks/test_relay.py
```

The shell itself is tested in a throwaway GNOME Shell that touches nothing of your session:

```bash
mkdir -p /tmp/isobar-run
ISOBAR_HEADLESS=1 ISOBAR_DRIVER_OUT=/tmp/isobar-run tools/nested.sh --drive
```

It needs `gnome-shell` 46, `gjs`, GTK 4, Python 3 with Pillow, and takes about three minutes. Without `ISOBAR_HEADLESS` it opens a nested window instead, but then your own mouse can disturb the clicks. `tools/measure.sh` averages GPU use, battery power and shell CPU over a number of seconds, and changes nothing.

`tools/pack.sh` builds the zip for extensions.gnome.org and checks what is in it; what is left before a release is in [`docs/releasing.md`](docs/releasing.md).

The animations above are made from real frames: run the driver with `ISOBAR_ONLY=demo` (without `ISOBAR_HEADLESS`: the headless shell plays animations about ten times too fast, so a window opens for about 40 seconds), then `python3 tools/make_gifs.py <output dir> docs/media`.

[`prototype/index.html`](prototype/index.html) is the first design sketch in a browser, with no build step. It predates the island and shows Coucou's pill in its place.

## Coucou

[Coucou](https://github.com/Louis-CFM/coucou) is a small companion that lives under the top bar (by Louis Raille; the author of this repository uses a fork). Isobar is meant to be the calm room around it. Isobar's own island is a fallback for when Coucou is not running.

While Coucou's island window is on screen, Isobar notices and:

- builds a summit in the terrain under it, with the contour lines circling it;
- keeps its own island hidden, and leaves notifications and music to Coucou, so nothing shows twice;
- still ripples the terrain for events it is sent.

Set `coucou-aware` to false to turn this off and always use Isobar's own island. Isobar does not include or depend on Coucou. Coucou's name, mascot and sounds belong to its author.

## Credits and license

MIT, see [`LICENSE`](LICENSE). Logo files and rules are in [`brand/`](brand/GUIDELINES.md). The prototype loads Big Shoulders Display and Schibsted Grotesk from Google Fonts, both under the SIL Open Font License. The wordmark is drawn from Inter Display, also under that licence.
