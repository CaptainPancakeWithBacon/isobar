<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="brand/horizontal/isobar-horizontal-white.svg">
    <img alt="Isobar" src="brand/horizontal/isobar-horizontal-mono-0f2f33.svg" width="360">
  </picture>
</p>

A quiet, light desktop shell for GNOME on Ubuntu, drawn as a living contour map.

Isobar is a GNOME Shell extension. The top bar is a thin ink strip with workspace pills on the left and quick settings on the right. The desktop is made of contour lines that drift slowly and ripple when something happens: a workspace switch, a notification, the beat of the music. Turn on Focus and the terrain goes still.

**Status:** design prototype only. The extension itself is not written yet.

## Prototype

Open [`prototype/index.html`](prototype/index.html) in a browser. It needs no build step. Click the workspace pills, the date and battery in the bar, or anywhere on the terrain, and use the two buttons at the bottom to stand in for Coucou.

## Plan

See [`docs/design.md`](docs/design.md).

## License

MIT, see [`LICENSE`](LICENSE). The fonts used in the prototype, Big Shoulders Display and Schibsted Grotesk, are licensed under the SIL Open Font License and are loaded from Google Fonts.

## Logo

Files and rules are in [`brand/`](brand/GUIDELINES.md).

## Install for development

```bash
glib-compile-schemas schemas
ln -s "$PWD" ~/.local/share/gnome-shell/extensions/isobar@gijs.dev
gnome-extensions enable isobar@gijs.dev
```

On Wayland, log out and in once so the shell picks the extension up.
