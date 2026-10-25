# US9: Pick photos for a slideshow post (#11)

Spec §4.1.1 (retcon: a post is a video or a 1–10 photo slideshow). Parent F2 (#8). Blocked by US8 (#10), merged: `createReport` already takes `mediaType: "photos"` with 1–10 `frameStorageIds` and no clip.

## Plan
- [x] `lib/media/photos.ts` (new, next to `frames.ts`; nobody else owns it)
  - [x] `keepPhotos(files)` → `{ kept, cut }`: the first `MAX_PHOTOS` (10) and how many were dropped
  - [x] `photoToJpeg(file)`: decode via `<img>` (browsers apply EXIF orientation, so naturalWidth/Height are upright), draw to a canvas at `frameSize(…)` (long edge ≤1280, aspect kept, never upscaled), `toBlob("image/jpeg", 0.8)`. Re-encoding drops all metadata, EXIF GPS included. Release the canvas afterward (iOS canvas memory)
- [x] `components/capture/PhotoPicker.tsx`: `<PhotoPicker onDone={(jpegs) => …} />`
  - [x] "Choose photos" → hidden `<input type="file" accept="image/*" multiple>` (no `capture`, so the phone offers camera or library)
  - [x] Convert one at a time (memory), "Preparing photos…" while working; thumbnails; notice when more than 10 were picked; error if a photo can't be read
  - [x] "Use these photos" disabled with 0 photos; "Choose again" replaces the pick
- [x] `components/post/PostFlow.tsx`, the Photos branch: a Video / Photos choice above capture (Video by default; switching unmounts the recorder, which stops the camera), a `{ kind: "photos" }` draft, a swipeable photo preview, "Pick again", and Submit uploads every photo → `createReport({ mediaType: "photos", frameStorageIds, no clip })`
- [x] Tests
  - [x] `tests/lib/media/photos.test.ts`: 12 → first 10 and cut 2; ≤10 → no cut; 0 → none
  - [x] `tests/browser/media/photoToJpeg.test.ts` (real Chromium): landscape/portrait/small inputs keep aspect with long edge ≤1280; an EXIF orientation-6 JPEG comes out upright; output JPEG has no EXIF (APP1) segment, so no GPS
  - [x] `tests/components/capture/PhotoPicker.test.tsx`: picking 12 keeps 10 and shows the cut; 0 can't continue; onDone gets the JPEGs
  - [x] `tests/components/post/PostFlow.test.tsx`: the Video / Photos choice; a photo post uploads each photo and calls `createReport` with `mediaType: "photos"`, no clip
- [x] `npm test`, `npm run test:browser`, `npx tsc --noEmit`, `npm run lint`, `npm run build`, `npm run check:bundle`

## Notes
- No backend or schema change, so no Convex push.
- `convex/_generated/api.d.ts` had an import-order-only codegen diff before this card started; left alone.

## Verification
- `npm test`: 44 files, 360 tests pass. New: `tests/lib/media/photos.test.ts` (4: 12 → first 10 + 2 cut, ≤10 no cut, 0 → nothing, resize aspect/long edge ≤1280), `tests/components/capture/PhotoPicker.test.tsx` (7: input is `image/*` + `multiple` with no `capture`; 12 → 10 converted, 10 thumbnails, cut notice, onDone gets the 10 JPEGs; no notice for ≤10; 0 photos can't continue; unreadable photo → error; Choose again replaces and revokes; a conversion finishing after unmount does nothing), 5 new in `tests/components/post/PostFlow.test.tsx` (Video default / Photos swaps in the picker; photo preview; Submit uploads 3 photos → `createReport({ mediaType: "photos", frameStorageIds, … })` with no `clipStorageId`; Pick again keeps the description; failed upload)
- `npm run test:browser`: 2 files, 9 tests pass. New `tests/browser/media/photoToJpeg.test.ts` (5, real Chromium): 4032×3024 → 1280×960, 3024×4032 → 960×1280, 4000×1000 → 1280×320, 640×480 unchanged; a 1600×800 JPEG tagged EXIF orientation 6 comes out 640×1280 with red on top (control: the same photo tagged 1 stays 1280×640); the output has no APP1/"Exif" segment though the input had Orientation + a GPS IFD; a non-image rejects
- `npx tsc --noEmit` (app and `convex/`), `npm run lint`, `npm run build`, `npm run check:bundle` are clean
- No backend change, so nothing was pushed to Convex
- Not checked here: a real iPhone photo (HEIC-from-library conversion, Safari's orientation) and an EXIF reader on a real output. That's the card's manual phone test

## Review fixes (round 1, run-card step 4: findings that need no decision)
Review verdict was CLEAN (3/3 ACs, nothing blocking).
- [x] The photo tests in `tests/components/post/PostFlow.test.tsx` now get a unique blob URL per photo, so the preview's URL keys no longer print "two children with the same key" warnings (0 now). Pick again checks that exactly those 3 URLs are revoked
- Verification: `npm test` 360 pass, `tsc` and lint clean

## Review: CLEAN
All 3 ACs verified with proof. No blocking findings. Left for the user (non-blocking):
- Gallery photos are pinned to where the phone is at posting time, not where they were taken (the photo's own GPS is stripped). A photo from last week posted from home is pinned to home (§7.1.1 public location, §4.1.2 50 m check, §4.3.1 geofence). A spec decision: a hint, compare photo GPS before stripping, or accept it
- §1.1.3 cost estimate assumes 6 frames; 10 photos is about 16k input tokens per post (about 26k for a fix check against a 10-photo original)
- HEIC can't be decoded on Android/desktop Chrome ("couldn't read" error); iOS Safari is fine
- UX: Video is the default (camera prompt first); one unreadable photo fails the whole pick; switching to Video and back clears the photo pick
- `photoToJpeg` repeats about 10 lines of canvas→JPEG from `grabFrame` (left US7's file alone)

## Decisions (user, 2026-10-25)
- [x] **Photo pin:** Photos mode says "Your post is pinned to where you are now, so post from where the problem is." Dated notes in §4.1.1 and §7.1.1. No EXIF-GPS comparison, since iOS Safari often removes GPS from library picks
- [x] **HEIC:** not decoded where the browser can't; the message names it ("This browser can't open HEIC photos. Try JPEGs."). `isHeic` checks the type, or the `.heic`/`.heif` name when the type is missing
- [x] **Unreadable photos are skipped:** the readable ones are kept with "N photo(s) couldn't be read and was/were left out." (plus the HEIC hint when one was HEIC). Only if none can be read is it an error. The 10-photo cut happens first, so a skipped photo isn't replaced by the 11th
- [x] **Pick kept across Video ↔ Photos:** the picker stays mounted (hidden) while Video shows; the recorder still unmounts, so the camera turns off
- [x] **§1.1.3 cost note:** a 10-photo post is about 16k input tokens (~$0.065), and a fix check against one about 26k (~$0.10)
- Not done (user's call): Photos as the default; sharing the canvas→JPEG helper with US7's `grabFrame`
- Tests: +4 PhotoPicker (one unreadable left out, HEIC note, none readable, all-HEIC error; replacing the old whole-pick failure test), +1 `isHeic`, +2 PostFlow (pick kept across switches, pin hint)
- Verification: `npm test` 366 pass (44 files), `npm run test:browser` 9 pass, `tsc` (app and `convex/`), lint, `next build` and `check:bundle` clean
