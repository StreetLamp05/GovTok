# US26 (#34): Compute the impact stats for the pitch

Spec: §6.2.1 (supporting counters). Parent: F8 Demo & impact (#32). Owns `convex/stats.ts` only; schema untouched (every field needed already exists: `owner`, `status`, `createdAt`, `fixedAt`, `revealViews`, `meTooCount`, `isSample`).

## Definitions (my reading of the card)
- **In scope:** all reports for `byStatus`; the other numbers use public reports only (`open | fixed`, §2.1.3), since pending/held aren't on the feed. `excludeSamples: true` drops `isSample` reports everywhere.
- **Days to fix:** `(fixedAt − createdAt) / 1 day`, fixed reports only. Median per owner (`city | cobb | utility | unknown`), 1 decimal, `null` with no fixes.
- **Share fixed within 30 days:** of reports whose 30-day window is decided (fixed, or open ≥ 30 days), the share fixed within 30 days. Open reports younger than 30 days aren't failures yet, so they're left out. The denominator is reported too.
- **Reveal views:** sum of `revealViews`; per fixed report = total / fixed count (`null` with no fixes).
- **Me-too share:** Σ`meTooCount` / (public reports + Σ`meTooCount`).

## Plan
- [x] `convex/stats.ts`: `internalQuery` `impact({ excludeSamples? })` returning plain JSON (no IDs)
- [x] `tests/convex/stats.test.ts`: fixture data checking every number, the exclude-samples option, and the empty case
- [x] Verify: `npm test`, `tsc`, lint, push to the local deployment, and `npx convex run stats:impact` prints readable JSON

## Verification
- `npm test`: 16 files, 89 tests pass (4 new in `tests/convex/stats.test.ts`)
- `npx tsc --noEmit` (root and `convex/`) and `npm run lint` are clean
- `scripts/with-node.sh npx convex dev --once` pushed to this worktree's local deployment (not the shared cloud one); `npx convex run stats:impact '{"excludeSamples": true}'` prints indented JSON (empty DB: zeros and nulls)
- Mutation-tested: making the open-report 30-day check strict, breaking the even-count median, ignoring `excludeSamples`, or counting held reports as public each fail the tests (the fix-side `<=` boundary wasn't covered until the review fixes below)

## Review (review-card): NEEDS_INPUT
Both ACs verified with proof. The reviewers split on the 30-day share denominator (recent fixes count, recent open reports don't), which is a pending user decision.

## Review fixes (obvious ones, applied 2026-10-25)
- [x] The header comment named the wrong pitch command. Now: Cal Hacks keeps samples in (`npx convex run --prod stats:impact`); Oct 30 adds `excludeSamples`
- [x] `samples` count at the top level and per owner, so it's visible how much of each number is seeded
- [x] Reuses `isPublicStatus` from `convex/lib/publicReport.ts` instead of restating open/fixed
- [x] `byOwner.*.fixed` counts every fixed report, so it agrees with `byStatus.fixed` and the views-per-fix denominator; one without `fixedAt` is only left out of the day counts
- [x] Tests: a fix on exactly day 30 is a hit (and 30.5 a miss), the `owner ?? "unknown"` fallback, a fixed report missing `fixedAt`, and median rounding (1.625 → 1.6)

## Decisions (user, 2026-10-25)
- [x] 30-day share: only reports 30+ days old count, fixed or open; a hit is a fix within 30 days. The field `decidedAt30Days` is renamed `atLeast30DaysOld`. Young fixes no longer inflate the share, and the on-stage fix doesn't count toward it.
- [x] A live fix shows as 0.0 days: left as is (days, 1 decimal)
- [x] §6.2.1 now reads "me-toos as a share of (reports + me-toos)", matching the card and code. `--prod` stays with US25/US27.

## Re-review (review-card, after fixes): CLEAN
Both ACs verified. AC2 was checked from the tests and the CLI source, since port 3210 was taken and the CLI wasn't run. The settled decisions and earlier fixes are all implemented. 7 of 8 mutations fail the tests. Open non-blocking items:
- [x] Header comment: per-owner timings are seeded at Cal Hacks (backdated samples), so don't read them as findings
- [x] Header comment overstates `samples`: it covers public reports only, not `byStatus`
- [x] Add a date tag to the §6.2.1 wording edit (spec convention). The handoff block was left alone, since it's stale beyond this card.
- Fast-forwarded to origin/main (7755974) before these fixes; tracked diffs reapplied with `git apply -3`, which applied cleanly
- [ ] Minor: `Date.now()` in the query can lag minutes when cached; a negative fix time isn't guarded; on a TTY the CLI prints util.inspect output (pipe it to get strict JSON)

## Verification (after fixes)
- `npm test`: 16 files, 90 tests pass (5 in `tests/convex/stats.test.ts`); both `tsc` runs and lint are clean
- Mutation-tested: `<=` → `<` on the fix side, letting young fixes into the 30-day share, dropping the `owner ?? "unknown"` fallback, zeroing `samples`, and leaving untimed fixes out of `fixed` each fail the tests
- The CLI wasn't re-run after the fixes, because port 3210 is held by the US20 worktree's local backend (all worktrees default to the same port). The output keeps the same plain-JSON shape with two new fields, and the empty-database test round-trips it through JSON.
