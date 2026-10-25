# US4 (#5): Deploy to Vercel with Convex production

Spec §1.1.1: HTTPS deploy on Vercel so phones allow camera access; Convex holds server keys.

## Plan
- [x] `vercel.json`: `buildCommand` = `npx convex deploy --cmd 'npm run build'` (reads `CONVEX_DEPLOY_KEY`, already set in Vercel Production by the user); `ignoreCommand` skips non-production builds, so previews (which have no key) never build or deploy Convex
- [x] `app/dev/camera`: live rear-camera preview after a tap → permission prompt; not linked anywhere, `noindex`
- [x] `scripts/check-client-bundle.sh` + `npm run check:bundle`: fail if any server key name or value (from `.env.local`) appears in `.next/static`
- [x] Verify: `npx tsc --noEmit`, `npm run lint`, `npm test`, `npm run build`, `npm run check:bundle`, camera page in headless Chrome on localhost
- [x] Human (done per the user, 2026-10-24): `scripts/convex-env.sh --prod` run; `CONVEX_DEPLOY_KEY`, `NEXT_PUBLIC_GOOGLE_MAPS_KEY` and `NEXT_PUBLIC_GOOGLE_MAP_ID` set in Vercel Production; prod domain allowed on the Maps key

## Verification log
- tsc clean, lint clean, `npm test` 1/1 passed, `npm run build` lists `/dev/camera` as a static route.
- `npm run check:bundle` on the real build: all 5 server keys ok (values checked for the 4 in `.env.local`; `CONVEX_DEPLOY_KEY` by name only, since it's kept out of `.env.local`).
- Negative test (scratch copy, fake keys): a planted value → `LEAK GROQ_API_KEY (value…)`, exit 1; a planted name → `LEAK ANTHROPIC_API_KEY (name…)`, exit 1.
- Headless Chrome + fake camera against `next start`: before tap, the video is hidden (`display:none`); after allowing, the video is visible and playing at 640×480 with a live track. With permission denied, the page shows "Camera permission was denied…" plus a Try again button, and the video stays hidden.
- `convex deploy --help` + CLI source: it targets the `CONVEX_DEPLOY_KEY` deployment and injects `NEXT_PUBLIC_CONVEX_URL` for Next.js `--cmd`.
- Rear-facing selection (`facingMode: environment`) can't be checked on a laptop; it's covered by the phone manual test.

## Review (review-card, verdict NEEDS_INPUT) and follow-ups
- AC1 ✓, AC3 ✓. AC2 open (human: `scripts/convex-env.sh --prod`, Vercel `NEXT_PUBLIC_*`). AC4 was only proven for `.next/static`.
- [x] Widened `check-client-bundle.sh` to all of `.next/` minus `cache/`. A planted value in `.next/server/app/seed.html` gives LEAK, exit 1; a value only in `cache/` passes. The real build passes with all 5 ok.
- [x] Camera stream release: double tap opens 1 stream; a `play()` rejection stops the stream (0 live) and reports "preview didn't start (NotAllowedError)", not "permission denied"; Try again leaves 0 live. Allow/deny regressions unchanged. tsc, lint, tests, and build all clean.
- [x] Per-card task files: renamed to `tasks/US4-todo.md`; run-card, start-card and CLAUDE.md now say `tasks/<CardID>-todo.md`.
- Not done (low): duplicate server-key list across scripts, a card to hide `/dev/*` before submission, a PR note that cancelled previews are intentional.

## Rebase + tests (2026-10-24)
- [x] Rebased onto origin/main 32efbbd (US6), cleanly, then `npm install` for US6's test deps
- [x] Tests in `tests/`, following US5's layout: `tests/app/dev/camera/CameraPreview.test.tsx` (8), `tests/scripts/check-client-bundle.test.ts` (6), `tests/vercel.test.ts` (2). `vitest.config.mts` include is byte-identical to US5's hunk, so the two merge cleanly
- [x] Mutation check: dropping the double-tap guard, or narrowing the bundle check back to `.next/static`, each fails a test
- [x] Gates: build, tsc, lint, `npm test` 17/17, `check:bundle` all clean
- Note: until US5 lands, US6's `lib/hooks/*.test.*` don't run on this branch (the include matches US5's, and US5 moves them into `tests/`)
