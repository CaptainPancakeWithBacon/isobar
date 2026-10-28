# Isobar in the terminal

The mark as a logo for `fastfetch` (or `neofetch`), drawn with half-block characters from the real symbol.

| File | Use |
| --- | --- |
| `isobar-small.txt` | 22 px, 11 rows. For compact layouts such as the Catnap config. Drawn from the favicon cut. |
| `isobar.txt` | 40 px, 20 rows. The full logo. Drawn from the small cut. |
| `isobar-fetch` | `fastfetch` with this logo, in the colour of your wallpaper. |
| `isobar-status` | One line: `active, v0.1.0`, `installed, off, v0.1.0` or `not installed`. For a fastfetch module or your prompt. |
| `fastfetch-isobar.jsonc` | A config with plain-text labels (no icon font) that includes the Isobar line. |

## Try it

```bash
brand/terminal/isobar-fetch          # small logo
brand/terminal/isobar-fetch --big    # large logo
```

It uses your own fastfetch config for the info lines and only replaces the logo. The Isobar extension writes your wallpaper's accent colour to `~/.cache/isobar/accent`; the wrapper reads it. Without that file the logo uses the terminal's default colour.

## Show that Isobar is active

Install `isobar-status` somewhere on your `PATH` (`install -m755 brand/terminal/isobar-status ~/.local/bin/`) and add a module to your fastfetch config:

```jsonc
{ "key": "│ {#36}◐ isobar  {#keys}│", "type": "command", "text": "isobar-status" }
```

It reads the live state from GNOME and the version from the extension's `metadata.json`, so it is right even before the shell has reloaded the extension.

## Make it your permanent logo

In `~/.config/fastfetch/config.jsonc`:

```jsonc
"logo": {
    "source": "~/.local/share/isobar/isobar-small.txt",
    "type": "file",
    "color": { "1": "38;2;151;216;172" },   // fixed colour; use isobar-fetch to follow the wallpaper
    "padding": { "right": 2 }
}
```

## Regenerate

`python3 brand/src/gen_terminal_logo.py brand` (needs Inkscape and ImageMagick). Edit the sizes at the bottom of the script.
