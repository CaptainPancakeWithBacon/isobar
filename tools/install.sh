#!/usr/bin/env bash
# User-level only: links the extension; enabling it is a separate, explicit step.
set -euo pipefail
ROOT=$(cd "$(dirname "$0")/.." && pwd)
mkdir -p ~/.local/share/gnome-shell/extensions
ln -sfn "$ROOT/extension" ~/.local/share/gnome-shell/extensions/mist@gijs.dev
echo "Linked. Log out and in once so the shell sees it, then: gnome-extensions enable mist@gijs.dev"
