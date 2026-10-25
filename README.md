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
| `npm run lint` | ESLint |
| `npx tsc --noEmit` | Type check |
| `npm run build` | Production build |
| `npm run check:bundle` | After a build: fails if a server key's name or value is anywhere in `.next/` (except `cache/`) |

## Deploy (Vercel + Convex production)

Pushes to `main` deploy to Vercel Production. `vercel.json` sets the build command to `npx convex deploy --cmd 'npm run build'`, which pushes the Convex functions to production (authenticated by `CONVEX_DEPLOY_KEY`, set in Vercel's Production environment only) and builds Next.js with that deployment's `NEXT_PUBLIC_CONVEX_URL`. Its `ignoreCommand` skips every non-production build, so preview deployments never run. Branches are tested on a laptop instead.

Server keys go on the Convex production deployment with `scripts/convex-env.sh --prod` (from the main checkout). `NEXT_PUBLIC_*` keys go in Vercel → Settings → Environment Variables.

`/dev/camera` is a dev-only page that opens the rear camera, used to check the HTTPS deploy on a phone.

## Worktrees (parallel cards)

Each worktree needs its own local Convex deployment, otherwise every worktree pushes to the same one. From inside the worktree, after `.env.local` has been copied in:

```bash
scripts/worktree-setup.sh
```

It removes `CONVEX_DEPLOYMENT` and the related URLs from the worktree's `.env.local`, starts a fresh anonymous local deployment, copies the server keys onto it with `convex-env.sh`, and exits with an error if the result is not a local deployment. It refuses to run in the main checkout, whose `.env.local` it would otherwise rewrite.

Only the Vercel Production build holds `CONVEX_DEPLOY_KEY`.

## Environment variables

See [.env.example](.env.example). `.env.local` is git-ignored.
