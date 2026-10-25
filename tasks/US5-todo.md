# US5 (#6): Define the full Convex schema and shared domain modules

Spec: §2.1.1, §2.1.2, §2.1.3, §3.1.1, §3.1.2, §7.1.1. Parent: F1 Foundation (#1). Rebased (fast-forwarded) onto main at e6a61d9 (US6 and US4 merged).

Dispatcher constraint: keep the `placeholder` table in `convex/schema.ts`, and leave `convex/placeholder.ts` and its test alone. A follow-up drops them; US6 has already removed `app/page.tsx`, which used them.

## Plan
- [x] `convex/lib/routing.ts`: `CATEGORIES`, `OWNERS`, `ROUTING` (§2.1.2), `routeCategory` (unknown → `other`), `OWNER_CHIP` (mockup colors), validators
- [x] `convex/schema.ts`: reports, meToos, residents, fixers, fixAttempts and all 11 indexes; `placeholder` kept
- [x] `convex/lib/geo.ts`: `NEARBY_METERS`, `haversineMeters`, `boundingBox`, `inBox`
- [x] `convex/lib/auth.ts`: `getOrCreateResident`, `findResident`, `requireFixer`
- [x] `convex/lib/publicReport.ts`: allowlist projection, `fixedByLabel`, muted fields hidden, storage URLs
- [x] `convex/files.ts`: `generateUploadUrl({token?, fixerToken?})`
- [x] `lib/upload.ts`: `uploadFile(blob, getUploadUrl)` plus a `useUploadFile(auth)` hook that returns `uploadFile(blob)`
- [x] Stubs: `screening.ts` and `fixVerification.ts` (`"use node"`), plus `screeningDb.ts` and `fixVerificationDb.ts`

## Review fixes (user decisions, 2026-10-24)
- [x] Node pinned to 24: `.nvmrc`, `engines` `24.x`, `convex.json` `node.nodeVersion: "24"`, and `scripts/with-node.sh`, which puts nvm's Node 24 first on PATH. `worktree-setup.sh` re-runs itself through it, as does `npm run dev:backend` and the dispatch-cards tmux launch. README updated.
- [x] `attempt: v.optional(v.number())` on `screenReport` and `verifyFix` for the retry-once rule
- [x] Status guards: `isPublicStatus`, `publicReportOrNull` (for lookups by ID), and `publicReport` now throws on pending or held reports
- [x] Tests moved to `tests/convex/` (shared `tests/convex/setup.ts` holds the module glob), and US6's hook tests moved to `tests/lib/hooks/`. Vitest includes `tests/**` and, until the placeholder follow-up, `convex/**`.
- [x] `uploadFile(blob, { fixerToken }?)` is now a plain async function that matches the issue. It uses a lazy `ConvexHttpClient` and defaults to this device's `getResidentToken()`. Tested in `tests/lib/upload.test.ts`.
- [x] A fixer's fix with no `fixedByOrg` gets its label from the fixer's org in the `fixers` table, then falls back to `UNKNOWN_FIXER_LABEL`.
- [x] `SCREENING_FAILED_REASON` in `convex/lib/screening.ts`, for US13, US14 and US24
- [x] `ownerReport(ctx, report, residentId)`: the poster's own view, with any status plus verdict and reason. It throws for anyone else, still hides residentId and fixedBy and the muted fields, and shares one allowlist (`project()`) with `publicReport`

## Verification
- `scripts/with-node.sh npx convex dev --once` and `npm run dev:backend -- --once` both push to the local deployment
- `npm test`: 15 files, 81 tests pass (US5, US6, US4 and the placeholder test)
- `npx tsc --noEmit`, `npm run lint`, `next build` and `npm run check:bundle` are clean
- I mutation-tested the tests: breaking the routing agency, muting, residentId removal or the bbox cos(lat) term makes them fail
- `with-node.sh` works in all three cases: system Node 26 (switches to 24), Node 24 already first on PATH, and no nvm install (prints an error and exits 1)

## Review (review-card, before the fixes)
All 6 ACs were verified with proof. The blocking finding (Node 26 vs the `"use node"` stubs) and the retry-arg and status-guard findings are fixed above. The `uploadFile`, `fixedByLabel`, "screening failed" and owner-projection findings are fixed too. Category display labels aren't needed, because no M0 card displays a category name.
