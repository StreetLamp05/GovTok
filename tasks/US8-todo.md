# US8: Submit a post and watch it check (#10)

Spec §4.1.1, §2.1.3, §3.1.1 (plus §7.1.1 for `myReport`). Parent F2 (#8). Depends on US5 (schema) and US7 (recorder), both merged.

## Plan
- [x] `convex/posts.ts`
  - [x] Shared limits (moved to `convex/lib/postLimits.ts` in review): `MAX_DESCRIPTION_LENGTH` 280, `MAX_VIDEO_FRAMES` 6, `MAX_PHOTOS` 10, `MAX_CLIP_BYTES` 25 MB (Groq, §1.1.4)
  - [x] `createReport({token, mediaType, clipStorageId?, frameStorageIds, description?, lat, lng})`: resolve the resident, validate (description ≤280 after trimming, empty → none; video = clip + 1–6 frames; photos = 1–10 images and no clip; every storage file exists via `ctx.db.system`; clip ≤25 MB; finite lat/lng in range), insert `pending` with the defaults, schedule `internal.screening.screenReport` once, return the id
  - [x] `myReport({token, reportId})`: the report (without `residentId` / `fixedBy`) only if it belongs to the token's resident, else null
- [x] `components/post/PostFlow.tsx`: location → [US10 duplicate-check slot] → capture (`VideoRecorder audio autoOpen`; [US9 photos slot]) → preview + description (live counter, `maxLength` 280) → Submit (upload clip and frames in parallel → `createReport`) → Checking…
- [x] `components/post/CheckingScreen.tsx`: subscribes to `myReport`; pending / open / held states (verdict screens are US14)
- [x] `app/(tabs)/post/page.tsx`: renders `PostFlow` (the location error UI moves into the flow)
- [x] Tests (`tests/convex/posts.test.ts`): valid video, valid photos, 281-char description, 11 photos, clip over 25 MB, missing token, screenReport scheduled exactly once; `myReport` own vs other token
- [x] Component test (`tests/components/post/PostFlow.test.tsx`): counter, submit uploads + calls `createReport` with the location, Checking… states
- [x] Codegen for `api.posts`, then `npm test`, `npx tsc --noEmit`, `npm run lint`, `npm run build`, `npm run check:bundle`

## Notes
- No schema change needed: every field and the `by_resident` index already exist.
- No Convex push: tests run on convex-test, and sibling worktrees share the cloud dev deployment.

## Verification
- `npm test`: 37 files, 275 tests pass. 24 are new: `tests/convex/posts.test.ts` (12: valid video and photo posts with every default, screenReport scheduled exactly once and run, 280 vs 281 characters, 11 photos, photos with a clip, video without clip / with 0 or 7 frames, exactly 25 MB vs one byte more, a deleted upload, empty and blank tokens, NaN and out-of-range location with nothing saved; `myReport` own, with verdict/reason, and null for another resident, an unknown and an empty token) and `tests/components/post/PostFlow.test.tsx` (12: location gate, `audio` + `autoOpen`, the 280 counter, Submit uploads 7 files and sends the location, demo point, server and upload errors, Retake, and the pending / open / held Checking… states)
- Mutation checks: removing the 25 MB check, the scheduler call, the owner check in `myReport` or the 280 check each fails its test
- `npx tsc --noEmit`, `npm run lint`, `npm run build` and `npm run check:bundle` are clean
- `npx convex codegen` added `api.posts` to `convex/_generated/api.d.ts` (no deploy). Nothing was pushed to Convex
- Not checked here: a real end-to-end post (needs the functions on a deployment). That's the card's manual phone test

## Review fixes (round 1, run-card step 4: findings that need no decision)
Review verdict was CLEAN (3/3 ACs, nothing blocking). Fixed the non-blocking findings that had one obvious fix:
- [x] Server code no longer ships to `/post`: the limits moved to `convex/lib/postLimits.ts` (no imports), which both `convex/posts.ts` and `PostFlow` use. After `next build`, `.next/static` no longer contains "Missing device token"
- [x] A failed location refresh after recording no longer disables Submit: the draft keeps the fix from filming, and a newer fix is used when the refresh succeeds. The "We lost your location" line is gone
- [x] A clip over 25 MB is refused before uploading (no long upload, no orphaned files). Client and server share `CLIP_TOO_BIG`: "That clip is over 25 MB. Try a shorter one." (it used to say "Record", which didn't fit an uploaded file)
- [x] The preview's "Retake" is now "Record again", so it isn't confused with the §4.2.1 retake verdict, and it keeps the typed description
- [x] A test guards `FRAME_COUNT <= MAX_VIDEO_FRAMES`, so tuning the recorder can't break every video post
- [x] The fake "demo mode" component test was replaced with two location tests (fix kept on a failed refresh; newer fix used). Demo-point substitution is `useCurrentLocation`'s own test
- Verification: `npm test` 278 pass (3 net new). Undoing the location fallback, the size check or the description keep each fails one test. tsc, lint, `next build` and `check:bundle` are clean

## Review: CLEAN
All 3 ACs verified with proof. No blocking findings.

## Decisions (user, 2026-10-25)
- [x] **Checking… screen:** kept as is. US14 (#17) has a new AC to fully replace US8's interim held and open branches (no "Post another" on a retake hold), and to update the Checking… tests in `tests/components/post/PostFlow.test.tsx`
- [x] **Muted description:** stays hidden from the poster too (no change)
- [x] **25 MB, fixed everywhere:** one `MAX_CLIP_BYTES = 25_000_000` in `convex/lib/clipLimit.ts` (no imports, so it's client-safe). It replaces the copies in `convex/lib/transcribe.ts`, `convex/lib/videoIntakeValidation.ts`, `convex/videoIntake.ts`, `app/admin/video-intake/page.tsx` and US8's own. Recorded in spec §1.1.4. Tests check the value and the 25,000,000 / 25,000,001 boundary
- [x] **Hardening, type check only:** `createReport` refuses a clip whose stored `contentType` isn't `video/*`, and a frame or photo that isn't `image/*`. An upload with no type is allowed (`uploadFile` sends no Content-Type for an untyped blob). No check for files reused across reports
- Verification: `npm test` 280 pass; `tsc` (app and `convex/`), lint, `next build` and `check:bundle` are clean; codegen re-run (adds `lib/clipLimit` and `lib/postLimits` to `api.d.ts`)
- [x] **§2.1.1 wording:** owner and agency are now "stored when screening sets the category", not "at creation"
- [x] **`blocked_by` links:** already in place. US10 (#12) and US14 (#17) are both blocked by US8 (#10), so nothing changed
