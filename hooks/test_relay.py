"""Checks for the agent relay and installer. Run: python3 hooks/test_relay.py"""
import json
import os
import subprocess
import sys
import tempfile

sys.path.insert(0, os.path.dirname(__file__))
from relay import event_for  # noqa: E402

HERE = os.path.dirname(os.path.abspath(__file__))
failed = 0


def check(label, actual, wanted):
    global failed
    ok = actual == wanted
    failed += not ok
    print(f"{'ok  ' if ok else 'FAIL'} {label}" + ('' if ok else f': {actual!r} (wanted {wanted!r})'))


proj = {'cwd': '/home/me/code/isobar'}
check('claude waiting for you needs you', event_for('claude', 'Notification', proj), ('Claude needs you', 'isobar', 'needs', 0))
check('claude stopping is done', event_for('claude', 'Stop', proj), ('Claude is done', 'isobar', 'done', 0))
check('claude events we do not show are ignored', event_for('claude', 'PreToolUse', proj), None)
check('opencode idle is done', event_for('opencode', 'session.idle', proj), ('OpenCode is done', 'isobar', 'done', 0))
check('opencode permission needs you', event_for('opencode', 'permission.asked', proj), ('OpenCode needs you', 'isobar', 'needs', 0))
check('copilot end is done', event_for('copilot', 'sessionEnd', proj), ('Copilot is done', 'isobar', 'done', 0))
check('copilot error is an error', event_for('copilot', 'errorOccurred', proj), ('Copilot hit an error', 'isobar', 'error', 0))
check('an unknown agent is ignored', event_for('banana', 'Stop', proj), None)
check('no project falls back to an empty subtitle', event_for('claude', 'Stop', {})[1], '')

# the relay never fails loudly: an agent must not be blocked by the island being away
r = subprocess.run([sys.executable, f'{HERE}/relay.py', 'claude', 'Stop'], input='not json', text=True,
                   capture_output=True, env={**os.environ, 'DBUS_SESSION_BUS_ADDRESS': 'unix:path=/nonexistent'})
check('the relay exits 0 when there is no island and the input is junk', r.returncode, 0)

# installer, against a throwaway home: merges, keeps what is there, and is idempotent
with tempfile.TemporaryDirectory() as home:
    os.makedirs(f'{home}/.claude')
    json.dump({'model': 'x', 'hooks': {'Stop': [{'hooks': [{'type': 'command', 'command': 'echo mine'}]}]}}, open(f'{home}/.claude/settings.json', 'w'))
    for _ in range(2):
        subprocess.run([sys.executable, f'{HERE}/install.py', 'claude', '--home', home], check=True, capture_output=True)
    s = json.load(open(f'{home}/.claude/settings.json'))
    cmds = [h['command'] for g in s['hooks']['Stop'] for h in g['hooks']]
    check('the installer keeps existing hooks and settings', ('echo mine' in cmds, s['model']), (True, 'x'))
    check('and adds ours once, however often it runs', sum('relay.py claude Stop' in c for c in cmds), 1)
    check('and the Notification hook is there', any('relay.py claude Notification' in h['command'] for g in s['hooks']['Notification'] for h in g['hooks']), True)
    subprocess.run([sys.executable, f'{HERE}/install.py', 'claude', '--home', home, '--remove'], check=True, capture_output=True)
    s = json.load(open(f'{home}/.claude/settings.json'))
    cmds = [h['command'] for g in s['hooks']['Stop'] for h in g['hooks']]
    check('--remove takes only ours away', cmds, ['echo mine'])
    subprocess.run([sys.executable, f'{HERE}/install.py', 'opencode', '--home', home], check=True, capture_output=True)
    plugin = open(f'{home}/.config/opencode/plugins/isobar.ts').read()
    check('the opencode plugin points at the relay', f'{HERE}/relay.py' in plugin, True)
    os.makedirs(f'{home}/repo')
    subprocess.run([sys.executable, f'{HERE}/install.py', 'copilot', '--repo', f'{home}/repo'], check=True, capture_output=True)
    c = json.load(open(f'{home}/repo/.github/hooks/isobar.json'))
    check('the copilot hook file has our hooks', sorted(c['hooks']), ['errorOccurred', 'sessionEnd'])

print('all passed' if not failed else f'{failed} failed')
sys.exit(1 if failed else 0)
