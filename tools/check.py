"""Read the nested shell's accessibility tree and check the Isobar bar is in it."""
import datetime
import sys

import gi

gi.require_version('Atspi', '2.0')
from gi.repository import Atspi


def walk(node):
    yield node
    for i in range(node.get_child_count()):
        try:
            child = node.get_child_at_index(i)
        except Exception:
            continue
        if child:
            yield from walk(child)


desktop = Atspi.get_desktop(0)
names = []
for i in range(desktop.get_child_count()):
    app = desktop.get_child_at_index(i)
    if app and app.get_name() == 'gnome-shell':
        names = [n.get_name() for n in walk(app) if n.get_name()]

today = datetime.date.today().strftime('%a %-d %b')
expected = ['Workspace 1', 'Quick settings', today]
missing = [e for e in expected if e not in names]

print(f'{len(names)} named nodes in the shell tree')
for e in expected:
    print(('ok   ' if e not in missing else 'FAIL ') + e)
sys.exit(1 if missing else 0)
