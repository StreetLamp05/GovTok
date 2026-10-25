# Hackathon log

- **Project:** GovTok
- **Event:** Cal Hacks 13.0
- **What it does:** Residents post Mableton problems, browse reports, and follow fixes.
- **Live app:** not deployed
- **Repo:** https://github.com/StreetLamp05/GovTok
- **Frontend:** Vercel
- **Convex deployment:** not deployed
- **Components:** none
- **Convex features:** schema, indexes, queries, mutations, actions, crons, scheduled functions, file storage, realtime `useQuery`
- **Auth:** Other (resident tokens, fixer passcodes)
- **AI models:** `claude-opus-5-5`, `whisper-large-v3-turbo`
- **Started:** 2026-10-24T22:21:44Z
- **Last updated:** 2026-10-25T10:19:57Z

## How we use Convex

- **Post or join nearby reports:** schema, indexes, mutations, storage; see [convex/schema.ts](convex/schema.ts), [convex/posts.ts](convex/posts.ts), [convex/nearby.ts](convex/nearby.ts), [convex/meToos.ts](convex/meToos.ts).
- **Browse feed and map:** reactive queries update both screens without refresh; see [convex/feed.ts](convex/feed.ts), [components/feed/Feed.tsx](components/feed/Feed.tsx), [convex/map.ts](convex/map.ts), [components/map/MapScreen.tsx](components/map/MapScreen.tsx).
- **Watch screening:** `useQuery` updates report status live; actions screen reports and scheduled functions retry failures. See [convex/screening.ts](convex/screening.ts), [convex/screeningDb.ts](convex/screeningDb.ts), [components/post/CheckingScreen.tsx](components/post/CheckingScreen.tsx).
- **Submit/verify fixes:** mutations and actions check proof; the fix screen updates live via `useQuery`. See [convex/fixes.ts](convex/fixes.ts), [convex/fixVerification.ts](convex/fixVerification.ts), [components/fix/FixCapture.tsx](components/fix/FixCapture.tsx).
- **Expire old data:** daily cron and scheduled functions purge reports and temporary intake files. See [convex/crons.ts](convex/crons.ts), [convex/purge.ts](convex/purge.ts), [convex/videoIntake.ts](convex/videoIntake.ts).

## Log

- 2026-10-24 `9739bd0` — Initial app: `app/ConvexClientProvider.tsx`.
- 2026-10-24 `a73917b` — Scaffold: `convex.json`, `package.json`.
- 2026-10-24 `0980d36` — Tabs/token: `app/(tabs)/layout.tsx`, `useResidentToken.ts`.
- 2026-10-24 `8247504` — Vercel config: `vercel.json`.
- 2026-10-24 `4740d44` — Schema/storage: `convex/schema.ts`, `convex/files.ts`.
- 2026-10-25 `283c55b` — Capture: `VideoRecorder.tsx`.
- 2026-10-25 `1177f30` — Groq: `convex/lib/transcribe.ts`.
- 2026-10-25 `4cd4976` — Retention: `convex/crons.ts`, `convex/purge.ts`.
- 2026-10-25 `b5e3ab0` — Feed: `app/(tabs)/page.tsx`, `CardRail.tsx`.
- 2026-10-25 `ebf20b7` — Claude screening: `convex/lib/claude.ts`.
- 2026-10-25 `320f0d6` — Fixers: `convex/fixers.ts`, `FixerList.tsx`.
- 2026-10-25 `49eeba2` — Impact stats: `convex/stats.ts`.
- 2026-10-25 `13372ec` — Intake: `convex/videoIntake.ts`, `app/admin/video-intake/page.tsx`.
- 2026-10-25 `5163ece` — Map: `convex/map.ts`, `MapScreen.tsx`.
- 2026-10-25 `859420e` — Posting: `convex/posts.ts`, `CheckingScreen.tsx`.
- 2026-10-25 `3ce1d64` — Report details: `CardOverlay.tsx`.
- 2026-10-25 `db5483d` — Proof check: `convex/fixVerification.ts`, `fixPrompt.ts`.
- 2026-10-25 `c31d245` — Submit proof: `FixCapture.tsx`.
- 2026-10-25 `d486a57` — Reveal: `convex/reveal.ts`, `RevealPlayer.tsx`.
- 2026-10-25 `fef6a18` — Photos: `PhotoPicker.tsx`.
- 2026-10-25 `f179612` — Verdict pipeline: `convex/screening.ts`, `screeningDb.ts`.
