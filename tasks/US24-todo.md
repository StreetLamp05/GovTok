# US24: See my posts and me-toos on a private Me page (#31)

Spec: §5.4.1 (private Me page), §7.1.1 (resident privacy and muted-report projection).

## Plan
- [x] Add `convex/me.ts` owner-scoped `myReports` and `myMeToos` queries using the device token; return only owner/public projections and empty lists for unknown tokens.
- [x] Replace the Me stub with a resident-token-aware page and status cards for pending, held verdicts, open, and fixed reports.
- [x] Add Convex isolation/privacy tests and component tests for each status.
- [x] Verify focused tests (35 passed with related public-report regression tests), type check, lint, and production build.

## Dependency gaps
- US10 (me-too) and US19 (`RevealPlayer`) are merged and wired in (see below).
- US14 (`retakeReport` / `retryScreening`) is not on main. Retake and Try again render disabled. US14 can't touch `components/me/*`, so wiring these buttons needs a follow-up card blocked by US14.
- No Convex deployment push was run.

## Progress
- Created branch `US24-see-my-posts-and-me-toos-on-a-private-me-page` from current `origin/main`.
- Existing uncommitted Convex-generated files from the prior local `convex dev` run are preserved and not yet reviewed or altered.
- `npx convex codegen --typecheck disable` regenerated `api.d.ts` for `api.me`; the CLI documentation says codegen does not modify the deployed code.
- `tests/convex/me.test.ts`, `tests/components/me/MeReportCard.test.tsx`, `tests/convex/feed.test.ts`, and `tests/convex/lib/publicReport.test.ts`: 35 passed.
- `npm exec tsc -- --noEmit`, `npm run lint`, and the Node 24 production build passed.

## Review round 1 — NEEDS_INPUT
- Query isolation and unknown-token tests pass; privacy projections omit muted speech and do not expose resident IDs.
- Review found the component suite does not render every status, and the required fixed reveal and working Retake/Try again actions are unavailable.
- Direct verification resolved the reviewer's conflicting build reports: Node 24 production build, type check, and lint passed in this worktree.
- US10, US14, and US19 remain open dependencies. Completing their integrations here would widen scope into their stories; stopping now leaves required US24 behaviors incomplete.
- Decision needed: wait for dependencies and finish US24 afterwards, or explicitly expand scope to implement the dependencies first.

## Merge of origin/main (incl. US10)
- Merged `origin/main` (US8, US9, US13, US17, US19, US22, US23, US10). Only conflict was `convex/_generated/api.d.ts`; resolved by taking main's version and re-adding the `me` module.
- US10's `meToos.meToo` mutation writes the same `meToos` rows (`reportId`, `residentId`, `createdAt`) that `me.myMeToos` reads, so no code change was needed. Added a test that runs the real mutation and checks it appears in `myMeToos` with the bumped count, and that a poster's own me-too is a no-op.
- US10 is no longer a gap. US14 (retake/retry) is still open. `RevealPlayer` now exists on main (US19) but the Me page does not use it yet.
- Verified under Node 22 (Node 24 not installed here): convex, lib and Me component suites 274+ passing, `tsc --noEmit` and `eslint .` clean. Other component suites could not start their worker on Node 22 (undici error), so they are not run here.

## Wiring existing dependencies (after main merge)
- No merge conflicts remain; the merge is staged, not committed.
- Wired US19's `RevealPlayer` into `MeReportCard`: fixed items show "Play the fix", which plays the standalone reveal (fix clip always muted). Reveal views are not recorded from the Me page.
- Retake / Try again stay disabled: US14's `retakeReport` / `retryScreening` aren't on main. Out of scope per user.
- Added component tests rendering each status (pending, retake, reject, emergency, screening failed, open, me-too, fixed + reveal) and a Convex test that runs US10's real `meToo` mutation into `myMeToos`.
- Verified with Node 24 via `npx node@24`: full Vitest 514 passed; the only failures are `tests/vercel.test.ts` and `tests/scripts/check-client-bundle.test.ts`, which shell out to bash and don't run on this Windows shell. `tsc --noEmit`, `eslint .`, and `next build` pass.

## Review fixes (round 2)
- Re-staged the merge: the staged `api.d.ts` had the `me` module twice; the latest US24 files were unstaged.
- Status chip reuses the feed's `statusText` ("Open · today", "Fixed same day", plain "Fixed" without `fixedAt`), so it matches the reveal stamp.
- "My posts" sorts by `createdAt`, so a neighbor's me-too no longer reorders it.
- Uses `SCREENING_FAILED_REASON` instead of a hardcoded string.
- Tests: the muted check now uses a fixture with a transcript and description; other-token check asserts the exact row; me-toos omit verdict/reason; owner sees verdict/reason; ordering test; same-day labels; fixed me-too card.
- Me-page reveals don't record reveal views (§6.2.1 leaves this to US24).
- Verified (Node 24): 519 tests pass; only the bash-script suites (`vercel.test.ts`, `check-client-bundle.test.ts`) fail on Windows. `tsc`, `eslint .` and `next build` pass.
