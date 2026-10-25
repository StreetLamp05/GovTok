# US10: Offer Me too on nearby reports before posting (#12)

Spec: §4.1.2 (location-only 50 m duplicate check), §2.1.1 (me-too rows and counts).

## Plan
- [x] Add `convex/nearby.ts`: query open reports in a 50 m bounding box, confirm by haversine, return nearest three through the public report projection, and identify this resident's own posts without returning resident IDs.
- [x] Add `convex/meToos.ts`: authenticated-by-device-token, idempotent `meToo` mutation; own reports are no-ops and non-open reports are rejected.
- [x] Add `components/post/NearbyCheck.tsx` and integrate it before either video or photo capture in `PostFlow`; query-loading must not open the camera early, and no matches continue to the existing capture choices.
- [x] Add query, mutation, and post-flow tests, including 40 m/60 m, status filtering, ordering/limit, privacy, idempotency, own-post behavior, and navigation.
- [x] Regenerate Convex types; run focused tests, type checks, lint, build, and bundle check.

## Readiness
- US8 (#10), the only declared dependency, is merged into main. US9 (#11) has since merged; the duplicate check is kept ahead of its existing Video / Photos choice without changing the photo-picker implementation.
- Issue #12 is assigned to `jasnquyen`, matching the current card owner.
- Issue size is M; the specified behaviors are testable and match locked spec §4.1.2 and §2.1.1.

## Progress
- Created `US10-offer-me-too-on-nearby-reports-before-posting` from `origin/main` at `4dc91b3`; integrated the subsequent eight commits from `origin/main` to preserve US9's photo-post flow.
- Read US10, its F2 parent, the locked spec sections, and US8's merged implementation/tests.
- Latest focused verification passed: 33 tests across 4 files, including the merged PostFlow photo/video behavior. TypeScript check, ESLint, and Node 24 production build passed.
- Full Vitest coverage passed for the 52 files not requiring Windows shell execution: 494 tests passed (15 s per-test timeout). Two shell-dependent suites were excluded; `scripts/check-client-bundle.sh` passed when invoked through Git Bash.
- Merged Convex functions and schema successfully pushed to the existing anonymous local deployment; no shared cloud deployment was used.
- Environment note: Convex CLI reported saving the local deployment URLs to `.env.local`. Per user choice, keep that local-only configuration; the local backend process is no longer running.
- No commit or push has been made.

## Review fixes
- Verified the formerly unrun no-nearby PostFlow test under Node 24.
- Integrated the latest main flow so the nearby check gates both video and photo posting; the existing US9 capture choice and photo picker remain intact. Re-ran focused/full tests, type check, lint, build, bundle check, and local Convex validation.

## Review
- First review: AC1 and AC2 verified; AC3 had not been run under Node 24. Scope review flagged that the branch was behind current main and could conflict with US9's photo flow.
- After main integration, the follow-up reviewers confirmed US9's mode choice was preserved and branch integration was complete. They reported AC3 unverified because their runtime was Node 22; it was independently verified here under Node 24 in the 33-test focused run.
- Fixed the reported international-date-line edge case in nearby longitude filtering and added a regression test; the updated focused suite passes 34 tests across 4 files.
- Review evidence: nearby/me-too query and mutation tests pass; PostFlow no-results-to-capture test passes under Node 24; US9 Video / Photos flow remains after the nearby prompt. The full suite, TypeScript, lint, production build, bundle check, and local Convex validation passed after main integration.
- Remaining non-blocking observation: the proximity query scans open reports in the latitude band before longitude/distance filtering; revisit if report volume makes this query expensive.
- The reviewers' final machine verdict was `NEEDS_INPUT` because their environment lacked Node 24 to execute AC3 and because they treated untracked working-tree files as a PR-readiness blocker. AC3 was independently executed here and passed; the files remain uncommitted per project policy.
- An accidental merge commit created during integration was removed at the user's request with a mixed reset to `origin/main`; all US10 work remains in the working tree, unstaged and uncommitted.
