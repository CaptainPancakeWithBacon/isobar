# Releasing Isobar

What is left before this goes to extensions.gnome.org, and what to check each time.

## Build and check the zip

```bash
tools/pack.sh
```

Builds `dist/isobar@gijs.dev.shell-extension.zip` and fails if anything outside the extension itself is in it (tools, tests, docs, brand, prototype, agent hooks, a compiled schema) or if an import does not resolve inside the zip. The island, notification and music checks also pass when run from the unpacked zip:

```bash
U=$(mktemp -d); unzip -q dist/*.zip -d $U
ISOBAR_EXT_DIR=$U ISOBAR_ONLY=island ISOBAR_HEADLESS=1 ISOBAR_DRIVER_OUT=$(mktemp -d) tools/nested.sh --drive
```

## Decisions that are yours

- **uuid.** `isobar@gijs.dev` is only allowed if you own `gijs.dev`. Otherwise use a namespace you control, for example `isobar@captainpancakewithbacon.github.io`. Changing it means renaming `metadata.json`, `tools/nested.sh`, the driver and `tools/pack.sh`.
- **Versions.** `metadata.json` says `46` because that is all that has been run. Known changes for later versions, from the GNOME upgrade guides, none tried here:
  - 48: quick settings classes (`.quick-toggle-arrow`, `.quick-menu-toggle`) were renamed, which the stylesheet uses; `global.get_window_actors()` moved to `global.compositor` (already handled with a fallback).
  - 48: the message list was reworked; `Main.messageTray` signals used in `notifications.js` need checking.
  - 49: nested mode is gone, so `tools/nested.sh` needs `--devkit` or headless only.
- **Agent hooks** are outside the zip on purpose; the extension only exposes a D-Bus method.

## What the review will ask

- The extension creates everything in `enable()` and removes it in `disable()`; the notification, music and island parts each have a driver check that turns the extension off and on.
- It exports `org.gnome.Shell.Extensions.Isobar.Show` on the session bus. Any program of the user can show text on the island. The privacy toggle only limits what notifications show, not this method.
- It reads notifications and media-player track names and keeps nothing; there is no network access and no external process started by the extension.
- AI-assisted code is allowed if the author can explain it. Before submitting, read `terrain-layer.js` (timer and shader), `island.js` (layout, input region) and `notifications.js` (why `bannerBlocked` and `acknowledged` are both needed) until you can.
