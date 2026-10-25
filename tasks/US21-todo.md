# US21: Log in as a fixer and see the nearest open reports (#27)

Spec: §3.1.2, §5.3.1 (all owners listed per §4.3.2; public projection per §7.1.1).
Depends on US5 (schema, `requireFixer`, `publicReport`) and US6 (`useCurrentLocation`, demo mode). Both merged.

## Plan

### Backend: `convex/fixers.ts`
- [x] `seed` internalMutation, args `{fixers: [{name, org, passcode}]}`. Upserts by passcode so a re-run doesn't duplicate; rejects empty passcodes and duplicates within one call.
- [x] `fixerLogin({passcode})` mutation: looks up `by_passcode`; returns `{token, org}`, issuing and storing a token (`crypto.randomUUID()`) only when the fixer has none. Every failure (empty, unknown) throws the same `ConvexError("Wrong passcode")`.
- [x] `openReportsForFixer({fixerToken})` query: `requireFixer`, then every `open` report via `by_status_lat`, through `publicReport`. No owner filter (§4.3.2).

### Client
- [x] `lib/hooks/useFixerToken.ts` (moved from `app/fix/` after review): token in localStorage under `govtok.fixerToken` (separate from `govtok.residentToken`), with a subscribe/notify store so login/logout re-render. Storage failure → in-memory for this page session.
- [x] `components/fix/FixerList.tsx`: `sortNearestFirst(reports, point)` (pure, haversine from `convex/lib/geo`) + list rows: thumbnail (`frameUrls[0]`), title, owner chip (`OWNER_CHIP` + agency), "Open · N days", me-too count, distance. Uses `useCurrentLocation`; without a fix, lists the longest-open first and hides distance.
- [x] `app/fix/page.tsx`: passcode screen when no token; list when there is one. If the stored token is rejected, clear it and show the passcode screen again.
- [x] `app/fix/[reportId]/page.tsx`: report detail. Plays the original (video, or photos for a slideshow) and shows a "Record fix" button, disabled until US23 wires it.

### Tests
- [x] `tests/convex/fixers.test.ts`: wrong passcode fails (and gives the same error as empty); right passcode → token `requireFixer` accepts, plus org; second login returns the same token; `openReportsForFixer` rejects an invalid token; returns all owners' open reports only, through the projection; seed upserts.
- [x] `tests/components/fix/FixerList.test.tsx`: `sortNearestFirst` from `DEMO_POINT`; rendered list in demo mode (`?demo=mableton`) is nearest first with distances.
- [x] `tests/app/fix/useFixerToken.test.ts`: separate key from the resident token, persists, clears.

### Verify
- [x] `npm test`, `npx tsc --noEmit`, `npm run lint`, `npm run build`
- [x] Convex typecheck of the new module against the local deployment (no push to the shared cloud dev)

### Notes
- Added `fixerSession({fixerToken})` to `convex/fixers.ts` (not in the card text): a non-throwing token check, so `/fix` can send a fixer with a stale token back to the passcode screen instead of hitting the throwing `openReportsForFixer`. It returns only the org, which is already public (§7.1.1).
- `components/fix/FixerList.tsx` uses relative imports: vitest has no `@/` alias, and the component is tested directly.
- "Record fix" on `/fix/[reportId]` is a disabled button; US23 wires it to its capture screen.
- Seed accepts any non-empty passcode (the 6-character minimum was dropped after review; see below).

## Verification
- `npm test`: 18 files, 103 tests pass (new: `tests/convex/fixers.test.ts` 8, `tests/components/fix/FixerList.test.tsx` 6, `tests/app/fix/useFixerToken.test.ts` 4)
- `npx tsc --noEmit`, `npm run lint`, `npm run build`, `npm run check:bundle`: clean
- Pushed to this worktree's **local** Convex (127.0.0.1:3210) and smoke-tested with `npx convex run`: seed inserts; wrong passcode → `Wrong passcode`; the right one returns org + token, twice the same token; `openReportsForFixer` works with it and rejects a forged token. A test fixer (`smoke-123456`) is left in the local DB only.

## Review (review-card, 2026-10-25): CLEAN
Two fresh reviewers (A: ACs, B: scope and spec fit). All 3 agent-verifiable ACs checked off with proof. No blocking findings, and the reviewers didn't disagree.

## Follow-up to the review (2026-10-25)
Fixed (one obvious fix each):
- [x] **Detail page vs US23:** new `fixerReport({fixerToken, reportId})` query (`publicReportOrNull`, `normalizeId` for bad URL IDs). The detail page uses it, so a report fixed while it's on screen stays and shows "Fixed by …". "Record fix" shows only while the report is `open`.
- [x] "1 day" is singular (`daysLabel`); the fixed state reads "Fixed in N days".
- [x] `/fix` shows "Loading…" while a stored token is checked, not a blank page.
- [x] Signing out in one tab signs out other tabs (`storage` event). The in-memory fallback now holds the token only when storage refuses it, so it can't outlive a sign-out in another tab.

Decided by the user:
- [x] Seed keeps matching on passcode. Revoking a passcode means deleting its row in the Convex dashboard; documented on `seed` and in §3.1.2.
- [x] The 6-character minimum is dropped; any non-empty passcode works ("4821" included). ENV_KEYS.md's "6+ chars" stays as advice only.
- [x] No Sample badge on the fixer screens (feed only).
- [x] No limit on passcode guesses: recorded in §3.1.2 as an accepted weakness and deferred in §8.
- [x] Moved the token hook to `lib/hooks/useFixerToken.ts` (test: `tests/lib/hooks/useFixerToken.test.ts`), so US23 imports it from next to `useResidentToken`.
- [x] Spec fixes: the §3.1.2 `fixers` bullet now includes `token`; the build plan's index line now matches the schema (`by_lastActivity`, `by_status_lat`).
- [x] Verified after these changes: `npm test` 18 files / 108 tests, `tsc`, lint, build, bundle check (no leaks). Pushed to local Convex: seeding "4821" works, and `fixerReport` returns null for a malformed ID and rejects a forged token.
- [x] Posted coordination comments on GitHub (#29, #21, #12): US23 (render FixCapture from `app/fix/[reportId]/page.tsx`, use `lib/hooks/useFixerToken`), and US17/US10 (days open = `floor((now - createdAt) / day)`, "1 day" singular).
