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

## The island

The island is what Isobar is. It lives inside the extension, so anyone who installs Isobar has it; the standalone app it was first sketched for cannot anchor under the bar on GNOME, because Mutter has no layer-shell.

**Decided**
- At rest it is a white pill, always visible, 64x18 px, hanging 8 px into the bar. It costs nothing there: no timer runs.
- Events open it to 340x84 in ink with the title in large type; each opening ripples the terrain from the island's lower edge, and the ripple grows with the kind (`needs` 2.4, `error` 2.0, `done` 1.6, `info` 1.0).
- It replaces GNOME's notification banners, with the island switching that off again if hiding a banner stops working on a GNOME version. Showing both would put the banner and the island on the same spot.
- Privacy is a switch in quick settings next to Focus, with three levels: everything, title only, app name only. Events you send yourself, such as "Claude is done", stay readable.
- AI agents are served by one small relay that turns each agent's hook input into a `Show` call, plus an adapter and an installer per agent that shows the change, backs up the config and only then writes it. The hooks live in the repository, outside the extension zip, because extensions.gnome.org discourages scripts in the extension. Claude Code first, then OpenCode and Copilot CLI (not yet looked into), the rest untested. A relay must fail silently, be fast, send no content beyond short fields, and never chain a status line.

**Built so far (step 1):** the pill, opening and closing, the ripple, and `Show` over D-Bus, with its logic in `lib/island.js` (priority, queue, timing, ripple strength) and 15 unit tests, and 22 driver checks that call `Show` from a real D-Bus client and check sizes, colours, the ripple, the queue, long text, and that the D-Bus object and the actor are gone when the extension is off.

**Still to do:** notifications with the banner replaced, then the privacy switch, then music, then hover and click, then the hooks.

**Found while building:** GNOME 46's `St.BoxLayout` has no `orientation`; it arrives in 48, where `vertical` is deprecated. The island uses a Clutter layout manager so the same code runs on both.

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

### Real session, measured with `tools/measure.sh`

On the laptop, on battery, `power-saver`, a maximized app window over the primary monitor the whole time, 120 s each:

| Run | GPU busy | Battery | `gnome-shell` CPU |
| --- | --- | --- | --- |
| A, Isobar off | 9.1 % | 6.60 W | 20.6 % |
| A2, Isobar off, after a fresh login | 12.4 % | 7.50 W | 21.7 % |
| A3, Isobar off again | 12.8 % | 6.77 W | 21.8 % |
| B, Isobar on, Focus off | 30.0 % | 7.67 W | 20.1 % |

The baselines after the fresh login (A2, A3) agree within 0.4 points of GPU; A, taken before it, was lower. Battery power ranges from 6.60 to 7.50 W across the three baselines, so it is too noisy to read: B looks about 0.7 W higher, give or take half a watt. The GPU difference is not noise: the terrain costs about 17 points of GPU busy, and it does so while a maximized window hides it. Disabling the extension in the real session put the bar back (Activities visible again, no Isobar widgets, nothing in the shell log). The headless numbers above could not show this, because they only measured CPU. The shader needs to get cheaper, and it should stop drawing when it cannot be seen.

### Making it cheaper

Three changes after the real-session measurement above:

- A layer hides itself, and its shader stops running, while a normal window covers the whole work area of its monitor (checked twice a second).
- With nothing moving the terrain redraws at about 10 fps; it uses 30 fps while a ripple, a Focus change or a workspace change is running. The drift is about 8 px per second, so 10 fps looks smooth.
- The shader evaluates the height once per pixel instead of three times, takes the line width from screen derivatives, and skips ripples that are not there.

Checked in the headless shell: 10.0 fps idle, 30.0 fps with a ripple, zero frames while a maximized window covers the screen, a small window does not hide it, and the golden comparison still scores 0.999 and 0.998. Not yet measured in the real session: that needs a fresh login, because the shell keeps the old module code until then.

Measured in the real session after a fresh login, 120 s each, on battery in `power-saver`:

| Run | Situation | GPU busy | Battery | `gnome-shell` CPU |
| --- | --- | --- | --- | --- |
| A4 | app maximized, Isobar off | 12.2 % | 7.37 W | 20.1 % |
| B2 | app maximized, Isobar on, terrain hidden | 12.3 % | 7.27 W | 21.0 % |
| A5 | empty desktop, Isobar off | 0.9 % | 6.27 W | 1.6 % |
| D | empty desktop, Isobar on, terrain visible at 10 fps | 10.2 % | 6.87 W | 6.3 % |

Hidden, the terrain now costs nothing measurable (it cost 17 points of GPU before). Visible, it costs about 9 points of GPU, 5 points of CPU and 0.6 W; the battery figure is at the edge of the noise (about 0.5 W between runs). The cost is the compositor redrawing the whole screen, not the extension's JavaScript (0.15 ms per frame). With tiled windows and gaps the terrain is visible more often than on an empty desktop.

### Redraw rate at rest (`idle-fps`)

Empty desktop, fresh login, 120 s each, in this order, switching the setting live with `dconf write /org/gnome/shell/extensions/isobar/idle-fps N`:

| Run | GPU busy | Battery | `gnome-shell` CPU | Battery, corrected for drift |
| --- | --- | --- | --- | --- |
| A6, Isobar off | 0.9 % | 6.14 W | 1.6 % | |
| 10 fps | 10.3 % | 6.50 W | 6.5 % | about +0.4 W |
| 5 fps | 6.1 % | 6.39 W | 4.4 % | about +0.4 W |
| 2 fps | 3.3 % | 6.12 W | 3.2 % | about +0.15 W |
| 0 fps | 0.9 % | 5.89 W | 2.4 % | about 0 |
| A7, Isobar off | 1.0 % | 5.83 W | 1.5 % | |

