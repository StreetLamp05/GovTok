# US22 (#28): Check a fix clip against the original with Claude

Spec: §4.3.1 (plus §1.1.3 call shape, §2.1.1 fix fields, §3.1.2 `fixedByOrg`, §4.2.1 face/plate rule). Parent: F6 (#26).
Builds on: US5 (`verifyFix` signature, `fixAttempts` schema), US12 (`callClaudeJSON`, `ClaudeError.retryAfterMs`, `blobToImage`).

## Decisions
- **US3 before/after pairs don't exist** (US3 closed, but `scripts/fixtures/` has no media in any checkout). Following US12's precedent, `scripts/eval-fix.ts` is written against a documented `scripts/fixtures/fix-pairs.json` format and run when the pairs arrive. AC1 stays open until then.
- Pairs go in their own `fix-pairs.json`, not `labels.json`: US3 turned `labels.json` into an object keyed by file name, while `eval-screening.ts` reads an array. A separate file keeps the two evals from fighting over one shape.
- Verdict precedence in the prompt: `not_fixed` (different spot or problem still there) > `retake` (identifiable face or readable plate) > `verified`. A not_fixed clip is never published, so asking to re-film without a face would be noise, the same reasoning as §4.2.1's selfie exception.
- The prompt also gets the report's category and title as context (title escaped as untrusted data, since Claude wrote it from the poster's words).
- `beginCheck` (mutation) does the guard atomically: stop unless `checking`; a missing or non-`open` report marks the attempt `superseded`. `applyFixVerdict` re-runs the same guard, so two attempts racing on one report can't both close it.
- Retry: any error in the check schedules `verifyFix` again with `attempt + 1`, after `retryAfterMs` when Claude sent one (else 1 s). A second error marks the attempt `failed` with a reason for the person filming.
- `tests/convex/stubs.test.ts`: dropped the `verifyFix` stub-log assertions (the stub is gone). The scheduling half of that test still covers `verifyFix`.

## Plan
- [x] `convex/lib/fixPrompt.ts`: system prompt, JSON schema, BEFORE/AFTER content, `parseFixResult`, `checkFix`
- [x] `convex/fixVerificationDb.ts`: `beginCheck`, `applyFixVerdict`, `markFailed`
- [x] `convex/fixVerification.ts`: body of `verifyFix` (load, check, apply, retry once, fail)
- [x] `scripts/eval-fix.ts`: reads `fix-pairs.json`, prints expected vs actual
- [x] Tests: `tests/convex/fixVerification.test.ts` (convex-test, mocked SDK), `tests/convex/lib/fixPrompt.test.ts`
- [x] Verify: `npm test`, `tsc` (root and convex), lint, eval plumbing run
- [x] Local Convex push (user ran it 2026-10-25; codegen matched the hand edit)

## Progress (2026-10-25)
- Tests: 27 new (`tests/convex/fixVerification.test.ts` 16, `tests/convex/lib/fixPrompt.test.ts` 11). Full suite: 37 files, 278 tests, all passing.
- `tsc` (root and `convex/`) clean, `eslint .` clean.
- `eval-fix.ts` plumbing run on a synthetic pairs file in the scratchpad with an invalid key: it reached the API (401), listed the skip, printed `0/1 match, 1 skipped`, and exited 1.
- **Local Convex push not run:** the auto-mode permission classifier denied `scripts/with-node.sh convex dev --once`. `convex/_generated/api.d.ts` got the `lib/fixPrompt` lines by hand, matching what codegen writes. The user should run the push once.
- **Open:** AC1 (the eval over the real US3 pairs) waits for the before/after fixtures.

## Review fixes (round 1, 2026-10-25)
- `beginCheck` moved inside the `try` in `verifyFix`, so a transient error there ends in a retry or `failed` instead of leaving the attempt at `checking` (no practical convex-test hook for making that mutation throw, so no regression test).
- `markFailed` runs the same `claim` guard: an attempt whose report was closed by another fix is `superseded`, not `failed`. Regression test added.
- `scripts/eval-fix.ts` header: the face pair must show the same spot fully repaired (not_fixed outranks retake).
- Parent corrected to F6 (#26).
- Verified: 279/279 tests, tsc (root and convex), eslint.

## Review (2026-10-25)
- Verdict: NEEDS_INPUT. AC2 met with proof. AC1 is unchecked because the US3 before/after pairs don't exist.
- Left for the user: film the 4 pairs, write `fix-pairs.json`, run the eval; run the local Convex push; record the §4.3.1 decisions in the spec; the streetlight "visibly resolved" gap; whether to cap reason length; US23 handling of `failed`/`superseded`.

## Review decisions (user, 2026-10-25)
- AC1: keep open and run it later. The "after" images will be AI-edited, since real fixes take days to weeks. The format and the 4 cases are posted on US3 (#4).
- Recorded US22's verdict details in GOVTOK_DECISIONS.md §4.3.1 (precedence, category and title as context, failed and superseded).
- Night-only fixes: `not_fixed`, and the reason asks for a clip filmed after dark. Added to the prompt and to §4.3.1.
- Reasons are capped at 100 characters in code (`clampReason`), plus tests.
- Commented on US23 (#29): handle `failed` (with a reason) and `superseded` (no reason).
- Verified: 284/284 tests, tsc (root and convex), eslint.
- Still open: AC1. The local Convex push ran clean (user).
