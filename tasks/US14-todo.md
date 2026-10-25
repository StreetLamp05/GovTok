# US14: Show the poster their result: posted, retake, reject or call 911 (#17)

Spec §4.2.1, §2.1.3 (plus §7.1.1 retention, §5.4.1 Me page reuse). Parent F3 (#13). Depends on US8 (#10, Checking… screen) and US13 (#61, verdicts), both merged.

## Plan
- [x] `convex/lib/postMedia.ts` (new): `checkPostMedia(ctx, {mediaType, clipStorageId?, frameStorageIds})`, the media rules lifted out of `createReport` (video = clip + 1–6 frames, clip ≤25 MB; photos = 1–10 images, no clip; every file exists and has the right type). `createReport` and `retakeReport` both call it, so a retake can't sneak past a rule a new post has to meet
- [x] `convex/retake.ts`
  - [x] `retakeReport({token, reportId, mediaType, clipStorageId?, frameStorageIds})`: owner only; only `held` with verdict `retake`; new files must not overlap the old ones (they're about to be deleted); validate media; patch media (same `mediaType` only, per the decision below), clear verdict and reason, set `pending`; delete the old clip and frames; schedule `screenReport`
  - [x] `retryScreening({token, reportId})`: owner only; only `held` with reason `SCREENING_FAILED_REASON`; set `pending`, clear reason; schedule `screenReport`
- [x] `components/post/CheckingScreen.tsx`: replace US8's interim open / held branches
  - open (or fixed) → "Posted", a muted note when `audioMuted`, link to `/?report=<id>`, Post another
  - held + retake → reason + Retake (same media type: `VideoRecorder` or `PhotoPicker` → upload → `retakeReport`, Cancel back). No Post another
  - held + reject → reason + Post another
  - held + emergency → full-screen red "Call 911" `tel:911`
  - held + "screening failed" → "We couldn't check this post" + Try again (`retryScreening`)
- [x] Tests: `tests/convex/retake.test.ts` (owner, status, verdict, reason guards; old files deleted; screening scheduled once); `tests/components/post/CheckingScreen.test.tsx` (each state from a fixture report, Retake/Try again wiring); move US8's Checking… tests out of `PostFlow.test.tsx` (keep one integration test that Submit lands on Checking…)
- [x] `npx convex codegen`, `npm test`, `npx tsc --noEmit`, `npm run lint`, `npm run build`, `npm run check:bundle`

## Notes
- ~~No schema change~~: superseded by the user's decision below (`screeningError`, `screeningRetries`, both optional).
- `createdAt` isn't touched on a retake: days-open counts from the first post, and purge already ages a held report by its newest file (§7.1.1).
- No Convex push: tests run on convex-test, and sibling worktrees share the cloud dev deployment.

## Verification
- `npm test`: 53 files, 530 tests pass. New: `tests/convex/retake.test.ts` (20: retake swaps files, clears verdict/reason, goes pending, keeps `createdAt`, deletes old files, schedules screening once; the rescheduled screening lands on the new files; photo retake; rejects another resident, an unknown token, reject/emergency/no verdict, pending/open/fixed; refuses reusing an old file; media rules apply; `retryScreening` happy path, another resident, and retake/reject/emergency/pending/open) and `tests/components/post/CheckingScreen.test.tsx` (each state from a fixture `OwnerReport`, plus Retake and Try again wiring, errors, 25 MB, Cancel)
- `PostFlow.test.tsx`: US8's open and held Checking… tests moved to `CheckingScreen.test.tsx`; one integration test stays (Post another on a reject starts over)
- Mutation checks: removing the owner check, the old-file delete, the retake-verdict guard or the screening-failed guard each fails tests
- `npx tsc --noEmit` (app and `convex/`), `npm run lint`, `npm run build`, `npm run check:bundle` are clean
- `npx convex codegen` added `api.retake` (and `lib/postMedia`) to `convex/_generated/api.d.ts`. No `convex dev`/deploy was run
- Not checked here: the manual phone test (forcing each verdict on a real deployment)

## Review fixes (round 1, run-card step 4: findings that need no decision)
Review verdict was CLEAN (5/5 ACs, nothing blocking). Fixed the non-blocking findings that had one obvious fix:
- [x] A retake also clears the old clip's screening result (category, owner, agency, title, transcript, segments, mute), like `markFailed`, so nothing from the deleted files lingers on the Me page or a stuck pending report. The test asserts each field is gone
- [x] The mute note no longer says "mentioned something private" (wrong for slurs) or "your description" (there may be none): "Something said or written in it can't be shown publicly, so it plays without sound or captions, and any description is hidden."
- [x] `retryScreening` has an unknown-token test
- Verification: `npm test` 531 pass; tsc (app and `convex/`), lint, `next build`, `check:bundle` clean. No blocking fix, so no second review round

## Review: CLEAN
All 5 ACs verified with proof (runs plus mutation testing). No blocking findings.

## Decisions (user, 2026-10-25)
- [x] **Same format on retake:** enforced on the server. `retakeReport` refuses a different `mediaType` ("Record a new video for this post." / "Pick new photos for this post.") and no longer patches `mediaType`
- [x] **US24 reuse:** `Retake` and `ScreeningFailed` are named exports of `CheckingScreen.tsx`. `ScreeningFailed` takes the report and an optional `onPostAnother` (omit on the Me page)
- [x] **Try again cap:** 2 taps per report (`MAX_SCREENING_RETRIES` in `convex/lib/screening.ts`), counted in the new optional `screeningRetries` field. A retake resets it. At the cap: "We still couldn't check this post", a hint (post as photos, or film in GovTok) and Post another
- [x] **Schema:** user approved adding `screeningRetries` and `screeningError` (both optional) to `reports` in this card, though US5 owns `convex/schema.ts`
- [x] **Shared-file deletion:** left as is, recorded in §8
- [x] **Debug reason (user request mid-run):** `markFailed` now stores the real Groq or Claude error in `screeningError` (first 500 characters). `screenReport` passes it in, and `rescreen`, Try again and retake clear it. The owner view (`myReport`) returns it; public queries don't (allowlist test updated). Every held screen shows a small `held: <verdict> · <error or reason>` line (`HoldDebug`), flagged in §4.2.1 and §8 to remove before the pilot
- [x] **Spec:** §2.1.1 new fields; §2.1.3 held → pending also on Try again and `rescreen`; §4.2.1 dated US14 note (same format, delete at retake, no preview, description kept, cap, Post another rules, debug line); §5.4.1 lists "screening failed"; §7.1.1 lists screening-failed holds; §8 shared-file deletion and removing the debug line
- Verification: `npm test` 53 files, 538 pass; tsc (app and `convex/`), lint, `next build`, `check:bundle` clean. Not deployed: the schema and functions reach Convex on the normal deploy after merge

## Review fixes (round 2, after the decisions)
Second review verdict was CLEAN (5/5 ACs, nothing blocking). Fixed:
- [x] A1: the main retake test now starts with `screeningError` set and `audioMuted: true`, so clearing both is really tested (removing either now fails)
- [x] A2: `rescreen` clearing `screeningError` has a test (removing it fails)
- [x] A3: the error cut is a named `MAX_SCREENING_ERROR_LENGTH` (500), with a test on a 2,000-character error
- [x] A4: a test pins `MAX_SCREENING_RETRIES` at 2
- [x] A5: emergency's "Back to the feed" link is asserted
- [x] B2: stale "No schema change" and "patch mediaType" lines in this file corrected
- [x] B3, B5, B6, B8 (spec text): the §4.2.1 "Post another" bullet lists every screen that shows it; US13's "operator-only exception" sentence matches the new §2.1.3; the §8 shared-file entry cites `publicReport.ts` instead of §7.1.1; a line records that retake and Try again keep `createdAt`
- Verification: `npm test` 541 pass; tsc (app and `convex/`), lint, `next build`, `check:bundle` clean

## Review: CLEAN (round 2)
## Decisions (user, round 2)
- [x] **B4 debug line:** stays on through both demos, removed after Oct 30 (§4.2.1 and §8 agree now)
- [x] **B7 raw errors:** `markFailed` stores `screeningErrorSummary(error)` (`convex/lib/screening.ts`): the first line, cut before any vendor JSON, a dangling "(" closed, capped at 500. Unit tests use real Groq and Claude error shapes and check no org ID or request ID survives
- [x] **B1 US24 reuse:** `Retake` and `ScreeningFailed` render a `<section>` with no page padding (`Panel`, h2 heading), including Retake's camera step; `CheckingScreen` wraps results in `Page` (`<main>`). Emergency stays its own full-screen `<main>`. Tests check the exports contain no `<main>`
- Verification: `npm test` 53 files, 550 pass (new: `screeningErrorSummary` cases in `tests/convex/lib/screening.test.ts`, alongside its existing reason test; layout-neutral export tests); tsc (app and `convex/`), lint, `next build`, `check:bundle` clean

## Capture redesign (added during build, user request 2026-10-25; ACs appended to #17)
User asked for a TikTok-style capture screen, a photo shutter, and video upload that works outside demo mode and handles new-iPhone `.mov` clips.

- [x] `lib/media/convertClip.ts`: `needsConversion(file)` (not MP4/WebM, or over 25 MB) and `convertClip(file, {onProgress, maxMs})`: plays the file in a hidden `<video>`, draws it to a ≤1280 px canvas, and re-records canvas + audio (WebAudio) with the same MediaRecorder settings as a live clip, stopping at 20 s. Starts playback synchronously so iOS keeps the tap's permission
- [x] `lib/hooks/useClipRecorder.ts`: VideoRecorder's camera/record/file logic as a hook; `takeFile` converts when needed (phase `converting` with progress). VideoRecorder renders exactly as before on top of it (fix flow, dev pages)
- [x] `lib/media/photos.ts`: `prepareJpegs(files)` lifted out of PhotoPicker (cut to 10, HEIC/unreadable counts), shared with the camera
- [x] `components/capture/CameraCapture.tsx`: full-screen black viewfinder, ✕ top-left, timer/count top-right, round shutter (video: record/stop with a 20 s ring; photo: snap a still from the live camera, up to 10, count badge), Upload bottom-left (video in Video mode, photos in Photo mode, always shown), Next once photos are taken, VIDEO · PHOTO tabs under the shutter (hidden while recording or when only one mode)
- [x] `PostFlow`: the mode toggle, VideoRecorder and PhotoPicker give way to CameraCapture (✕ goes to the feed); Record again / Pick again come back in the same mode
- [x] `CheckingScreen` Retake: CameraCapture limited to the report's media type, ✕ back to the reason
- [x] Tests: `needsConversion` units; browser test that `convertClip` shrinks a 1080p clip to ≤1280 px and honours `maxMs`; CameraCapture component tests (tabs, snap, Next, uploads convert or pass through, single mode, ✕, recording hides tabs); PostFlow and CheckingScreen tests moved onto a CameraCapture mock; existing VideoRecorder and PhotoPicker tests still pass
- [x] Spec §4.1.1 (capture screen, upload always on, conversion) and §6.1.1 (upload no longer demo-only on posts)
- Also: Retake errors now land on the reason screen (the full-screen camera would hide them), and Retake clears the old error
- Visual check: headless Chromium with a fake camera and an iPhone 13 viewport, screenshots of Video, Photo (2 taken, strip and Next) and recording. Fixed from the screenshots: the shutter jumped when the tabs hid during recording; the strip's remove buttons were clipped
- Verification: `npm test` 55 files, 579 pass (new: `CameraCapture.test.tsx` 20, `tests/lib/media/convertClip.test.ts` 8, 2 VideoRecorder conversion tests); `npm run test:browser` 12 pass, including real `convertClip` runs (1080p WebM → playable 1280×720, progress reported, `maxMs` honoured, junk rejected); tsc, lint, `next build` clean
- Not checked here: a real iPhone `.mov` (HEVC) through conversion, and iOS keeping the tap's permission for the unmuted playback. That's the manual phone test
