# US23: Record and submit a proof-of-fix clip, as a fixer or a neighbor (#29)

Spec: §4.3.1 (geofence, silent clip, Claude check), §4.3.2 (neighbors on non-city reports), §5.3.1 (fixer screen → Record fix → Checking…).
Depends on US21 (fixer login, `/fix/[reportId]`, `useFixerToken`) and US22 (`verifyFix`, attempt statuses incl. `failed` / `superseded`). Both merged.

## Plan

### Backend: `convex/fixes.ts`
- [x] `submitFix({reportId, clipStorageId, frameStorageIds, lat, lng, fixerToken?, residentToken?})` mutation
  - fixerToken → `requireFixer` (bad token throws); else residentToken → `getOrCreateResident`; neither → error
  - report must exist and be `open`
  - a resident may only confirm when `owner` isn't `city` (§4.3.2); fixers can close any report
  - haversine distance from the report ≤ `NEARBY_METERS` (50 m), re-checked on the server
  - clip is a video ≤ `MAX_CLIP_BYTES`, 1–`MAX_VIDEO_FRAMES` image frames
  - inserts `fixAttempts` (`checking`), schedules `internal.fixVerification.verifyFix`, returns attemptId
- [x] `myFixAttempt({attemptId, fixerToken?, residentToken?})` query: `{reportId, status, reason}` only for the submitter, else null
- [x] `convex/lib/fixRules.ts` (no server imports, client-safe): `neighborCanConfirm(report)` shared by the server and CardActions

### Client
- [x] `components/fix/FixCapture.tsx`: location gate → "Record fix" (disabled with "Get within 50 m (you're N m away)" until close; re-asks for GPS every few seconds while out of range) → `<VideoRecorder audio={false} autoOpen>` → upload (fixer token or resident) → `submitFix` → Checking… (`myFixAttempt`) → verified (link to `/?report=<id>`) | not_fixed / retake / failed (reason + Try again) | superseded ("This report was already marked fixed."). Demo-mode upload comes from VideoRecorder.
- [x] `app/fix/[reportId]/page.tsx` (US21's page, per its coordination note): swap the disabled button for FixCapture; keep FixCapture mounted once started so the verified screen isn't replaced when the report flips to fixed
- [x] `components/feed/CardActions.tsx`: "Is it fixed?" button (bottom-[216px], above On map) on open cards where `neighborCanConfirm`, linking to the neighbor capture route
- [x] `app/confirm/[reportId]/page.tsx`: neighbor capture screen via `api.feed.reportById`; explains when the report is city-owned or already fixed

### Tests
- [x] `tests/convex/fixes.test.ts`: rejects >50 m, not open, bad fixer token, resident on city; accepts resident on cobb, fixer on any; schedules verifyFix; `myFixAttempt` null for anyone but the submitter
- [x] `tests/components/fix/FixCapture.test.tsx`: record disabled beyond 50 m with the distance; enabled within; submit flow + result screens
- [x] `tests/components/feed/CardActions.test.tsx`: shows on open cobb/utility/unknown; not on city or fixed

### Verify
- [x] `npm test`, `npx tsc --noEmit`, `npm run lint`, `npm run build`, `npm run check:bundle`
- [x] Convex typecheck/push against this worktree's local deployment only (never the shared cloud dev)

### Notes
- `app/fix/[reportId]/page.tsx` is US21's file. Per its coordination note on #29, the disabled placeholder is swapped for FixCapture. FixCapture stays mounted once started (`onStart`), so the verdict screen isn't replaced when the report flips to fixed.
- New files beyond the card's list, all new (no collision risk): `convex/lib/fixRules.ts` (client-safe `neighborCanConfirm`, `CITY_ONLY`, `tooFarMessage`, shared by server and client) and `app/confirm/[reportId]/page.tsx` (the neighbor capture route, using `api.feed.reportById`).
- `storedSize` is duplicated from `posts.ts` (not exported there) rather than editing US8's file.
- After capture the clip uploads right away (no preview step), per the AC's "upload → Checking…".
- While out of range, FixCapture re-asks for GPS every 5 s, so Record fix enables as you walk up.
- `superseded` shows "This report was already marked fixed." (US22's suggested copy); `failed` shows US22's FAILED_REASON with Try again.

## Verification
- `npm test`: 45 files, 386 tests pass before the review (389 after its fixes)
- `npx tsc --noEmit`, `npm run lint`, `npm run build` (new route `/confirm/[reportId]`), `npm run check:bundle`: clean
- `scripts/with-node.sh npx convex dev --once` against this worktree's **local** backend (127.0.0.1:3210): functions ready; codegen matched the hand-edited `api.d.ts`. No live smoke run, because `--once` stops the local backend.

## Review (review-card, 2026-10-25): CLEAN
Two fresh reviewers (A: ACs, B: scope and spec fit). All 4 agent-verifiable ACs are checked off with proof. Nothing blocks, and the reviewers didn't disagree. Both judged the two extra files (`convex/lib/fixRules.ts`, `app/confirm/[reportId]/page.tsx`) justified.

## Review fixes
- [x] **Stale GPS once in range:** FixCapture only re-read the location while you were out of range, so a fixer could open the page on site, walk 200 m away, and still send the old in-range point. It now refreshes every 5 s whenever you can record (ready or recording), and checks the latest point against 50 m before uploading. Tests: "keeps asking for a new location…", "a clip finished after walking out of range is refused before uploading", "submitFix gets the latest position…".
- [x] **The distance message could contradict the button:** at 50.3 m it read "50 m away". `tooFarMessage` now rounds up. Test: `tooFarMessage` in `tests/convex/fixes.test.ts`.
- Re-verified: `npm test` 45 files / 389 tests, `tsc`, lint, build and bundle check are all clean. No second local Convex push, because port 3210 is now held by the sibling US13 worktree's backend. The only Convex-side change since the first push was the message rounding, and codegen didn't change.

## Decided by the user (2026-10-25)
- [x] **Spec notes, all three, in GOVTOK_DECISIONS.md:** the `/confirm/<reportId>` route (§5.3.1); a "Known weaknesses (US23)" entry under §4.3.2 (the geofence trusts coordinates the client sends; no limit on attempts); a §8 deferral for an attempt limit and a geofence that doesn't trust the client.
- [x] **`storedSize`:** keep the copy in `fixes.ts`. No edit to US8's `posts.ts`.
- [x] **A report closed by someone else:** FixCapture now takes the page's live `report.status`. If the report stops being open while you're on Record fix or recording, it shows "This report was already marked fixed." with a feed link instead of letting you film. Your own verdict screen still stays up after your fix closes the report. 4 new tests in `tests/components/fix/FixCapture.test.tsx`.
- [x] **`/confirm` keeps the thumbnail,** not the original clip.
- Re-verified: `npm test` 45 files / 393 tests, `tsc`, lint, build and bundle check are all clean. No Convex function changed, so no push was needed.
