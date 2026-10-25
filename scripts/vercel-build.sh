#!/usr/bin/env bash
# Vercel build command (vercel.json). Every push builds, so every branch gets an HTTPS URL.
#   Production (main):  push Convex functions + schema to prod, then build Next.js against it.
#   Preview (branches): build Next.js only, against prod Convex. Branches never push functions
#                       or schema, so parallel branches can't overwrite prod or each other.
#                       A branch's new Convex functions reach prod only when it merges.
set -euo pipefail

cd "$(dirname "$0")/.."

if [ "${VERCEL_ENV:-}" = "production" ]; then
  # Authenticated by CONVEX_DEPLOY_KEY (Vercel Production env only); sets NEXT_PUBLIC_CONVEX_URL.
  exec npx convex deploy --cmd 'npm run build'
fi

if [ -z "${NEXT_PUBLIC_CONVEX_URL:-}" ]; then
  echo "error: NEXT_PUBLIC_CONVEX_URL is not set. Set it to the prod Convex URL in Vercel's Preview environment." >&2
  exit 1
fi
exec npm run build
