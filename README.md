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

## Demo runbook

The stage flow is in GOVTOK_DECISIONS.md §6.1.1. Everything below runs against **prod**, after the branch has merged. Add `--prod` to every `npx convex run`.

The app runs as one city at a time: `ACTIVE_CITY` in `convex/lib/city.ts`. **Cal Hacks (Oct 25) runs as San Francisco**, demoed at the Palace of Fine Arts. That one constant sets the routing table (SF Public Works, SFMTA, SFPUC, PG&E, Recology), the Claude prompts, the map center, `DEMO_POINT` (Baker St beside the Palace) and the seed presets. Demo mode is `?demo=sf`.

**For Mableton demo day (Oct 30):** set `ACTIVE_CITY = MABLETON`, then update the two tests pinned to Cal Hacks (`tests/convex/lib/routing.test.ts`, `tests/app/admin/seed/presets.test.ts`) and merge. Demo mode becomes `?demo=mableton`. Reports seeded under SF keep their SF agencies, so delete them or re-seed.

### 1. Seed (the night before)

1. Seed at least one fixer per org that will close a fix, e.g. SF Public Works. Their org is what the card shows ("Fixed by SF Public Works"):
   `npx convex run --prod fixers:seed '{"fixers":[{"name":"Demo crew","org":"SF Public Works","passcode":"…"}]}'`
2. On the **demo phone**, open `/admin/seed` on prod and sign in with the Convex `ADMIN_PASSCODE`. It's checked server-side on every call and never stored in the page.
3. Add one row per California clip (or set of photos), about 8 in all.
   - Clips must be MP4 or WebM, because Groq can't transcribe an iPhone `.MOV`. Convert one first, e.g. `ffmpeg -i IMG_1234.MOV -c:v libx264 -c:a aac clip.mp4`.
   - Fix (*after*) clips are silent at the source (§4.3.1), so convert those without audio, including the one uploaded on stage: `ffmpeg -i IMG_1235.MOV -c:v libx264 -an after.mp4`.
   - Each sample can sit at a preset near where it was really filmed, or at typed coordinates.
   - **Stage: open pothole** (Baker St by the Palace). Leave it open. This is what "Is it one of these?" offers.
   - **Stage: before/after spot** (Baker St at the lagoon). Tick "Posted by this device", upload only the *before* clip, and leave it open. Its pre-filmed *after* clip, from the same spot, gets uploaded on stage in step 3 of the stage flow. Because the phone owns it, the Me-page beat is the fix the audience just watched.
   - **Me-page fallback.** Also tick "Posted by this device" on one other sample, attach a fix clip filmed by the seeded fixer, and backdate it (e.g. opened 23 days ago, fixed 2 days ago). The Me page then has a fixed item even if the live check fails.
   - **The rest.** Spread them over the other presets (Marina, Mission, Sunset, Bayview…), with "Opened N days ago" set so the cards read "Open · N days".
4. Press **Seed** once for the whole batch.
   - Screening is staggered 10 s apart within a batch, so 8 samples take about 1.5 minutes. Wait for a batch to finish before seeding another, or the two overlap and can hit Anthropic's rate limit.
   - The table at the bottom shows each sample go from `pending` to `open`, with Claude's title and the SF agency.
   - A fix clip is checked by the real `verifyFix` once its report is open, and then shows `verified`.
5. If a sample ends up `held`:
   - `npx convex run --prod screeningDb:rescreen '{"reportId": "…"}'` screens it again. Use this for "screening failed", or one stuck on `pending`.
   - `npx convex run --prod screeningDb:release '{"reportId": "…"}'` publishes a held report that has a title and category. Add `"force": true` if the verdict was retake, emergency or reject.
   - A sample that was held when its fix clip was due drops the clip (the table's Fix column stays empty). Release it, then seed the fix again as a new sample.
6. Check on the phone:
   - The feed shows the samples with the Sample badge.
   - The map shows them across San Francisco.
   - Me shows the before/after spot (open) and the fallback (fixed).

### 2. On stage

Open the app with `?demo=sf`. The banner reads "Demo mode: location simulated", and the location is `DEMO_POINT` on Baker St, within 50 m of both stage samples. Demo mode also covers for weak GPS indoors.

1. **Me too.** Post. The duplicate check offers the seeded pothole first, because it's the nearest; the before/after spot is listed after it. Tap **Me too** on the pothole.
2. **Post live.** Post a new clip. Screening takes a few seconds, then the card is on the feed.
3. **Before/after.**
   - Open `/fix?demo=sf` and sign in with the SF Public Works passcode.
   - Open the before/after sample, tap **Record fix**, then **Upload clip** with the pre-filmed *after* clip.
   - Claude checks it against the original, and the reveal plays.
   - In San Francisco nearly every category is city-owned, so neighbors can't confirm the fix (§4.3.2) and there's no "Is it fixed?" button on the card. A city crew closes it.
4. **Me page.** "The pothole I posted just got fixed": the before/after spot, now fixed and highlighted.

### Fallbacks

- A live post stuck on "Checking…": `screeningDb:rescreen` on it.
- A live post held by mistake: `screeningDb:release` (with `"force": true` if needed).
- The before/after check comes back "not fixed" or "retake": upload the after clip again. If it still fails, show the pre-fixed fallback sample on the Me page instead.

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
