#!/usr/bin/env bash
# Runs a command under the repo's pinned Node major (.nvmrc), using an nvm install if the
# system Node is a different version.
# Convex's local backend only runs "use node" actions on Node 20/22/24, so a newer system
# Node can't push this project's functions.
#
#   scripts/with-node.sh npx convex dev --once
set -eo pipefail

root="$(cd "$(dirname "$0")/.." && pwd)"
want="$(tr -d '[:space:]' < "$root/.nvmrc")"
have="$(node -p 'process.versions.node.split(".")[0]' 2>/dev/null || true)"

if [ "$have" != "$want" ]; then
  # Put nvm's newest install of that major first on PATH. (Not `nvm use`: it refuses to run
  # under `npm run`, which sets npm_config_prefix.)
  nvm_dir="${NVM_DIR:-$HOME/.nvm}"
  bin="$(ls -d "$nvm_dir"/versions/node/v"$want".*/bin 2>/dev/null | sort -V | tail -n1 || true)"
  if [ -z "$bin" ]; then
    echo "error: this project needs Node $want (found ${have:-none}), and nvm has no Node $want install." >&2
    echo "Install nvm (https://github.com/nvm-sh/nvm), then run: nvm install $want" >&2
    exit 1
  fi
  export PATH="$bin:$PATH"
fi

exec "$@"
