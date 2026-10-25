# US17 — Show who's responsible, days open, captions and the map pin on each card (#21)

Spec: §5.1.1, §2.1.2, §6.1.1, §5.2.1. Dep merged: US16 (feed, slot stubs, `FeedSlotProps`).
Layout follows `spec/UI_mockups/GovTok Prototype.html` (feed card).

## Plan
- [x] `lib/captions.ts`: `captionAt(segments, t)` → the segment with `start <= t < end`, else null
- [x] `components/feed/Slideshow.tsx`: horizontal scroll-snap photo strip at `z-[2]` (slot media layer), photos load only when `near`, dot indicator + "n / N" at `z-[4]`. Its own horizontal scroller, so a sideways swipe never scrolls the feed
- [x] `components/feed/CardOverlay.tsx`
  - Sample badge (`isSample`), owner chip (dot color from `OWNER_CHIP`, text = `agency`), status chip ("Open · N days" from `createdAt`, "Fixed in N days" from `fixedAt − createdAt`), title, street, description (hidden when `audioMuted`)
  - Muted note ("Audio muted by screening · no captions") per the prototype
  - Captions: while active, follow `video.currentTime` (`timeupdate`/`seeked`) through `captionAt`; none when `audioMuted`; none when the pooled element isn't playing this card's clip (US19 may swap `src` to the fix clip)
  - "On map" pin: `Link` to `/map?report=<id>`, bottom of the right column (US18/US23 rail buttons stack above it)
  - Slideshow for `mediaType === "photos"`
  - No stacking context on the root (fragment); text layers `pointer-events-none` so swipes reach the slideshow
- [x] Tests
  - `tests/lib/captions.test.ts`: in a segment, at boundaries, gaps, before/after, empty/undefined
  - `tests/components/feed/CardOverlay.test.tsx` (jsdom): 4 owners → own dot color + agency; 23 days → "Open · 23 days"; fixed 9 days after creation → "Fixed in 9 days"; muted shows no captions/description; Sample badge only when `isSample`; pin href `/map?report=<id>`; captions follow `currentTime`; slideshow dots follow scroll
- [x] `npm test`, `npx tsc --noEmit`, `npm run lint`, `npm run build`, `npm run check:bundle`

## Notes
- No Convex change: `publicReport` already returns everything (segments/description omitted when muted).
- Day math reuses `daysOpen` / `daysLabel` from `components/fix/FixerList.tsx`. Wording for 0 days follows the prototype: "Open · today" / "Fixed same day".
- Captions use `useSyncExternalStore` over the pooled `<video>` (`timeupdate`, `seeked`, `emptied`, `loadstart`). They show only while the element's `src` is this card's `clipUrl`, so they disappear if US19 swaps in the fix clip.
- The "On map" pin is at the bottom of the right column (`bottom-[130px] right-2.5`, as in the prototype rail). US18's Me too and US23's "Fixed?" stack above it.
- Not visually checked in a browser: that needs a running Convex backend with seeded reports, and pushing to the shared dev deployment is off-limits. The phone check is the card's manual test.

## Progress (2026-10-25)
- All plan items done. `npx vitest run`: 37 files / 277 tests pass. `npx tsc --noEmit` clean. `npm run lint` clean. `npm run build` passes. `npm run check:bundle` ok.
- Mutation check. Each break fails at least one test:
  - making a segment's end inclusive
  - dropping the `audioMuted` guards
  - dropping the src guard
  - hardcoding the owner color
  - counting fixed days to now instead of `fixedAt`
- No Convex push (no backend change). `convex/_generated/api.d.ts` only had a pre-existing import reorder from codegen.

## Review (2026-10-25): review-card, verdict CLEAN
Two fresh reviewers: A checked the implementation against the ACs, B checked scope and spec alignment. All 3 ACs are checked off with proof. A re-ran tests, tsc, lint, build and the bundle check, and broke the code 13 ways that matter for the ACs. Every break failed a test. Nothing blocks.

## Review fixes (2026-10-25)
- A1 (test gap): the slideshow test now checks that the highlighted dot is the wide one, not just `data-current`. A mutation that leaves the first dot always highlighted fails it.
- B1 (coordination): CardOverlay's header comment records the pin's footprint (about 70px tall, anchored at `bottom-[130px] right-2.5`), so US18 and US23 stack above it.
- B2: the slideshow arrows moved from `top-1/2` to the mockup's `top-[300px]`. The comment no longer says "for a mouse" only.
- B3: `useCaption` notes that its src check only catches a fix clip swapped into the pooled element. If US19 plays the fix clip in its own `<video>`, US19 must hide the captions.
- After the fixes: 277/277 tests, tsc, lint, build and the bundle check pass. Nothing blocking was fixed, so no second review round.

## Decisions (2026-10-25, user)
- Slideshow arrows: hidden on touch screens (`[@media(pointer:coarse)]:hidden`, confirmed in the built CSS). Mouse only.
- 0-day wording: keep "Open · today" / "Fixed same day". Note added to §6.1.1 (Backdating bullet). The fixer screens keep "0 days".
- "Fixed by" line: added to US17. Fixer → "Fixed by <org>" (§3.1.2). Neighbor → "Fix confirmed by a neighbor · <agency>" (§4.3.2). No line on open cards, or with no fixer recorded. `fixedLine()` in CardOverlay, 3 tests.
- Day helpers moved to `lib/days.ts`, with tests in `tests/lib/days.test.ts`. FixerList, `app/fix/[reportId]` and CardOverlay import them from there. The FixerList test keeps only `formatDistance`.
- `convex/_generated/api.d.ts` reverted to main.
- After these: 38 files / 282 tests, tsc, lint, build and the bundle check pass.
