# US19 — Play the before/after reveal on fixed cards (#23)

Spec: §5.1.1 (reveal), §4.3.2 (who label), §6.2.1 (revealViews), §4.3.1/§6.1.1 (fix clip muted).
Deps merged: US16 (feed, pool, `CardReveal` slot contract), US17 (`fixedLine`, captions). Schema already has `revealViews`; no schema change.

## Plan
- [x] `convex/reveal.ts`: `recordRevealView({reportId})` adds 1 to `revealViews`. No-op unless the report exists and is `fixed`. Doesn't bump `lastActivityAt`, so the feed doesn't reorder.
- [x] `components/RevealPlayer.tsx`
  - Phases: `original → stamp (700 ms) → fix → original …`
  - Original phase: an external `video` (the feed's pooled element, which the pool starts) or, in `standalone` mode (Me page, US24), its own `<video>`. Takes over with `video.loop = false`, waits for `ended`, then restarts it with `currentTime = 0` on each later pass. With no video (a slideshow), it holds for a fixed time instead.
  - Stamp at z-[5]: "FIXED · N days · <who>". `<who>` comes from US17's `fixedLine` (fixer org / "Fix confirmed by a neighbor · <agency>"). `onStamp` fires each time it plays.
  - Fix clip: its own `<video>` at z-[2], always muted (set before every play), loaded only when `near`, hidden outside the fix phase. Ends or errors → back to original. No `fixUrl` → skip straight back.
  - Inactive → reset to original, pause the fix clip.
  - `recordRevealViewOnce(id, record)` + `useRecordRevealView()`: once per report per session (sessionStorage, with an in-memory fallback). Unmarks if the mutation fails.
- [x] `components/feed/CardReveal.tsx`: fixed cards only → `RevealPlayer` with `onStamp` = record the view once.
- [x] `components/feed/CardOverlay.tsx` (US17's, one-line change its comment asks for): no caption once the clip has `ended`, so the last caption doesn't stay over the stamp and the fix clip.
- [x] Regenerate `convex/_generated/api.d.ts` (`npx convex codegen`; no push to the shared deployment)
- [x] Tests
  - `tests/components/RevealPlayer.test.tsx`: state machine original → stamp → fix → original (video and slideshow); stamp text for fixer and neighbor; fix `<video>` muted even after the unlock tap; inactive resets; `loop = false` takeover; no fix load when not near
  - `tests/components/feed/CardReveal.test.tsx`: open card renders nothing; the client helper calls the mutation once per report per session across loops and remounts
  - `tests/convex/reveal.test.ts`: +1 per call; non-fixed / missing report unchanged
  - `tests/components/feed/CardOverlay.test.tsx`: no caption after `ended`
- [x] `npm test`, `npx tsc --noEmit`, `npm run lint`, `npm run build`, `npm run check:bundle`

## Notes
- Fix clip in its own element (not a src swap on the pooled one): both clips stay buffered across loops, so there's no re-download per loop (Convex's free file bandwidth is small) and no flash between phases.
- `recordRevealView` takes no token, so anyone can inflate the counter. Acceptable for a demo counter (§6.2.1).

## Progress (2026-10-25)
- All plan items done. Verification: `npx vitest run` 45 files / 367 tests pass; `npx tsc --noEmit` clean; `npm run lint` clean; `npm run build` passes; `npm run check:bundle` no leaks.
- Mutation check: each of 10 deliberate breaks fails a test: no mute before the fix plays, no session dedup, no `loop = false` takeover, no reset when inactive, taps resuming during stamp/fix, no restart after the first pass, the fix clip loading when not near, a caption after `ended`, counting non-fixed reports, no retry after a failed call.
- `convex/_generated/api.d.ts`: added `reveal` by hand, in codegen's order. `npx convex codegen` couldn't reach a deployment: a local backend on :3210 rejected this worktree's admin key, likely a sibling worktree's. No push to any deployment, so `recordRevealView` is not deployed yet. It goes live on the normal deploy after merge.
- Off-plan additions:
  - Taps during the original resume a clip that autoplay refused (iOS Low Power Mode). The pool stops doing that once `loop` is off. They also play+pause the fix clip once inside the gesture, so it can play later. Taps never touch anything during the stamp or the fix clip.
  - `standalone` mode for US24: draws its own original `<video>` (or slideshow) in a box.
  - Open cards never call `useMutation`: a fixed-only inner component holds the hook, so Feed's tests (which mock only `useQuery`) still pass unchanged.

## Review fixes, round 1 (2026-10-25)
- A1 (high, blocking): on first mount, a deep link, or a jump past the preloaded card, Feed's src effect ran after RevealPlayer's takeover (parent effects run after child effects) and turned `loop` back on. The original then looped forever with no stamp. Fix: the original phase takes over again on the element's `loadstart` and `play`. Regression test: `tests/components/feed/CardReveal.test.tsx` "in the feed" renders the real `Feed` with a fixed card first and reaches the stamp. It fails without the fix.
- A2 (test gap): a test checks that a tap during the fix clip doesn't pause it. It fails if the phase guard is removed.
- A3 (test gap): a test checks that `STAMP_MS` is 700 (~0.7 s, §5.1.1).
- B7 (doc): CardOverlay's caption comment now says the `ended` rule relies on the pool setting `loop` on every src change.
- Verification: 45 files / 370 tests, tsc, lint, build and bundle check all pass.

## Review round 2 (2026-10-25): review-card, verdict CLEAN
Two fresh reviewers again: A checked implementation vs. ACs (including a real-Chromium probe of the feed pool with webm clips), B checked scope and spec. All 3 ACs pass with proof, and nothing blocks. Both agree that A1 from round 1 is fixed: the stamp is reached on first mount, after a jump, and after jumping back.

## Review fixes, round 2 (2026-10-25)
- A1 (minor): an original clip that failed to load never ended, so the reveal stalled on the poster. Now, on an `error` event, or an element that already has an error, it holds for `PHOTO_HOLD_MS` like a slideshow and then stamps. Test: "an original that fails to load holds on its poster…".
- A2 (nit): if `getItem` worked but `setItem` threw (full quota), dedup failed. The page-level Set is now always checked and written, with sessionStorage as the cross-remount/session store. Test: "still once per report when sessionStorage reads but won't write".
- Verification: 45 files / 372 tests, tsc, lint and build all pass. Removing each fix fails its test.

## Decisions (user, 2026-10-25)
- Photo posts (4 s hold, slideshow dots and arrows over the fix clip): leave for M0. The samples are videos.
- No fix clip: keep the stamp (original → stamp → original).
- `recordRevealView` abuse and bandwidth risk: accepted for M0, recorded in §8.
- Spec notes: added dated US19 lines under §5.1.1 and §6.2.1, plus the §8 risk.
- Refactor (`fixedLine`/`Slideshow` imported from `components/feed/`): leave as is.
- Mockup "Before / After · proof of fix" chip: follow-up for M1, noted in §5.1.1.
- Still to do at merge: deploy `recordRevealView`, and resolve the `api.d.ts` conflict with US18 (keep both lines or re-run codegen).
