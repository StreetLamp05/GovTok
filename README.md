# GovTok

A TikTok-style feed for Mableton, GA. Residents film a problem, neighbors "me too" it, and the proof-of-fix video appears on the same card when it's resolved. The design lives in [GOVTOK_DECISIONS.md](GOVTOK_DECISIONS.md).

Stack: Next.js (App Router) on Vercel, with Convex for the database, file storage, live updates and server actions.

## Fresh clone

Requires Node 20+ and npm.

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
| `npm run lint` | ESLint |
| `npx tsc --noEmit` | Type check |
| `npm run build` | Production build |

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

Set `GROQ_API_KEY` on the Convex deployment, then run `npm run dev` and open
`/admin/video-intake`. Choose an MP4 or WebM video up to 25 MB and select
**Upload and transcribe**. The page uploads the file to Convex storage, records
it in the `videoIntake` table, sends it to Groq Whisper, and shows the transcript
and timestamped segments. The intake status and any transcription error are
saved in the same table.

This is an open test page for development, not a protected production upload
flow. Do not use it for private or sensitive videos.
