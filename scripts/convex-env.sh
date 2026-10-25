#!/usr/bin/env bash
# Copies the server-side keys from .env.local into the current Convex deployment.
# Usage: scripts/convex-env.sh [--prod]
#   (no flag)  the deployment .env.local points at (dev or local)
#   --prod     the production deployment (needs CONVEX_DEPLOY_KEY or a logged-in CLI)
set -euo pipefail

cd "$(dirname "$0")/.."

ENV_FILE=".env.local"
KEYS=(ANTHROPIC_API_KEY CLAUDE_MODEL GROQ_API_KEY GOOGLE_GEOCODING_KEY ADMIN_PASSCODE)

FLAGS=()
if [ "${1:-}" = "--prod" ]; then
  FLAGS=(--prod)
elif [ -n "${1:-}" ]; then
  echo "usage: scripts/convex-env.sh [--prod]" >&2
  exit 1
fi

if [ ! -f "$ENV_FILE" ]; then
  echo "error: $ENV_FILE not found. Copy .env.example to .env.local and fill it in." >&2
  exit 1
fi

for key in "${KEYS[@]}"; do
  line=$(grep -E "^${key}=" "$ENV_FILE" | tail -n1 || true)
  if [ -z "$line" ]; then
    echo "skip   $key (not in $ENV_FILE)"
    continue
  fi
  value="${line#*=}"
  value="${value%$'\r'}"
  value="${value%\"}"; value="${value#\"}"
  value="${value%\'}"; value="${value#\'}"
  if [ -z "$value" ]; then
    echo "skip   $key (empty)"
    continue
  fi
  npx convex env set ${FLAGS[@]+"${FLAGS[@]}"} -- "$key" "$value" >/dev/null
  echo "set    $key"
done
