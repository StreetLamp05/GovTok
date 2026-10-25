# US25 (#33): Seed sample reports through the real pipeline

Spec: §6.1.1 (samples, backdating, seed ownership, stage flow), §5.4.1 (Me page beat), §4.2.1 (`rescreen` / `release`). Parent: F8 (#32).
Builds on: US5 (schema: `isSample`, explicit `createdAt`), US6 (`DEMO_POINT`, `/admin/seed` stub), US7 (`framesFromFile`), US9 (`photoToJpeg`), US13 (`screenReport`, samples skip the publish bump), US21 (`fixers:seed`), US22 (`verifyFix`).

## Decisions
- **Passcode:** the admin types `ADMIN_PASSCODE` into the page. It's held in React state only and sent with every seed call. Each seed function compares it server-side (constant time) against `process.env.ADMIN_PASSCODE` and throws one error for any mismatch, including an unset passcode. No `NEXT_PUBLIC_` copy exists.
- **Batch:** one `seed:seedSamples` mutation takes the whole batch, so the stagger is the server's job: sample `i` gets `runAfter(i × 10 s, screenReport)`.
- **Poster:** a sample is posted by this device's resident when "Mine" is ticked (§5.4.1 beat). Otherwise a fresh resident with a random token posts it, so no guessable token can open a sample's Me page.
- **Fix clip:** `verifyFix` only checks an attempt while its report is `open`, and a seed is `pending` until screening finishes. So the attempt isn't inserted up front. `seed:attachFix` polls every 10 s (up to 10 minutes). Once the report is `open`, it inserts the attempt (`checking`) and schedules the real `verifyFix`. If the report was held, it stops and logs a message. A neighbor fix on a city-owned report is refused (`neighborCanConfirm`, §4.3.2) the same way.
- **Backdated `fixedAt`:** `applyFixVerdict` stamps `fixedAt = now`. `seed:backdateFix` polls the attempt. Once it's `verified`, it sets `fixedAt` and moves `lastActivityAt` to the later of the seeded value and `fixedAt`.
- **Validation:** media shape and counts match `createReport`, lat/lng are valid, and no timestamp is in the future. `createdAt ≤ lastActivityAt`, `createdAt ≤ fixedAt`.
- **DEMO_POINT:** Clay Road SW beside South Cobb Regional Library (33.8253, -84.5765), a public street per OpenStreetMap. The open-pothole preset is ~30 m east near Floyd Rd and the before/after preset ~39 m west by the library, so the duplicate check (nearest first) offers the pothole first. The other presets sit on named public roads across Mableton (OSM lookups).
- **Presets** live in `app/admin/seed/presets.ts` (this card's directory), so the test and the page share them.

## Plan
- [x] `convex/seed.ts`: `generateUploadUrl`, `fixers` (picker), `samples` (status table), `seedSamples`, internal `attachFix`, `backdateFix`
- [x] `app/admin/seed/presets.ts` + `lib/demo.ts` DEMO_POINT move
- [x] `app/admin/seed/page.tsx`: passcode, sample rows (video or photos, preset/typed lat-lng, days-ago backdating, Mine, optional fix clip by fixer/neighbor + fixed days ago), upload via `framesFromFile`/`photoToJpeg`, live status table
- [x] Tests: `tests/convex/seed.test.ts` (wrong passcode on every function; seeded fields + stagger; fix attach/backdate flow), `tests/app/admin/seed/presets.test.ts` (DEMO_POINT within 50 m)
- [x] README "Demo runbook"
- [x] Verify: `npm test`, `tsc` (root + convex), lint, build, local Convex push + `npx convex run` smoke

## Progress (2026-10-25)
- Tests: `tests/convex/seed.test.ts` (20) and `tests/app/admin/seed/presets.test.ts` (4). Full suite: 53 files, 518 tests, all passing.
- `tsc` (root and `convex/`), `eslint .`, `npm run build` and `npm run check:bundle` are clean. `ADMIN_PASSCODE` doesn't leak into `.next/`.
- Pushed only to this worktree's **local** Convex (127.0.0.1:3210). Codegen's only change is adding `seed` to `api.d.ts`.
- **Live E2E on the local deployment** (real Anthropic and Google; synthetic canvas media, since there are no US3 fixtures on this machine):
  - The wrong passcode was refused (`ConvexError: Wrong admin passcode` in the logs).
  - Two photo samples were screened about 10 s apart. Both went `pending → open` with real Claude titles ("Large pothole in the right lane", Cobb DOT).
  - Sample 1's fix clip, by a seeded fixer: `attachFix` filed it once the report was open, the real `verifyFix` returned **verified**, and `backdateFix` moved `fixedAt` to 2 days ago. `createdAt` stayed backdated 23 days.
  - Headless Chromium on `/admin/seed`: a wrong passcode shows the error. After signing in, a photo sample on the before/after preset, marked "Posted by this device" and opened 9 days ago, was seeded and went open. The DB row has `isSample`, the preset lat/lng, the description, createdAt 9.0 days ago, and the device's resident.
- Not verified here: a video sample through `framesFromFile` in the page (headless Chromium has no real clip). The video path of `seedSamples` is covered by the tests, and `framesFromFile` by US7's browser tests.

## Review fixes (round 1, 2026-10-25)
None of these were blocking, so no second review round was needed.
- Seeded video clips must be MP4 or WebM, checked server-side in `seedSamples`, and the page's file pickers accept only those. An iPhone `.MOV` would otherwise be held as "screening failed" for good, because Groq can't transcribe it and `release` refuses a report with no title. There's a regression test, and it fails without the gate.
- The page refuses an empty or non-numeric lat/lng. `Number("")` used to seed the sample at (0, 0). It also refuses a mixed video-plus-photos pick, which used to drop files silently. Both checked in headless Chromium.
- The stage presets are swapped, so the pothole (29.9 m) is nearer `DEMO_POINT` than the before/after spot (38.6 m), and the duplicate check lists it first. There's a test for this.
- Runbook:
  - The after clip is described as pre-filmed and uploaded on stage, which removes the "filmed live" contradiction.
  - It says to convert `.MOV` files, to seed one batch at a time (the stagger is per call), and which card to tap for Me too.
- Verified: 520/520 tests, tsc (root and convex), eslint, build, check:bundle, and the local Convex push.

## Review (2026-10-25): CLEAN
- A fresh review agent ran `review-card` with two parallel reviewers: A on the ACs, B on scope and the spec. All 4 agent-verifiable ACs are checked off with proof. Nothing is blocking, and the reviewers didn't disagree.
- Left for the user:
  - Record US25's design calls in GOVTOK_DECISIONS.md §6.1.1/§8.
  - Choose which sample the demo phone owns: the before/after spot (fixed live) or a pre-fixed sample.
  - Check the stage presets on Google Maps.
  - Spec inconsistencies that predate this card.

## Review decisions (user, 2026-10-25)
- The phone owns **both** the before/after spot (fixed live on stage) and one pre-fixed, backdated fallback sample. The runbook is updated to match.
- Fix-clip audio: the runbook converts after clips with `ffmpeg -an`. The general upload gap is deferred in §8.
- Pitch counters include samples, labeled "from the demo (sample data)". Oct 30 uses `excludeSamples`.
- Recorded in GOVTOK_DECISIONS.md: §6.1.1 (US25 build details, which samples the phone owns, fix-clip audio), §6.2.1 (counters), §8 (fix-clip audio, the seed admin gate, dropped seed fixes, and a note on QuickTime), and the handoff block.

## San Francisco city profile (user decision, 2026-10-25)
The user wants the whole Cal Hacks demo in California, live at the Palace of Fine Arts. They chose the full SF re-skin through one profile switch, with fixers filming fixes on stage.
- `convex/lib/city.ts`: `SAN_FRANCISCO` and `MABLETON` profiles, each with id/`?demo=` value, name, prompt place, map center, demo point, routing table and owner labels. `ACTIVE_CITY = SAN_FRANCISCO`.
- Wired through:
  - `convex/lib/routing.ts`: `ROUTING`, plus the `OWNER_CHIP` labels.
  - `screenPrompt.ts` and `fixPrompt.ts`: "residents of ${place}".
  - `lib/demo.ts`: `DEMO_POINT` and `DEMO_VALUE`.
  - `ReportsMap.tsx`: `CITY_CENTER` replaces `MABLETON_CENTER`.
  - `MapScreen.tsx`: "Problems in ${name}".
  - The RecorderLab hint.
  - `app/admin/seed/presets.ts`: `PRESETS_BY_CITY`.
- SF `DEMO_POINT`: Baker St beside the Palace lagoon (37.803, -122.44687). The pothole preset is 28 m away and the before/after spot 39 m, and the Palace itself 135 m. The other presets are SF bus-stop corners (OSM).
- The stored owner values are unchanged (no schema change or migration).
- Tests:
  - Routing is checked against hand-restated tables for both cities.
  - The presets test runs for both cities.
  - Demo-mode tests use `DEMO_VALUE`.
  - Two tests pin "Cal Hacks runs as SF". With `ACTIVE_CITY = MABLETON`, those two are the only failures (checked).
- Live (local): two SF samples screened as "SF Public Works", with street "Baker St" from Google. The fix was verified and backdated.
- README runbook rewritten for SF (`?demo=sf`, an SF Public Works fixer, the fix filmed via `/fix`), plus the Oct 30 flip steps. Spec: handoff block, §2.1.2 SF table, §6.1.1 "City profile", §8.
