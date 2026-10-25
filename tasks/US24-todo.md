# US24: See my posts and me-toos on a private Me page (#31)

Spec: §5.4.1 (private Me page), §7.1.1 (resident privacy and muted-report projection).

## Plan
- [x] Add `convex/me.ts` owner-scoped `myReports` and `myMeToos` queries using the device token; return only owner/public projections and empty lists for unknown tokens.
- [x] Replace the Me stub with a resident-token-aware page and status cards for pending, held verdicts, open, and fixed reports.
- [x] Add Convex isolation/privacy tests and component tests for each status.
- [x] Verify focused tests (35 passed with related public-report regression tests), type check, lint, and production build.

## Dependency gaps
- US24 is marked blocked by US10, US14, and US19 in `.planning/M0-issues.json`; all three are still open.
- The current codebase has no Me-too submission flow, retake/retry mutations, or `RevealPlayer`. Keep this card within its files and expose these missing integrations rather than implementing sibling-card behavior here.
- Retake and retry controls are visible but disabled with an explanation until US14 supplies their actions. Fixed reports are highlighted and link to the feed, but the feed's US19 reveal remains a stub.
- No Convex deployment push was run; the configured deployment target was not inspected, and a shared deployment must not be changed for this run.

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
