#!/usr/bin/env bash
# Gives this git worktree its own local Convex deployment.
#
# Worktrees get a copy of .env.local, which holds CONVEX_DEPLOYMENT. Without this
# script every worktree would push to the same deployment. Run it once per worktree,
# from inside the worktree. It refuses to leave the worktree pointing at a cloud
# deployment.
set -euo pipefail

cd "$(dirname "$0")/.."

ENV_FILE=".env.local"

# The main checkout's .env.local points at the team's dev deployment; never rewrite it.
if [ "$(git rev-parse --git-dir)" = "$(git rev-parse --git-common-dir)" ]; then
  echo "error: run this inside a git worktree, not the main checkout." >&2
  exit 1
fi

if [ ! -f "$ENV_FILE" ]; then
  echo "error: $ENV_FILE not found in $(pwd). Copy it from the main checkout first." >&2
  exit 1
fi

# 1. Drop every pointer to a shared deployment.
tmp=$(mktemp)
grep -vE '^(CONVEX_DEPLOYMENT|CONVEX_DEPLOY_KEY|CONVEX_URL|CONVEX_SITE_URL|NEXT_PUBLIC_CONVEX_URL|NEXT_PUBLIC_CONVEX_SITE_URL)=' "$ENV_FILE" > "$tmp" || true
cat "$tmp" > "$ENV_FILE"
rm -f "$tmp"
unset CONVEX_DEPLOYMENT CONVEX_DEPLOY_KEY CONVEX_URL CONVEX_SITE_URL NEXT_PUBLIC_CONVEX_URL NEXT_PUBLIC_CONVEX_SITE_URL

# 2. Start a fresh anonymous local deployment (writes CONVEX_DEPLOYMENT and
#    NEXT_PUBLIC_CONVEX_URL back into .env.local).
CONVEX_AGENT_MODE=anonymous npx convex dev --once

# 3. Refuse anything that is not a local deployment.
read_var() {
  grep -E "^$1=" "$ENV_FILE" | tail -n1 | cut -d= -f2- | tr -d '\r"'"'"
}
deployment=$(read_var CONVEX_DEPLOYMENT)
url=$(read_var NEXT_PUBLIC_CONVEX_URL)

case "$deployment" in
  anonymous:*|local:*) ;;
  *)
    echo "error: refusing to continue, CONVEX_DEPLOYMENT is not a local deployment." >&2
    exit 1
    ;;
esac
case "$url" in
  http://127.0.0.1:*|http://localhost:*) ;;
  *)
    echo "error: refusing to continue, NEXT_PUBLIC_CONVEX_URL is not a local address." >&2
    exit 1
    ;;
esac

# 4. Put the server keys on the new deployment.
"$(dirname "$0")/convex-env.sh"

echo "Worktree ready: local Convex deployment $deployment at $url"
