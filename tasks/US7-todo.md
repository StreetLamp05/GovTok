# US7 (#9): Record a vertical video clip in the browser

Spec: §4.1.1, plus §6.1.1 for demo-mode upload. Parent: F2 Post a problem (#8). Consumers: US8 (posting, audio on), US23 (fixes, audio off), US25 (seeding).

## Plan
- [x] `lib/media/constants.ts`: 20 s cap, 1.5 Mbps, 6 frames, 1280 px long edge, JPEG quality
- [x] `lib/media/mimeType.ts`: `pickMimeType(isTypeSupported)`, trying mp4 avc1+mp4a → mp4 → webm
- [x] `lib/media/frames.ts`: `pickEvenly(items, n)`, `grabFrame(video)` (canvas → JPEG, ≤1280 px), `framesFromFile(blob)` (hidden `<video>`, Infinity-duration webm fix, 6 seeks)
- [x] `components/capture/VideoRecorder.tsx`: `<VideoRecorder audio onDone />` with a tap to open the rear camera, Record, a 20 s auto-stop with countdown, live frame grabs every 500 ms (6 kept), a file-input fallback, demo-mode "Upload clip", and stopping tracks on done or unmount
- [x] `app/dev/recorder`: a dev page with audio on/off toggles that shows the clip, size, mime, audio-track presence and the 6 frames
- [x] Unit tests (jsdom): `tests/lib/media/mimeType.test.ts`, `tests/lib/media/frames.test.ts` (`pickEvenly`), `tests/components/capture/VideoRecorder.test.tsx` (auto-stop at 20 s with fake timers, tracks stopped, fallback, demo upload)
- [x] Headless browser test: Vitest browser mode (Playwright Chromium), `tests/browser/media/framesFromFile.test.ts`, run by `npm run test:browser`. Fixtures are made in the test with MediaRecorder from a canvas stream, so the webm really has the Infinity duration. Playwright's Chromium can't decode H.264, so the mp4 fixture is VP9 in an MP4 container; H.264 mp4 is covered by the phone manual check.
- [x] Verify: `npm test`, `npm run test:browser`, `npx tsc --noEmit`, `npm run lint`, `next build`, `npm run check:bundle`

## Notes
- Live frames: one grab every 500 ms plus one at stop. `pickEvenly` keeps 6 (clips shorter than about 2.5 s keep everything they have). Frame 0 is the thumbnail and poster.
- The camera opens on a tap (same as `/dev/camera`), then Record starts the clip.
- Falls back to the native camera input when `getUserMedia` is missing or fails.

## Changes outside the card's own files
- `package.json` / `package-lock.json`: devDependencies `@vitest/browser-playwright` and `playwright`, plus the `test:browser` script
- `vitest.config.mts`: `resolve.tsconfigPaths` (so tests can import code that uses `@/…`), and `tests/browser/**` excluded from `npm test`
- `vitest.browser.config.mts` (new), `.gitignore` (`.vitest/` failure screenshots), and a README line for `test:browser`
- `lib/media/cameraError.ts` copies the error text from `app/dev/camera/CameraPreview.tsx` (US4) instead of editing that dev-only file
- `app/dev/recorder/hasAudioTrack.ts`: a container check (MP4 `hdlr` = `soun`, or a webm audio codec ID) so the dev page can show whether the clip has an audio track

## Verification
- `npm test`: 19 files, 112 tests pass. 28 are new: mime order (4), `pickEvenly`/`evenTimes`/`frameSize` (7), the component (13: 20 s auto-stop with fake timers, countdown, 1.5 Mbps options, tracks stopped on done and unmount, fallback input, demo upload) and `hasAudioTrack` (3)
- `npm run test:browser`: 4 tests pass in headless Chromium. `framesFromFile` returns 6 JPEGs for a MediaRecorder webm (checked to load with `duration === Infinity`) and for an mp4 (VP9 in MP4; this Chromium can't decode H.264), caps frames at 1280 px, and returns distinct frames
- Mutation checks: removing the Infinity-duration fix fails 3 of 4 browser tests; moving the auto-stop to 21 s fails the timer test; dropping `stopCamera()` on unmount fails 2 tests
- `npx tsc --noEmit`, `npm run lint`, `next build` (includes `/dev/recorder`) and `npm run check:bundle` are clean
- End to end on `next start`, driving `/dev/recorder` in headless Chromium with the fake camera and mic:
  - Audio on, Stop at about 4 s: `video/mp4;codecs=vp9,opus`, 0.28 MB, 1280×720, 6 frames, audio track yes, camera released (`srcObject` null)
  - Audio off: `video/mp4;codecs=vp9`, 6 frames, audio track no
  - No Stop pressed: stopped by itself at 20.0 s, 1.44 MB, 6 frames
  - `?demo=mableton` Upload clip with a MediaRecorder webm (Infinity duration): 6 distinct frames, frame 0 as poster
- Not checkable here (left for the phone manual test): H.264/AAC output on real Chrome and Safari, portrait orientation of the stream on phones, the iOS hidden-video decode in `framesFromFile`, and real clip sizes

## Review fixes (round 1, run-card step 4: findings that need no decision)
- [x] **Blocking:** a double tap on Record no longer makes an empty clip. Stop stays disabled for `MIN_RECORD_MS` (1 s), and a 0-byte recording shows "The recording came out empty" instead of reaching `onDone`. End to end, `dblclick()` on Record keeps recording, and Stop at about 1.8 s gives a playable clip (video `error` null, `readyState` 4)
- [x] A recorder that fails to start or errors mid-clip now shows an error. `recorderRef` is set only after `start()` succeeds, and `onerror` drops the clip, so Record works again once the camera reopens
- [x] The preview uses `object-contain`, so the resident sees the whole frame that gets recorded
- [x] A file picked while the camera is still opening now closes the camera when it arrives (`attemptRef`)
- [x] Errors reading a file show "We couldn't read that video" instead of camera or HTTPS text
- [x] `RecordedClip` documents that file clips keep their audio even with `audio={false}`
- [x] The `vitest.config.mts` alias comment now matches US16's text, so that merge is clean. `package-lock.json` still conflicts with US20; re-run `npm install` after merging
- Verification: `npm test` 118 pass (6 new regression tests), `test:browser` 4 pass, and tsc, lint, `next build` and `check:bundle` are clean. Removing each fix fails its regression test

## Review (round 2): CLEAN
All 4 ACs verified with proof (118 tests, 4 browser tests, tsc, lint, build, a Playwright drive of `/dev/recorder`). Nothing blocks.

## After review (user decisions, 2026-10-25)
- [x] **`autoOpen` prop** (default off): opens the camera on mount, so "No, it's new" goes straight to the preview (§4.1.2). If the browser refuses without a tap, the error shows "Try the camera again" and the camera-app fallback. US8, US10 and US23 pass `autoOpen`
- [x] `/dev/recorder` has an "Open the camera without a tap" toggle for the phone check
- [x] Round 2 fixes: denying only the microphone (audio on) now reads "Camera or microphone permission was denied", and the `pickEvenly` test comment says 41 grabs, not 42
- [x] Dev-page removal is **US29 (#46)**, under F8, blocked by US4 and US7, in Refinement, Size S. Do it after the phone checks and before submission
- Mime order: kept as the card says. The phone check reads the Type line on `/dev/recorder`, and server-side transcoding goes in §8 for later
- Camera-app fallback on any camera error: kept as is (user: fine)
- Verification: `npm test` 123 pass (5 new: `autoOpen` on, off, refused, and with no `getUserMedia`, plus the mic message), `test:browser` 4 pass, and tsc, lint, `next build` and `check:bundle` are clean. End to end with the fake camera, on both `next start` and `next dev` (StrictMode): one `getUserMedia` call, Record shown with no tap, every track ended after the clip, and Record again reopens the camera

## Phone check additions (suggested)
- Orientation: on both phones, `/dev/recorder` should show width < height (portrait). Nothing requests portrait explicitly (the ideal is 1280×720), so this relies on the phone rotating the stream
- With the `autoOpen` toggle on, iPhone Safari opens the camera with no tap. If it doesn't, US8 should keep the tap
- The Type line on Android Chrome should read `video/mp4;codecs=avc1,mp4a.40.2`
