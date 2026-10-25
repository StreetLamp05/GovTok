# US6 (#7): App shell with device token, location and sound plumbing

Spec §3.1.1, §5.1.1, §6.1.1. Dispatcher note: delete `app/page.tsx`; leave `convex/` alone (US5 owns it, incl. `getOrCreateResident`).

## Plan
- [x] Test deps: `jsdom`, `@testing-library/react`, `@testing-library/dom`; vitest includes `lib/**/*.test.{ts,tsx}` (jsdom via per-file docblock, convex tests stay on edge-runtime)
- [x] `lib/demo.ts`: `DEMO_PARAM`/`DEMO_VALUE`, `DEMO_POINT` (Mableton)
- [x] `lib/hooks/useResidentToken.ts`: UUID in localStorage, in-memory per-session fallback when storage throws
- [x] `lib/hooks/useDemoMode.ts`: `?demo=mableton` → sessionStorage flag, survives navigation
- [x] `lib/hooks/useCurrentLocation.ts`: high-accuracy geolocation w/ timeout; `loading | ready | denied | unavailable | timeout`; demo → `DEMO_POINT`; `refresh()`
- [x] `lib/hooks/sound.tsx`: `SoundProvider` + `useSoundUnlocked()`; first tap/key anywhere unmutes for the session
- [x] `app/layout.tsx`: wrap in `SoundProvider`, render `DemoBanner` on every page
- [x] `app/(tabs)/layout.tsx` + `TabBar.tsx` (Feed, Map, Post, Me; styling from `spec/UI_mockups`)
- [x] Stubs: `app/(tabs)/page.tsx` (/), `map`, `post` (shows location state incl. denied message), `me`; hidden `app/fix`, `app/admin/seed`
- [x] Delete `app/page.tsx`
- [x] Unit tests for the three hooks (+ sound)
- [x] Verify: `npm test`, `npx tsc --noEmit`, `npm run lint`, `npm run build`; click through in a browser

## US11: Transcribe a video's audio with Groq Whisper

- [x] Create narrated and digitally silent MP4/WebM fixtures from the user-selected source, preserving the original; keep the video files local and ignored.
- [x] Add `scripts/try-transcribe.ts` to read the key from the selected Convex deployment, call Groq with each fixture, and print transcript text and timestamped segments.
- [x] Verify request/response handling with mocked-fetch tests and run the script on all four real fixtures: narrated transcripts were 108 characters; silent transcripts were 11 characters; all returned one segment.
- [x] Integrate the intake table and functions with current `origin/main`'s full US5 schema, screening modules, and generated Convex API bindings; preserve the existing report schema.
- [x] Verify with `npm run build`, `npm run lint`, app and Convex type checks, focused Vitest (8 tests passed), and a live Groq run on all four fixtures.
- [ ] Full `npm test` remains environment-blocked on this Windows/Node 22.13 checkout: POSIX shell-script tests return null exit codes, and six hook-test workers fail loading Undici. Current `origin/main` pins Node 24; this machine has no `nvm` command.
- [ ] Convex deployment push not run: this checkout has no isolated local deployment configured, and pushing would risk replacing the shared development deployment.
