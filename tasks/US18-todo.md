# US18: Tap Me too from a feed card (#22)

Hotfix-pace run (end of Cal Hacks): the feed had no Me too button because `CardRail` was still the US16 stub.

- [x] `convex/relation.ts`: `myRelation({token, reportIds}) → {mine, meTooed}`. Unknown or empty token gets empty lists; at most 50 ids per call; only the caller's own ids (§7.1.1)
- [x] `components/feed/CardRail.tsx`: Me too button with its count. Calls `meToos.meToo` with an optimistic update on `feed.feed`, `feed.reportById` and `relation.myRelation`; rolls back on error. Hidden on fixed cards, on your own posts, and until `myRelation` loads. Only near cards subscribe. Sits at `bottom-[302px]` above "Is it fixed?", or at `bottom-[216px]` on city cards that have no "Is it fixed?"
- [x] `convex/_generated/api.d.ts`: registered `relation` by hand (same output as codegen)
- [x] Tests: `tests/convex/relation.test.ts` (2), `tests/components/feed/CardRail.test.tsx` (7, running the real optimistic update against a fake query store)
- [x] `tests/components/feed/CardReveal.test.tsx`: mocks `CardRail`, since it renders the whole feed with a bare `useMutation` mock

## Verification
- `vitest run`: 66 files, 675 tests pass
- `tsc --noEmit` and `eslint .` are clean
- `next build` passes (with a placeholder `NEXT_PUBLIC_CONVEX_URL`, since the worktree has no `.env.local`)
- Not done: a Convex push and a manual check on a phone. Manual test from the card: with two phones, a Me too on one updates the count on the other without moving the card
