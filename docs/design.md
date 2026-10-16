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
- The live terrain is the desktop background: a layer in `Main.layoutManager._backgroundGroup`, one per monitor, below the windows. Still unverified: a real session, several monitors with different sizes, fullscreen video and windows above it, the overview and the lock screen, `prefers-reduced-motion` (`Terrain.pause` exists but nothing calls it yet), and how it behaves with more than four ripples at once (the shader takes four).

## Terrain renderer: measured

Two renderers share the maths in `lib/terrain.js`. Same machine, 1280x800, redrawn at 30 fps for 5 s, in a headless shell (`ISOBAR_BENCH=1 ISOBAR_HEADLESS=1 tools/nested.sh --drive`) and in a nested one:

| Renderer | Extension JS per frame | Shell CPU, headless | Shell CPU, nested |
| --- | --- | --- | --- |
| none (forced redraws) | 0 ms | 4% of a core | 6% |
| cairo (`St.DrawingArea`) | 25 ms | 81% | 54% |
| shader (`Clutter.ShaderEffect`) | 0.16 ms | 4% | 5% |

Cairo's cost is mostly the full-monitor surface, not the number of lines: a 24 px grid with 9 levels still took 15.7 ms. The shader is the default.

What this does not show: GPU time. The paint stage timings only cover issuing draw calls, and the shell's GL driver could not be identified from inside the run (`libLLVM` is loaded, which software and some hardware drivers do). Check the real load on the laptop with a GPU monitor while the extension runs in the real session.

The shader and the JS maths agree: `tools/golden.js` compares a screenshot at a frozen moment with `sampleField` and needs recall and precision of 0.93; the shader scores 0.999 and 0.998, and a shifted constant scores 0.44 and 0.40.
- Cost of redrawing contours in GJS on every frame. Measure it, and fall back to a lower frame rate if needed.

## Method

Tests first. Pure logic (the contour tracing, token handling) lives in plain modules that run under `gjs` without the shell: `gjs -m tests/bar.test.js`.

The shell wiring is tested in a throwaway GNOME Shell with `tools/nested.sh --drive`. A test-only extension (`tools/driver/`) clicks through the bar with a virtual pointer, checks theme colours and the pill animation, and takes screenshots; `tools/no_orange.py` then checks the real pixels of the quick settings menu. Set `ISOBAR_HEADLESS=1` to run without a window, which is the reliable way: in a nested window your own mouse and keyboard can disturb the clicks. Set `ISOBAR_DRIVER_OUT=<dir>` for the log and screenshots.
