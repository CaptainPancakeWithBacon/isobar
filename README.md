# Mist

**The adaptive GNOME interface.** A GNOME 50 extension that takes its colours from your wallpaper, at all times.

- **Strip:** the top bar has no background. Time, workspace dots and the app in front on the left, the stock quick settings on the right.
- **Big clock** on the desktop, under the windows.
- **Cards** (quick settings, menus, calendar, overview search, dialogs) are light with dark text on a pale wallpaper and dark with light text on a dark one, tinted with the wallpaper's own hue. Change the wallpaper, or switch light/dark, and everything re-tints within a second.
- Bar text is dark or light, whichever reads better on the top of the wallpaper; a soft veil appears only when neither does.

`extension/lib/palette.js` turns wallpaper pixels into the palette (tested, `gjs -m tests/palette.test.js`).
`extension/lib/shell-css.js` is Isobar's shell template, fed with that palette; `mist-css.js` adds the strip.

## Try it without touching your session

```bash
MIST_WALLPAPER=/path/to/image.png MIST_WALLPAPER_2=/path/to/other.png tools/test.sh
```

Runs a throwaway headless shell (ubuntu mode), checks the bar, the clock, the dots and the restyle, and saves screenshots.

## Install

```bash
tools/install.sh        # links the extension into ~/.local/share/gnome-shell/extensions
gnome-extensions enable mist@gijs.dev
```

Undo: `gnome-extensions disable mist@gijs.dev`. Mist replaces the shell colours itself, so switch the User Themes theme back to Default first if you have one set, and turn off Blur My Shell's panel/popup styling, which overrides themes.

## Login screen

The login screen (GDM) is a separate shell that extensions can't reach. `gdm/build.sh` builds Yaru's login theme plus Mist's overrides
(your wallpaper darkened and blurred, no Ubuntu logo, a soft name card) into `gdm/build/gnome-shell-theme.gresource`, and
`tools/gdm-test.sh` checks it in a throwaway shell. Install it as a higher-priority alternative; Yaru stays installed:

```bash
sudo install -D -m644 gdm/build/gnome-shell-theme.gresource /usr/share/gnome-shell/theme/Mist/gnome-shell-theme.gresource
sudo update-alternatives --install /usr/share/gnome-shell/gdm-theme.gresource gdm-theme.gresource /usr/share/gnome-shell/theme/Mist/gnome-shell-theme.gresource 25
```

Undo: `sudo update-alternatives --remove gdm-theme.gresource /usr/share/gnome-shell/theme/Mist/gnome-shell-theme.gresource`.
The login screen shows a snapshot of the wallpaper from when you ran `gdm/build.sh`; run the build and the install again after changing it.
After a Yaru update, rebuild so the login theme picks up Yaru's changes.
