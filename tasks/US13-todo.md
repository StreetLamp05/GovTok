# US13 (#16): Run the screening pipeline and apply the verdict

Spec: §4.2.1 (verdicts, failure, released by hand), §2.1.3 (status lifecycle), §1.1.2 (reverse geocoding), §1.1.3 (Claude input). Parent: F3 (#13).
Builds on: US5 (`screenReport` signature, schema), US11 (`transcribe`), US12 (`screenPost`, `SCREENING_FAILED_REASON`), US22 (the retry-once action/mutation split this card copies).

## Decisions
- The "media being screened" is `{clipStorageId, frameStorageIds}`. `applyVerdict` and `markFailed` drop their write unless the report is still `pending` with that exact media.
- Geocoding returns the `route` component's `short_name` (e.g. "Floyd Rd"), never a house number, because the street is public on the card (§7.1.1). It runs in parallel with transcription and image loading and has a 5 s timeout. Any failure (no key, HTTP error, `ZERO_RESULTS`) means no street, not a retry.
- Retry delay: `ClaudeError.retryAfterMs`. For Groq, `transcribe` (US11) only puts `retry-after` in its message ("Retry after N seconds."), so the delay is parsed from that. The default is 1 s, the same as US22.
- `markFailed` also clears `verdict`, so a stale verdict from before a retake can't show next to "screening failed".
- `rescreen` accepts `held` or `pending` (user decision, 2026-10-25; see below). It clears `verdict` and `reason`.
- `release` refuses anything not `held`, needs `force` for retake/emergency/reject, and bumps `lastActivityAt` except on samples.
- `tests/convex/stubs.test.ts` and `tests/convex/posts.test.ts` asserted on the stub's log line, so those assertions now check the real outcome (the same as what US22 did for `verifyFix`).

## Plan
- [x] `convex/screeningDb.ts`: `loadForScreening` (query), `applyVerdict`, `markFailed`, `rescreen`, `release`
- [x] `convex/screening.ts`: body of `screenReport` (load, geocode ∥ transcribe ∥ images, screenPost, apply, retry once, fail)
- [x] `tests/convex/screening.test.ts`: verdict → status mapping, routing, stale guard, retry-then-held, photos skip transcription, geocode failure, rescreen/release
- [x] Update stub assertions in `tests/convex/stubs.test.ts` and `tests/convex/posts.test.ts`
- [x] `scripts/try-screening.ts`: upload a fixture through `generateUploadUrl` + `createReport` on the local deployment, poll until open/held, print the elapsed time
- [x] Verify: `npm test`, `tsc` (root and convex), lint, local Convex push, e2e script, `npx convex run` for rescreen/release

## Progress (2026-10-25)
- Tests: `tests/convex/screening.test.ts` has 39 new tests. Full suite: 43 files, 383 tests, all passing. Mutation check: flipping `mute → held` and removing the media guard each fail the expected tests.
- `tsc` (root and `convex/`) and `eslint .` are clean. The local Convex push ran clean. Codegen's only `api.d.ts` change is the pre-existing `lib/clipLimit`/`lib/fixPrompt` sort order.
- **No US3 fixture media exists on this machine** (git-ignored and not supplied, the same gap as US12/US22). The e2e runs used a synthetic stand-in: a 5 s Chromium-recorded webm of a drawn pothole plus 6 frames, generated in the scratchpad.
- E2E on the local deployment (`scripts/try-screening.ts`):
  - Photo post: pending → **open in 3.5 s**: pass / pothole / Cobb DOT, street "Larry Ln" from Google.
  - Photo post with a "downed sparking power line" description: pending → **held in 5.6 s**, verdict emergency.
  - Video post: pending → **held "screening failed" in 3.3 s**. **The `GROQ_API_KEY` in `.env.local` returns 401 Invalid API Key**, so both tries failed. That live-exercised retry-then-held, but the video happy path is unverified live until the key is fixed.
- `npx convex run`: `release` opened the held emergency report and bumped `lastActivityAt`. It refused the "screening failed" report (no category) and an open report. `rescreen` sent an open report back to pending and it re-screened to open. Rescreening the failed video report held it again (Groq 401).
- `npx convex dev` is running in the background on this worktree's local deployment (port 3210).

## Review fixes (round 1, 2026-10-25)
- **Blocking:** `scripts/try-screening.ts` failed the root `tsc` (and so `next build`): its `[clip, ...frames]` destructure typed the frames as `string | undefined`. I had run root `tsc` before writing the script, so the earlier "clean" claim didn't cover it. Now fixed and re-checked.
- `rescreen` accepts only `held` (§2.1.3 allows held → pending only). Open and pending reports are refused, so an open report can't drop off the feed and a pending one can't be screened twice. This replaces the earlier "refuses only fixed" decision.
- `applyVerdict` passes `transcript` and `segments` explicitly, because Convex drops undefined arguments. A photo retake of a narrated video no longer keeps the old transcript. A missing street still keeps the stored one (§1.1.2, "once per report").
- `markFailed` also clears `category`, `owner`, `agency`, `title` and `audioMuted`, so `release` can't publish media nobody screened.
- `tests/convex/stubs.test.ts` blanks `GOOGLE_GEOCODING_KEY`, so no shell key can trigger a billable call.
- Regression tests: rescreen refuses pending/open/fixed, a later pass clears audioMuted, a photo retake drops the transcript, a failed geocode keeps the street, and a failed rescreen clears the old result. Reverting each fix fails its test.
- Verified: 389/389 tests, tsc (root and convex), eslint. Pushed to the local deployment, and `rescreen` on an open report is refused live.

## Review (round 2, 2026-10-25)
- Verdict: NEEDS_INPUT. AC1 and AC3 are proven: 389/389 tests, and 11 of 12 deliberate code breaks failed the tests. The one that survived is behavior-equivalent. tsc (root and convex) and eslint are clean. `npx convex run` was exercised live. Nothing is blocking in the code.
- AC2 is partial. There's no US3 fixture on this machine, and the Groq key returns 401, so the video happy path has never run live.
- Left for the user: whether `rescreen` should also accept `pending`, the US25 `lastActivityAt` clash, stuck-`pending` recovery and timeouts, iPhone QuickTime clips (US11 `transcribe`), whether to geocode only once per report, whether `release` should warn on retake/emergency/reject, and recording US13's decisions in GOVTOK_DECISIONS.md.

## Review decisions (user, 2026-10-25)
- `rescreen` accepts `held` or `pending`, as the operator's escape hatch for a stuck "Checking…" report. Test added.
- Going public (from `applyVerdict` or `release`) skips the `lastActivityAt` bump on `isSample` reports, so US25's backdated order survives. Tests added.
- Stuck `pending`: handled by hand with `rescreen` for M0. The sweeper and request timeouts are deferred in §8.
- Geocode once: `loadForScreening` returns the stored street, and the action reuses it. A retry after a failed geocode tries again. Tests added.
- `release` needs `"force": true` for retake/emergency/reject, and the error names the verdict and reason. Tests added, and checked live (an emergency report was refused, then released with force).
- iPhone QuickTime: commented on US11 (#14, issuecomment-6395877290) and noted in §8.
- Recorded in GOVTOK_DECISIONS.md: §1.1.2 (street format, geocode once), §4.2.1 (the release/rescreen operator tools, failure clears the result), §5.1.2 (publish bump, samples excluded), §8 (stuck pending, QuickTime).
- Verified: 395/395 tests, tsc (root and convex), eslint. Reverting each decision fails its test (7 tests).
- Still open: AC2 needs a working `GROQ_API_KEY` and a real US3 fixture.

## AC2 re-run (2026-10-25, after the Groq key fix)
- The old `GROQ_API_KEY` was an xAI (`xai-`) key, not a Groq key. The user put a `gsk_` key in `.env.local`, I synced it with `scripts/convex-env.sh`, and Groq `/models` returned 200.
- Video post (synthetic 5 s webm + 6 frames): pending → **open in 5.5 s**, first try with no retry. Groq transcribed it (" ." for the tone-only clip), then Claude returned pass / pothole / Cobb DOT, street "Larry Ln".
- Still open for AC2's exact wording: a real US3 clip. Prod's `GROQ_API_KEY` is unchecked (the classifier blocks prod reads).
