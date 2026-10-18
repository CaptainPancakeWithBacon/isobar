#!/usr/bin/env python3
"""Install or remove Isobar's hooks for an agent. Usage:
  install.py claude [--home DIR] [--remove]     merges into ~/.claude/settings.json
  install.py opencode [--home DIR] [--remove]   writes ~/.config/opencode/plugins/isobar.ts
  install.py copilot --repo DIR [--remove]      writes DIR/.github/hooks/isobar.json (per repository)
Only entries that mention relay.py are ever touched. Run it for your own home only when you mean to."""
import argparse
import json
import os

HERE = os.path.dirname(os.path.abspath(__file__))
RELAY = f'{HERE}/relay.py'
CLAUDE_EVENTS = ['Notification', 'Stop']

OPENCODE = f'''// Installed by Isobar: tells the island when OpenCode is done or needs you.
export const Isobar = async ({{ $, directory }}) => ({{
  event: async ({{ event }}) => {{
    if (event.type === "session.idle" || event.type === "permission.asked")
      await $`python3 {RELAY} opencode ${{event.type}} --project ${{directory}}`.quiet().nothrow()
  }},
}})
'''


def claude(home, remove):
    path = f'{home}/.claude/settings.json'
    settings = json.load(open(path)) if os.path.exists(path) else {}
    hooks = settings.setdefault('hooks', {})
    for event in CLAUDE_EVENTS:
        groups = hooks.get(event, [])
        # drop ours first, so running twice leaves one
        for g in groups:
            g['hooks'] = [h for h in g.get('hooks', []) if 'relay.py' not in h.get('command', '')]
        groups = [g for g in groups if g['hooks']]
        if not remove:
            groups.append({'hooks': [{'type': 'command', 'command': f'python3 {RELAY} claude {event}'}]})
        if groups:
            hooks[event] = groups
        else:
            hooks.pop(event, None)
    if not hooks:
        settings.pop('hooks')
    os.makedirs(os.path.dirname(path), exist_ok=True)
    json.dump(settings, open(path, 'w'), indent=2)


def opencode(home, remove):
    path = f'{home}/.config/opencode/plugins/isobar.ts'
    if remove:
        if os.path.exists(path):
            os.remove(path)
        return
    os.makedirs(os.path.dirname(path), exist_ok=True)
    open(path, 'w').write(OPENCODE)


def copilot(repo, remove):
    path = f'{repo}/.github/hooks/isobar.json'
    if remove:
        if os.path.exists(path):
            os.remove(path)
        return
    os.makedirs(os.path.dirname(path), exist_ok=True)
    entry = lambda e: [{'type': 'command', 'bash': f'python3 {RELAY} copilot {e}', 'timeoutSec': 10}]  # noqa: E731
    json.dump({'version': 1, 'hooks': {'sessionEnd': entry('sessionEnd'), 'errorOccurred': entry('errorOccurred')}},
              open(path, 'w'), indent=2)


if __name__ == '__main__':
    ap = argparse.ArgumentParser()
    ap.add_argument('agent', choices=['claude', 'opencode', 'copilot'])
    ap.add_argument('--home', default=os.path.expanduser('~'))
    ap.add_argument('--repo')
    ap.add_argument('--remove', action='store_true')
    a = ap.parse_args()
    if a.agent == 'copilot':
        if not a.repo:
            ap.error('copilot hooks live in a repository: pass --repo DIR')
        copilot(a.repo, a.remove)
    else:
        {'claude': claude, 'opencode': opencode}[a.agent](a.home, a.remove)
    print(f'{"removed" if a.remove else "installed"} {a.agent} hooks')
