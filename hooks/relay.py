#!/usr/bin/env python3
"""Tells the Isobar island what an AI agent is doing. Usage: relay.py <agent> <event> [--project DIR]
An agent's hook runs this; it reads the hook's JSON on stdin if there is any and calls the island's D-Bus
method. It never fails loudly: the agent must not be blocked because the island is not there."""
import json
import os
import subprocess
import sys

NAMES = {'claude': 'Claude', 'opencode': 'OpenCode', 'copilot': 'Copilot'}
# (agent, event) -> (what the agent says, kind)
EVENTS = {
    ('claude', 'Notification'): ('needs you', 'needs'),
    ('claude', 'Stop'): ('is done', 'done'),
    ('opencode', 'permission.asked'): ('needs you', 'needs'),
    ('opencode', 'session.idle'): ('is done', 'done'),
    ('copilot', 'sessionEnd'): ('is done', 'done'),
    ('copilot', 'errorOccurred'): ('hit an error', 'error'),
}


def event_for(agent, event, payload):
    """(title, subtitle, kind, seconds) for the island, or None for an event we do not show."""
    what = EVENTS.get((agent, event))
    if not what:
        return None
    return (f'{NAMES[agent]} {what[0]}', os.path.basename((payload.get('cwd') or '').rstrip('/')), what[1], 0)


def main(argv):
    agent, event, rest = argv[1], argv[2], argv[3:]
    try:
        payload = json.loads(sys.stdin.read() or '{}') if not sys.stdin.isatty() else {}
    except ValueError:
        payload = {}
    if not isinstance(payload, dict):
        payload = {}
    if '--project' in rest:
        payload['cwd'] = rest[rest.index('--project') + 1]
    payload.setdefault('cwd', os.getcwd())
    shown = event_for(agent, event, payload)
    if shown:
        subprocess.run(['gdbus', 'call', '--session', '--dest', 'org.gnome.Shell',
                        '--object-path', '/org/gnome/Shell/Extensions/Isobar',
                        '--method', 'org.gnome.Shell.Extensions.Isobar.Show', *map(str, shown)],
                       capture_output=True, timeout=5, check=False)


if __name__ == '__main__':
    try:
        main(sys.argv)
    except Exception:  # noqa: BLE001 - see the docstring
        pass
