# US16 — Scroll a full-screen feed of public reports (#20)

Spec: §5.1.1, §5.1.2, §7.1.1, §4.2.1. Deps merged: US5 (schema, `publicReport`), US6 (`useSoundUnlocked`).

## Plan
- [x] `convex/feed.ts`
  - `feed`: `by_lastActivity` desc, filter open|fixed, `take(50)`, through `publicReport`
  - `reportById({id: string})`: `normalizeId` (a bad id from the URL returns null, doesn't throw), then `publicReportOrNull`
- [x] `components/feed/` slot stubs `CardOverlay` (US17), `CardRail` (US18), `CardReveal` (US19), `CardActions` (US23), all taking `FeedSlotProps = {report, active, video}`
- [x] `components/feed/FeedCard.tsx`: full-screen snap card, frame-0 poster, mockup gradients, the four slots
- [x] `components/feed/Feed.tsx`
  - Snapshot order on mount (pinned `?report=` card first); live data overrides by id, so counts update and nothing reorders; a card pushed out of the top 50 keeps its last copy instead of vanishing
  - IntersectionObserver picks the active card
  - Pool of 3 `<video>`s, slot = cardIndex % 3, covering {prev, active, next}. Stable keys, so the elements persist and iOS keeps the unlock; only src/position change. Preload: active + next `auto`, prev `none`
  - Muted until unlock; `audioMuted` (or `data-silent` set by a slot, for US19's fix clip) never unmutes. Unlock in a layout effect inside the gesture, and "bless" every pool element (play+pause); a tap on the feed re-applies it (covers a first swipe that iOS won't count as a gesture)
  - If unmuted play is refused, fall back to muted play
- [x] `app/(tabs)/page.tsx`: server page reads `searchParams.report`, `<Feed key={report} firstId={report} />` so a new deep link remounts and re-sorts
- [x] Regenerate `convex/_generated/api.d.ts`
- [x] Tests
  - `tests/convex/feed.test.ts`: excludes pending/held; lastActivityAt desc; no residentId; muted has no transcript/description; `reportById` null for held (and for a bad id)
  - `tests/components/feed/Feed.test.tsx` (jsdom, mocked `convex/react`): audioMuted card stays muted after unlock (a normal card unmutes, as a control); a live count change doesn't reorder; remount re-sorts; `?report=` card first
- [x] `npm test`, `npx tsc --noEmit`, `npm run lint`, `npm run build`

## Notes
- No schema change needed: `by_lastActivity` exists.
- iOS pool behavior can only be proven on a phone (manual test after merge).

## Progress (2026-10-25)
- All plan items done. Verification: `npx vitest run` 17 files / 98 tests pass; `npx tsc --noEmit` clean; `npm run lint` clean; `npm run build` passes; `npm run check:bundle` no leaks.
- Mutation check: dropping `audioMuted` from the mute rule fails the sound test; returning the live order instead of the snapshot fails 3 order tests.
- Off-plan, one line: `vitest.config.mts` gets `resolve: { tsconfigPaths: true }` so component tests can import code that uses `@/`. US17/18/19 tests need the same thing.
- `/` is now a dynamic route (it reads `searchParams`).
- No Convex push. `npx convex codegen` regenerated `api.d.ts` only (it doesn't change the deployment).

## Review (2026-10-25): review-card, verdict CLEAN
Two fresh reviewers: A checked implementation vs. ACs, B checked scope and spec alignment.

All 4 ACs checked off with proof. The reviewers re-ran tests, tsc, lint and build themselves, and broke the code on purpose to confirm the tests catch it. Nothing blocks.

Non-blocking findings, not fixed (fixing is a separate step):
- [x] A1 (medium): the first tap never plays the third pooled `<video>`, because `applySound` skips empty slots. Cards 2, 5, 8… may then play muted on iOS. Fix: play+pause every pool element.
- [x] B1 (medium): `onClick={applySound}` replays the on-screen video on every tap. That would restart the original clip under US19's stamp or fix clip. Fix: don't replay a video that was deliberately paused or ended (`!el.loop` / `el.ended` / a hold flag).
- [x] B2 (medium-low): add `near` to `FeedSlotProps`, so slideshows (US17) and fix clips (US19) can follow the preload-only-the-next-card rule.
- [x] A2 (low): the IntersectionObserver should also require `intersectionRatio >= 0.6` (WebKit hardening).
- [x] B3 (low-medium): set a layer order for `CardReveal` vs. `CardOverlay` on fixed cards, which are both at `z-[2]`.
- [x] B4 (low): in demo mode, the `DemoBanner` covers the top 26px of the fixed feed, where the Sample badge goes.
- [x] A3 (test gap): the `take(50)` test doesn't put held or pending reports above the public ones. The behaviour itself was verified with a scratch test.
- B5: matches §5.1.2. Reports posted while the feed is open appear on the next remount.

Spec inconsistencies outside this card: "Next steps" #3 asks for a `status`+`lastActivityAt` index, but §5.1.2 says one index. The design queue still calls 4.1.1 "video only".

## Review fixes (2026-10-25)
- A1: the unlock plays and pauses all 3 pool elements, including empty ones.
- B1: a tap only resumes the on-screen video if it's paused while the pool owns it (`loop` on). It never restarts it. Contract written in `CardReveal`: set `loop = false` to take over.
- B2: `near` is in `FeedSlotProps` and passed to every slot.
- A2: the IntersectionObserver requires `intersectionRatio >= 0.6`, not just `isIntersecting`.
- B3: the layer scale is documented in `FeedCard` (poster 0, pool video 1, slot media 2, gradients 3, slot UI 4, stamp 5). `CardReveal` now renders after `CardOverlay`, and slot roots must not create stacking contexts.
- B4: in demo mode the feed starts at `top-[26px]`, below the banner.
- A3: the 50-limit test now has 10 newer held or pending reports.
- Each fix has a test. Reverting each fix makes its test fail. 105/105 tests, tsc, lint, build and bundle check all pass.
- Not touched: the spec inconsistencies (not this card's), and B5 (matches §5.1.2).
