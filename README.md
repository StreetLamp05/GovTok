# GovTok

A TikTok-style feed for Mableton, GA. Residents film a problem, neighbors "me too" it, and the proof-of-fix video appears on the same card when it's resolved. The design lives in [GOVTOK_DECISIONS.md](GOVTOK_DECISIONS.md).

Stack: Next.js (App Router) on Vercel, with Convex for the database, file storage, live updates and server actions.

## Fresh clone

Requires Node 24 (pinned in `.nvmrc`) and npm. Convex's local backend runs `"use node"` actions only on Node 20, 22 or 24. If your system Node is a different version, install [nvm](https://github.com/nvm-sh/nvm) and run `nvm install 24`. `npm run dev` and `scripts/worktree-setup.sh` then switch to Node 24 on their own, through `scripts/with-node.sh`. For other Convex commands, prefix them: `scripts/with-node.sh npx convex dev --once`.

```bash
npm install
cp .env.example .env.local      # then fill in the values
npm run dev                     # Next.js on :3000 and `convex dev`, together
```

The first `npm run dev` asks you to log in to Convex and pick or create a project. It writes `CONVEX_DEPLOYMENT` and `NEXT_PUBLIC_CONVEX_URL` to `.env.local`.

Put the server keys on the Convex deployment (they are read by Convex actions, never by the browser):

```bash
scripts/convex-env.sh           # the deployment .env.local points at
scripts/convex-env.sh --prod    # the production deployment
```

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Next.js and Convex together |
| `npm test` | Vitest + `convex-test` for Convex functions |
| `npm run test:browser` | Media tests in headless Chromium (`tests/browser/`). First run: `npx playwright install chromium` |
| `npm run lint` | ESLint |
| `npx tsc --noEmit` | Type check |
| `npm run build` | Production build |
| `npm run check:bundle` | After a build: fails if a server key's name or value is anywhere in `.next/` (except `cache/`) |

## Deploy (Vercel + Convex production)

Every push builds on Vercel through `scripts/vercel-build.sh` (the `buildCommand` in `vercel.json`):

| Push | Vercel env | What runs |
|---|---|---|
| `main` (the Production Branch) | `production` | `npx convex deploy --cmd 'npm run build'`: pushes Convex functions and schema to prod (authenticated by `CONVEX_DEPLOY_KEY`), then builds Next.js against it |
| any other branch | `preview` | `npm run build` only, against prod Convex. You get an HTTPS preview URL for phone testing. |

Previews read and write prod data but never push functions or schema, so parallel branches can't overwrite prod or each other. A branch's new Convex functions reach prod only when it merges, so preview pages that call them will error until then.

Vercel environment variables:

| Key | Production | Preview |
|---|---|---|
| `CONVEX_DEPLOY_KEY` | ✓ | ✗ never |
| `NEXT_PUBLIC_CONVEX_URL` | ✗ (the build sets it) | ✓ prod Convex URL |
| `NEXT_PUBLIC_GOOGLE_MAPS_KEY`, `NEXT_PUBLIC_GOOGLE_MAP_ID` | ✓ | ✓ |

Server keys go on the Convex production deployment with `scripts/convex-env.sh --prod` (from the main checkout).

`/dev/camera` opens the rear camera, to check the HTTPS deploy on a phone. It ships to prod and previews, unlinked and `noindex`.

## Worktrees (parallel cards)

Each worktree needs its own local Convex deployment, otherwise every worktree pushes to the same one. From inside the worktree, after `.env.local` has been copied in:

```bash
scripts/worktree-setup.sh
```

It removes `CONVEX_DEPLOYMENT` and the related URLs from the worktree's `.env.local`, starts a fresh anonymous local deployment, copies the server keys onto it with `convex-env.sh`, and exits with an error if the result is not a local deployment. It refuses to run in the main checkout, whose `.env.local` it would otherwise rewrite.

Only the Vercel Production build holds `CONVEX_DEPLOY_KEY`.

## Environment variables

See [.env.example](.env.example). `.env.local` is git-ignored.

## Test video transcription

Set `GROQ_API_KEY` and `ADMIN_PASSCODE` on the Convex deployment, then run `npm run dev` and open
`/admin/video-intake`. Record a clip in the browser or choose an MP4 or WebM
video up to 25 MB. The page uploads the video to Convex storage, records it in
the `videoIntake` table, sends it to Groq Whisper, and shows the transcript and
timestamped segments. Sign in with the Convex `ADMIN_PASSCODE`; the session
expires after 30 minutes. Intake records and their uploaded files are deleted
after seven days.

This is a protected test page, not the production report-screening flow.

To run the Groq checks against the local US11 clips, make sure the Convex CLI
is logged in and the selected deployment has `GROQ_API_KEY`, then run:

```bash
node --experimental-strip-types scripts/try-transcribe.ts
```

The script reads the key from Convex without printing it and sends each fixture
to Groq. It also tests audio-only derivatives of the user-provided clips; these
have a black video track so the original visual content is not uploaded. The
visual sample MP4s and test videos are git-ignored and must be supplied locally.
If any are missing, the script reports all missing fixture paths before making
requests. `labels.json` records fixture metadata and clearly marks unconfirmed
expected labels. `transcription-output.json` contains spoken transcript text
and segment text from the live fixture run; review it before sharing or
publishing because transcripts can contain personal information.