The baseline battery power drifted down over the 14 minutes (6.14 W to 5.83 W), which lines up with the order of the runs, so the raw battery column flatters the low rates. The corrected column subtracts a straight line between A6 and A7 and is good to roughly 0.2 W. GPU and CPU did not drift (0.9 to 1.0 %, 1.5 to 1.6 %) and are the reliable numbers.

GPU cost is close to linear in the redraw rate, about 1 point per frame per second. At 0 fps it equals the baseline. CPU had a floor of about 0.8 points at 0 fps, probably the 30 Hz timer that kept ticking while nothing was drawn. The timer now plans its own next step and sleeps when nothing moves (see below). At 8 px of drift per second, 2 fps moves the lines in 4 px steps, 5 fps in 1.6 px steps.

### A timer that sleeps

The fixed 33 ms timer is replaced by one that plans its own next step: 33 ms while a ripple or an easing change runs, `1000 / idle-fps` ms at rest, and none at all when `idle-fps` is 0 or every layer is covered. Anything that changes what is on screen (a ripple, a workspace or Focus change, a new setting, a window starting or stopping to cover the monitor) wakes it. The animation clock only moves while the timer runs, otherwise the landscape would jump to a different pattern after a long sleep, the first time something woke it. A small 2 Hz timer checks for covering windows.

Checked in the headless shell (54 checks): the timer sleeps at `idle-fps` 0 and under a covering window, a ripple wakes it, and after 3 s of sleep and a wake the clock had moved 412 ms, which is the 400 ms the test waited.

Measured in the real session, empty desktop, fresh login, 120 s each, with a closing baseline to read the battery:

| Run | GPU busy | Battery | `gnome-shell` CPU | CPU before the change |
| --- | --- | --- | --- | --- |
| A8, Isobar off | 1.2 % | 6.35 W | 1.7 % | |
| 0 fps | 1.2 % | 6.27 W | 1.9 % | 2.4 % |
| 5 fps | 6.4 % | 6.46 W | 4.1 % | 4.4 % |
| 10 fps | 10.4 % | 6.83 W | 6.1 % | 6.5 % |
| A9, Isobar off | 0.9 % | 6.20 W | 1.6 % | |

At 0 fps Isobar is now level with the baseline: the CPU excess went from 0.8 points to 0.2 and the GPU excess is zero. At 5 and 10 fps the CPU is 0.3 to 0.4 points lower; the GPU is unchanged, as expected. The baseline battery fell by 0.15 W between A8 and A9; correcting for that, 10 fps costs about 0.6 W, 5 fps about 0.2 W and 0 fps nothing measurable (good to about 0.15 W).

### Part of the visible cost is Blur my Shell

On the same empty desktop at 10 fps, with only Blur my Shell's panel blur switched (`dconf write /org/gnome/shell/extensions/blur-my-shell/panel/blur false`, then `dconf reset`, which restored the key to unset):

| Run | GPU busy | `gnome-shell` CPU |
| --- | --- | --- |
| Isobar off | 1.0 % | 1.7 % |
| R1, Isobar on, panel blur on (the default) | 10.0 % | 6.5 % |
| R2, Isobar on, panel blur off | 6.1 % | 4.3 % |

R1 repeated the earlier 10 fps run (10.3 % and 6.5 %), so the numbers are steady. About 40 % of the added GPU and CPU is the panel blur: with `static-blur` off it samples what is behind the panel and blurs it again whenever that changes, and the terrain changes it every frame. The panel is an opaque ink strip, so nothing of the terrain behind it is ever seen. Starting the terrain below the panel should therefore take that cost away without touching anyone's settings. I tried it on the shader layer: the layer started below the panel (the panel box is 32 px high here) and the shader kept monitor coordinates through a `uTop` offset. In the headless shell the layer was 1280x768 at y=32 and the golden comparison still scored 0.999 and 0.998 (a wrong offset scored 0.36 and 0.34).

**It did not help.** Measured in the real session on the empty desktop with the panel blur left on: 10 fps gives 10.3 % GPU and 6.5 % CPU (R3, before the change 10.0 % and 6.5 %), and 5 fps gives 6.1 % and 4.5 % (before: 6.1 % and 4.4 %). So the panel blur does not cost what it costs because the terrain sits behind the panel; switching it off still saves about 40 %, but the reason is something else, probably per-frame work its effect and repaint hack do whenever the stage redraws. Blur my Shell uses the shell's own `Shell.BlurEffect` in background mode for this. The change was reverted because it earned nothing.

Found on the way: GNOME also disabled and re-enabled the test driver when the test switched Isobar off and on, so extensions listed after the toggled one may be cycled too. And after turning the extension back on the terrain started at the first workspace's landscape; it now starts at the current one.

The shader and the JS maths agree: `tools/golden.js` compares a screenshot at a frozen moment with `sampleField` and needs recall and precision of 0.93; the shader scores 0.999 and 0.998, and a shifted constant scores 0.44 and 0.40.
- Cost of redrawing contours in GJS on every frame. Measure it, and fall back to a lower frame rate if needed.

## Method

Tests first. Pure logic (the contour tracing, token handling) lives in plain modules that run under `gjs` without the shell: `gjs -m tests/bar.test.js`.

The shell wiring is tested in a throwaway GNOME Shell with `tools/nested.sh --drive`. A test-only extension (`tools/driver/`) clicks through the bar with a virtual pointer, checks theme colours and the pill animation, and takes screenshots; `tools/no_orange.py` then checks the real pixels of the quick settings menu. Set `ISOBAR_HEADLESS=1` to run without a window, which is the reliable way: in a nested window your own mouse and keyboard can disturb the clicks. Set `ISOBAR_DRIVER_OUT=<dir>` for the log and screenshots.
