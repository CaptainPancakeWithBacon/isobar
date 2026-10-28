#!/usr/bin/env python3
"""Builds the edition for extensions.gnome.org: the same source without the dock and Coucou parts, with the settings that reach
outside the shell switched off by default. Output: dist/<uuid>.shell-extension.zip. Run from the repo root: python3 tools/pack_ego.py"""
import json, re, shutil, subprocess, sys, tempfile, pathlib

UUID = 'isobar@captainpancakewithbacon.github.io'
OFF_BY_DEFAULT = ['follow-scheme', 'swap-icons', 'swap-cursor', 'startup-colour', 'terminal-accent']
LEFT_OUT = ['lib/dock.js', 'lib/dock-plan.js', 'lib/coucou.js', 'lib/coucou-settings.js']
DESCRIPTION = (
    "Isobar takes its colours from your wallpaper: a transparent top bar with the time, workspace dots and the app in front, "
    "a big clock on the desktop, and shell menus and cards that go light or dark with the picture. It can also colour GNOME apps "
    "(libadwaita) to match.\n\n"
    "Everything that reaches outside the shell is a switch in the preferences: style GNOME apps (writes ~/.config/gtk-4.0/mist.css and "
    "imports it from gtk.css, removed when turned off); follow the wallpaper's brightness (sets GNOME's light/dark preference); "
    "switch Papirus and DMZ light and dark; keep Ubuntu's start-up colour at the wallpaper's average; share the accent colour in "
    "~/.cache/isobar/accent. The system-wide switches are off until you turn them on.\n\n"
    "No network access, no clipboard access, no telemetry.")

root = pathlib.Path(__file__).resolve().parent.parent
src, dist = root / 'extension', root / 'dist'

def strip_full(text):
    """Drop everything between // @full:start and // @full:end, markers included."""
    out, skipping = [], False
    for line in text.splitlines(keepends=True):
        if '// @full:start' in line: skipping = True
        elif '// @full:end' in line: skipping = False
        elif not skipping: out.append(line)
    if skipping:
        sys.exit('unbalanced @full markers')
    return ''.join(out)

with tempfile.TemporaryDirectory() as tmp:
    build = pathlib.Path(tmp) / 'build'
    shutil.copytree(src, build, ignore=shutil.ignore_patterns('gschemas.compiled'))
    for rel in LEFT_OUT:
        (build / rel).unlink()
    (build / 'extension.js').write_text(strip_full((build / 'extension.js').read_text()))

    schema = build / 'schemas' / 'org.gnome.shell.extensions.isobar.gschema.xml'
    xml = schema.read_text()
    for key in OFF_BY_DEFAULT:
        xml, n = re.subn(rf'(<key name="{key}" type="b">\s*<default>)true(</default>)', r'\1false\2', xml)
        if n != 1: sys.exit(f'schema key {key} not found')
    schema.write_text(xml)

    meta = json.loads((build / 'metadata.json').read_text())
    meta.update(uuid=UUID, description=DESCRIPTION)
    (build / 'metadata.json').write_text(json.dumps(meta, indent=2) + '\n')

    # nothing may still refer to a part that was left out (CSS selectors that style the dock's look are fine)
    leftovers = [f'{p.relative_to(build)}: {m}' for p in build.rglob('*.js') for m in re.findall(r"lib/dock|lib/coucou|CoucouSync|new Dock|dash-to-dock|@full", p.read_text())]
    if leftovers:
        sys.exit('left-out parts still referenced:\n  ' + '\n  '.join(sorted(set(leftovers))))
    for p in build.rglob('*.js'):
        subprocess.run(['node', '--input-type=module', '--check'], input=p.read_bytes(), check=True)

    dist.mkdir(exist_ok=True)
    zipfile = dist / f'{UUID}.shell-extension.zip'
    zipfile.unlink(missing_ok=True)
    subprocess.run(['gnome-extensions', 'pack', str(build), '--force', '--out-dir', str(dist),
                    '--extra-source=lib', '--extra-source=prefs.js'], check=True)
    built = dist / f'{UUID}.shell-extension.zip'
    print('built', built.relative_to(root), f'({built.stat().st_size // 1024} KB)')
