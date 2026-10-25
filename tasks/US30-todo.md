# US30: Choose a post location by dropping a map pin

## Plan
- [x] Add the manual-pin decision to the spec and save US30 as a proposed M0 card under F2.
- [x] Add an explicit location-confirmation step before nearby lookup and capture; GPS (or DEMO_POINT) remains the default.
- [x] Add a small map picker with tap-to-place, confirm, cancel, and a clear configuration error.
- [x] Ensure a manually selected point bypasses unavailable GPS, is used for `nearbyOpen` and `createReport`, and cannot be replaced by a later location update.
- [x] Cover pin selection, cancellation, GPS failure, demo mode, duplicate lookup, and video/photo submission with tests.
- [ ] Run focused tests, typecheck, lint, and production build.

## Verification
- `tsc --noEmit`, focused ESLint, `next build`, and `git diff --check` passed.
- The focused Vitest run is blocked in this environment: the project requires Node 24.x, but the available runtime is Node 22.13.1. Vitest worker startup fails because the installed Undici version expects Node's `createZstdDecompress` API.
- No real GitHub issue was created and no deployment was run.

## Constraints
- The worktree started on `main` with a pre-existing modified `convex/_generated/api.d.ts`; preserve that change.
- Do not create or push a GitHub issue. The proposed card is in `.planning/M0-issues.json` for human review.
- Keep the picker separate from the reports map; no schema or backend changes should be needed.
