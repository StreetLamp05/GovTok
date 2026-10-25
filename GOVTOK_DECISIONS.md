# GovTok — Design Decisions

Source of truth for design decisions made during the pre-build design pass.
Updated incrementally as decisions are locked in.
## Session state / handoff
*Update after every locked decision so a fresh session can resume from this block alone.*
- **Status:** ✅ **SPEC COMPLETE (Level 2, 2026-10-24).** Every item for tonight's build is decided, and the consistency sweep is resolved. No forward references are open.
- **Last completed:** retcons for text descriptions, photo slideshow posts and the private Me page (§4.1.1, §5.4.1)
- **Next up:** build. The M0 cards are in `.planning/M0-issues.json` (28 stories, reviewed), waiting for the user to push them to Project #16. Branches are tested on a laptop; phone checks happen after merge on prod.
- **Moved to server (2026-10-24):** work continues on `miraii` at `~/projects/GovTok` (moved from `~/GovTok` 2026-10-24; symlink left behind), using `claude --remote-control` inside tmux. The original conversation was on the laptop; this doc plus memory is the only carried-over context.
- **Context the doc doesn't hold:**
  - Cal Hacks submissions are due Sunday morning, 2 people.
  - Prize targets are in Scope.
  - Oct 30 is Mableton demo day.
  - Keep the pass time-boxed to decisions that block tonight's build.

## Working agreement
- Update the Session state / handoff block after every decision, the same way HireHarbor's doc does.
- Less is more. Every feature has to earn its demo time. The demo should run about 45s so the rest of the pitch goes to impact and story.
- Keep it concise; length isn't thoroughness.
- One decision at a time, with a recommendation, not a menu.
- **Hackathon-simple over production-grade.** Use no third-party auth or setup-heavy services unless they earn demo time. Choose the DB-only or one-call option, and record the production version in §8.
- **UI entries are directional (2026-10-24).** §5 sets content and behavior only. The partner turns them into wireframes with Claude Cowork after this pass, so don't lock layout details.
- **Cal Hacks first (2026-10-24).** When the best hackathon product and the best fit for Mableton conflict, pick the hackathon and note the Mableton adaptation in §8 for after Sunday.

## Scope
- **Pitch:** A TikTok-style feed for Mableton, GA. Residents film a problem, and anyone can scroll what's been reported and watch the proof-of-fix video when it's resolved. A map shows how many people reported the same problem in the same spot.
- **Core problem:**
  - Residents can't see what their government does. Fixes happen out of sight, so trust doesn't grow even when the work gets done. The user's premise: NYC Mayor Mamdani's administration (which has an Office of Mass Engagement and does TikTok-native outreach) fixed about as many potholes as the previous one but has much higher approval. *(Needs a source before it goes in the pitch.)*
  - Mableton specifically: incorporated in 2022, with services split with Cobb County, and the split is still changing.
    - The city took zoning and code enforcement in Mar 2025, then sanitation, business licenses and permits in mid-2025.
    - Police is moving from Cobb to a city department.
    - Roads and stormwater stay with Cobb through 2034.
    - Residents don't know who handles what. The only online reporting channel found was a code-violation form.
  - Today's channels are slow or costly: hold times on the phone, days waiting for an email reply, or a whole day lost to a public meeting with limited speaking time.
- **Primary users:**
  - **Posters:** residents who film a problem with the rear camera, a finger pointing at it. No selfie or face needed.
  - **Scrollers:** residents who browse the feed and map. This is the larger group.
  - **Fixers:** city staff and the contractors the city pays. They upload proof-of-fix media to close a report.
  - **City staff and leadership:** see where reports cluster.
  - **Scale:**
    - Cal Hacks demo: sample videos recorded around California.
    - Mableton test week: 10–20 residents, tens of reports.
    - Pilot: the City of Mableton (Georgia's 12th-largest city).
- **Constraints:**
  - Cal Hacks 13.0 is this weekend. Submissions are due Sun Oct 25, 2026 in the morning, about 18 hours after this scope was written (Sat 4:40pm ET). Target prizes:
    - Anthropic, "Claude for Public Benefit." Claude has to be used meaningfully both to build the product and inside it, and there has to be a plan for measuring impact.
    - Microsoft, "Built for the Real World."
    - Cal Hacks, Best People-First Hack.
  - Georgia 311 Challenge demo day is Fri Oct 30, 2026 at Morehouse College, judged by Mayor Michael Owens. Top projects may get a city pilot. The challenge prompt: "Help Mableton residents find services, understand city decisions, and make their voices heard."
  - It's a new repo (github.com/StreetLamp05/GovTok), separate from GlassGov. All code is written at Cal Hacks or after.
  - The city can require proof-of-fix only from its own staff and contractors. Cobb County and utility crews are outside its control.
  - Team: 2. Budget: free tiers and hackathon credits.
- **v1 =** a resident films a problem, and it shows up in the feed and on the map with who's responsible. Neighbors can "me too" it. When it's fixed, the proof-of-fix video appears on the same card.
  - **Post:** record a short video (or photos) in the browser with the rear camera. Location comes from the phone.
  - **Feed:** vertical full-screen scroll. Each card shows the problem, who's responsible (city / Cobb / utility), status, and days open. Resolved cards show the fix after the original.
  - **Me too:** one tap adds you to an existing problem instead of creating a duplicate.
  - **Map:** report and "me too" counts clustered by location.
  - **Proof to close:** a report can only be closed with proof-of-fix video or photos. No commentary, and no workers shown. Model: a dealership's inspection walk-around video that shows brake and tire tread depth.
  - **Screening:** Claude checks every post before it goes public for faces, license plates, disputes between neighbors, and emergencies.
- **Non-goals (v1):**
  - Native iOS or Android app (mobile web only).
  - Reporting by text message.
  - Integration with Cobb County's or the city's work-order systems.
  - Voice line.
  - Council or budget features.
  - Comments, DMs, follower graph, public profiles. (A private "Me" page is allowed, §5.4.1.)
  - Personalized feed ranking.

### Scope addendum
- ~~**2026-10-24: video only.**~~ *Retconned the same day, see below.* Removed "(or photos)" from Post and "or photos" from Proof to close.
- **2026-10-24 (retcon): posts are a video OR a photo slideshow; fixes stay video only.** The user wants TikTok photo mode for residents who prefer it. A slideshow is 1–10 photos swiped sideways. Proof of fix stays video only, because the walk-around is the trust anchor (§4.3.1). (§4.1.1)
- **2026-10-24: optional text description on posts** (up to 280 characters), so residents can explain in text if they want. (§4.1.1, §4.2.1)
- **2026-10-24: private "Me" page.** The non-goal "public profiles" still holds. A private page tied to the device token shows your own posts and their results, plus fixes on things you reported or me-too'd. It's important for the demo, because it closes the loop. (§5.4.1)
- **2026-10-24: tax framing.** Mableton residents are frustrated right now because the city just added a property tax. GovTok lets them **see their tax dollars at work**: every verified fix is visible proof of where the money goes. Use this as a pitch angle, especially on Oct 30. *(Get the date and millage figure before it goes in the pitch.)* (§6.2.1)
- **2026-10-24: clips keep audio**, which gets transcribed (§1.1.3, §1.1.4). Proof-of-fix commentary is still out of scope (§4.3.1).

---

## 1. Tech stack & infra

### 1.1 Platform

**1.1.1 App stack — Next.js on Vercel + Convex**
- Frontend: Next.js (App Router), deployed on Vercel (Hobby). It must be an HTTPS deploy, because phones only allow camera access on HTTPS sites.
- Backend: Convex provides:
  - the database
  - file storage for videos
  - live updates (the feed and map subscribe to queries)
  - server-side actions that call Claude, so the API key never reaches the browser
- Uploads: Convex upload URLs (generate a URL → POST the file → save the storage ID). No size cap, but the POST times out after 2 minutes. Clips stay small (§4.1.1).
- Location queries: bounding-box filters in Convex queries. No geo index needed at Mableton's scale.
- Rationale: the fewest moving parts for a live video feed by Sunday morning with 2 people. A fresh repo means nothing to migrate, and it adds a shot at Convex's $5k prize.
- Rejected:
  - Supabase: familiar Postgres plus PostGIS, but more setup tonight and no prize.
  - Firebase: a nod to Google for Oct 30, but storage on new projects needs a billing account, and location queries need workarounds.
  - Flask/FastAPI + Postgres + S3: most familiar, but too much plumbing for 18 hours.
- Cost:
  - Convex free tier: 1M function calls/month, 0.5 GiB database storage, 1 GiB/month database bandwidth. File storage and file bandwidth are about 1 GB each according to third-party listings; the official page doesn't state them.
  - Convex Pro: $25 per developer per month.
  - Vercel Hobby: free.
- 📌 **Forward reference (§8)**: video bandwidth at pilot scale. The free tier may not last through the Mableton test week.

**1.1.2 Map library — Google Maps**
- Google Maps JavaScript API, wrapped with `@vis.gl/react-google-maps`. Clustering comes from `@googlemaps/markerclusterer`.
- Street names for cards come from reverse geocoding (Geocoding API) on the same key. Run it once per report in a Convex action and store the result.
- Setup: a Google Cloud billing account with a card on file. One browser key restricted to the Vercel domain and localhost. Reverse geocoding runs server-side with a second key restricted by API.
- Rationale: a nod to Google at the Oct 30 event, a polished look on phones, and one account for both the map and the address.
- Rejected:
  - Mapbox: kept as the fallback if no one can get a card on Google Cloud.
  - Leaflet + OSM: looks dated, and OSM's public tiles aren't meant for a pilot.
- Cost: since March 2025 each SKU gets about 10k free calls a month (Dynamic Maps loads, Geocoding). Cal Hacks and the test week stay well under that.

**1.1.3 Claude: model and input — Opus 5.5 (low effort), frames + transcript**
- One Claude call per post, run in a Convex action. Model `claude-opus-5-5` at effort `low`, with structured JSON output. It does two jobs:
  - Screening (the policy is §4.2.1).
  - Filling in the card: category and a short title. The owner is looked up from the category in a fixed table (§2.1.2), not chosen by Claude.
  - The same call shape will check proof-of-fix later (§4.3.1).
- Input:
  - About 6 evenly spaced frames. The browser grabs them with a canvas, 1280px or less on the long edge.
  - The transcript of the clip's audio (engine: §1.1.4). Videos only.
  - For slideshows: the photos themselves, instead of frames and a transcript (retcon, §4.1.1).
  - The optional text description (§4.1.1).
  - The reverse-geocoded street (§1.1.2).
- The Messages API takes no video and no audio input (it accepts only text, images and PDFs). That's why both frames and a transcript are needed.
- Audio is **kept** in the published clip. This is the user's call (2026-10-24): the hackathon pitch comes first, and narration ("this has been here since June") makes stronger cards. Making it fit Mableton can happen after Cal Hacks.
- Cost: about 8k input tokens per post, roughly $0.035 on Opus 5.5 ($4 / $20 per 1M tokens). 1,000 posts cost about $35.
- Rationale: Opus has the best vision, and missing a face or plate is the expensive failure. A cheaper model saves only cents at this scale. Screening is async (the post is "pending" until it clears), so latency doesn't matter much.
- Rejected:
  - Sonnet 5.5 (~$0.018 per post): close in quality, but the savings are negligible.
  - Haiku 5.5 (~$0.001 per post): weakest at background faces and plates.
  - Silent clips: they'd need no transcription and make screening complete, but the user prefers narrated clips for the hackathon.
- 📌 **Forward reference (§4.2.1)**: audio is now published, so screening also has to cover the transcript: spoken names, addresses, neighbor disputes, slurs. Decide what happens on a flag (mute, reject, or hold).
- 📌 **Forward reference (§5.1.1)**: the transcript can double as burned-in captions on the card.
- 📌 **Forward reference (§4.3.1)**: proof-of-fix is "no commentary" (Scope). Decide whether fix clips are muted or narration is just ignored.

**1.1.4 Speech-to-text engine — Groq Whisper large-v3-turbo**
- Videos only; slideshows skip this step (§4.1.1). Transcription runs in the same Convex action as the Claude call (§1.1.3). The action reads the clip from Convex storage and POSTs it to Groq's OpenAI-compatible transcription endpoint (`whisper-large-v3-turbo`, `verbose_json` for segment timestamps). The transcript and its segments are saved on the report.
- Groq accepts the browser's webm/mp4 directly, so there's no ffmpeg step. The free-tier file limit is about 25 MB, and clips stay well under it (§4.1.1).
- Whisper can invent text on near-silent clips ("Thanks for watching"). Claude's prompt treats the transcript as untrusted and possibly empty.
- Cost: about $0.04 per hour of audio, billed at a 10s minimum per request. Effectively free at every scale we plan for.
- Key: `GROQ_API_KEY`, kept in Convex env only.
- Rejected:
  - Deepgram Nova-3 ($200 credit): the fallback if Groq rate limits bite.
  - Google STT V2: more auth setup, and the free tier is unclear. Revisit for the Oct 30 version (§8).
  - Browser Web Speech: only works live, flaky on iOS, and the transcript isn't tied to the file.

---

## 2. Data model

### 2.1 Reports

**2.1.1 Report shape — one report = one original clip; me-toos are taps**
- `reports`: one per problem. Fields:
  - `residentId` (the poster; never public, §7.1.1).
  - `mediaType: video | photos` (retcon, §4.1.1). `description` (optional, up to 280 characters).
  - Original media: `clipStorageId` (videos), `frameStorageIds[]` (about 6 frame JPEGs for videos, or the 1–10 photos for slideshows; reused by §4.3.1), `transcript`, `segments` (videos).
  - Location: `lat`, `lng`, `street`.
  - `category`, plus `owner` and `agency` stored at creation from the §2.1.2 table. `title`, `status` (§2.1.3).
  - Screening: `verdict`, `reason`, `audioMuted` (§4.2.1).
  - `isSample` (§6.1.1).
  - `meTooCount`, `lastActivityAt` (feed order, §5.1.2), `revealViews` (§6.2.1).
  - Fix fields, inline: `fixStorageId`, `fixedAt`, `fixedBy`, `fixedByKind` (`fixer | resident`; added by §4.3.2). One fix per report (§4.3.1).
- `meToos`: `{reportId, residentId, createdAt}`, unique per (report, resident). No media.
- `residents {token, createdAt}` (§3.1.1). `fixers {name, org, passcode, token}` (§3.1.2). The fixer `token` is issued when the passcode is checked.
- **Build-plan additions (2026-10-24):**
  - `fixAttempts {reportId, byKind, byId, clipStorageId, frameStorageIds[], lat, lng, status: checking|verified|not_fixed|retake|failed|superseded, reason, createdAt}`. A fix waits here while Claude checks it, and carries Claude's reason back for a retake (§4.3.1).
  - `fixedByOrg` on reports, so the card can name the fixer's org (§3.1.2).
  - `createdAt` is an explicit field (not `_creationTime`), so samples can be backdated (§6.1.1).
- When the duplicate check finds a match while someone is posting (§4.1.2), they're steered to me-too and their clip is discarded.
- The map count is `1 + meTooCount` (§5.2.1).
- Rationale: matches Scope's "one tap" exactly. Two tables. The before/after reveal stays a simple pair: original, then fix (§5.1.1).
- Rejected: a problem with many clips (`issues` → `posts`). Richer evidence, but it needs a merge flow and a UI for several clips on one card, with no payoff in the demo.

**2.1.2 Categories and routing — Claude picks the category, a fixed table picks the owner**
- Claude chooses one `category` (§1.1.3). The owner comes from a fixed lookup in code: `owner` is one of `city | cobb | utility | unknown`, plus a display `agency` string. Claude never chooses the owner.

| Category | Owner | Agency shown on card |
|---|---|---|
| `pothole` (road damage) | cobb | Cobb DOT |
| `signal_sign` (traffic signal / sign) | cobb | Cobb DOT |
| `drainage` (flooding / stormwater) | cobb | Cobb Water System (stormwater) |
| `water_leak` (leak / main break) | cobb | Cobb Water System ⚠️ |
| `streetlight` | utility | Georgia Power ⚠️ |
| `trash_missed` | city | Mableton Sanitation |
| `code_violation` (illegal dumping / overgrown lot / code issue) | city | Mableton Code Enforcement |
| `other` | unknown | "Routing unclear" |

- Rationale: the "who's responsible" label is the core of the story, and a wrong label recreates the confusion GovTok exists to fix. A fixed table is predictable, auditable and easy to correct. The road and stormwater rows follow Scope (they stay with Cobb through 2034). Sanitation and code enforcement moved to the city in 2025.
- Rejected: Claude assigning the owner freely. It's flexible, but it will sometimes be confidently wrong.
- ⚠️ **Verify when the product is near finished:** the whole table, especially streetlights (assumed Georgia Power) and water mains (assumed Cobb Water System). Ask the Mableton teammate, or check city and county sites. Tracked in §8 under "Before ship."

**2.1.3 Status lifecycle — pending → open | held; open → fixed**
- `status` is one of `pending | held | open | fixed`.
  - `pending`: screening is running (§1.1.3). Only the poster sees it ("Checking…", and on their Me page, §5.4.1).
  - `held`: screening flagged it. Not public. Handling is in §4.2.1.
  - `open`: public. Days open = now − `createdAt`.
  - `fixed`: a proof-of-fix is attached (§4.3.1). The counter freezes at `fixedAt`, and the card shows the before/after (§5.1.1).
- Transitions are one-way, except `held` → `open` if a flag is cleared by hand (§4.2.1), and `held` → `pending` on a retake (§4.2.1).
- The feed and map show only `open` and `fixed`.
- Reports owned by Cobb or a utility stay `open` until a neighbor or fixer verifies a fix (§4.3.2). Until then, the growing counter is part of the accountability story.
- Rejected:
  - "In progress / acknowledged": no work-order integration, so a fixer would tap it by hand. It's an extra flow and easy to game.
  - "Reopened": real, but not the v1 story. 📌 Deferred (§8).

---

## 3. Identity & roles

### 3.1 Identity & roles

**3.1.1 Resident identity — device token in the DB (no auth provider)**
- On first visit the browser generates a random UUID and stores it in `localStorage` (wrapped in try/catch; if storage fails, generate a fresh token for this session).
- A Convex mutation upserts `residents {token, createdAt}`.
- Post and me-too mutations take the token, and the server resolves it to `residentId`. `meToos` uniqueness is per (report, resident), per §2.1.1.
- No login screen, no password, no third party.
- Known weaknesses, accepted for the hackathon: anyone holding a token can act as that resident, and clearing storage makes a new resident, which can inflate me-too counts.
- Rationale: the user's call (2026-10-24). Hackathon mode. Third-party auth is setup pain with no payoff on stage, and the Scope rules out profiles, so the ID is internal only.
- Rejected:
  - Convex Auth anonymous sessions: beta library, more setup.
  - Google sign-in: OAuth consent screen setup, plus a tap during the demo.
  - Phone SMS code: needs a paid vendor and adds the most friction.
- 📌 Deferred (§8): real resident identity for the pilot (Google sign-in or phone), so me-too counts can be trusted.

**3.1.2 Fixer access — a passcode per fixer, DB-only**
- `fixers {name, org, passcode}`, seeded by hand (e.g. "Mableton Sanitation / 4821").
- A hidden `/fix` route asks for the passcode once. A Convex mutation checks it server-side and returns a fixer token, which the browser stores in `localStorage` (screen: §5.3.1).
- The fix mutation refuses any request without a valid fixer token. Any fixer can close any `open` report.
- The fixed card shows the fixer's **org** ("Fixed by Mableton Sanitation"), never a person's name (Scope: "no workers shown").
- Prize check (2026-10-24): none of the target tracks scores auth. Microsoft's "path from prototype to production" is answered by a pitch line instead: "Pilot: residents sign in with Google or phone, and city staff use the city's single sign-on." The only auth prize is MLH Auth0 (headphones), not worth the setup.
- 📌 **Forward reference (§4.3.2)**: whether fixers are limited to reports their org owns (city staff can't close Cobb reports).
- 📌 Deferred (§8): city single sign-on for fixers in the pilot.

---

## 4. Core workflows

### 4.1 Posting

**4.1.1 Capture — in-page recorder, 720p, 20s cap (retconned from video only to video or photo slideshow for posts)**
- `getUserMedia({video: {facingMode: "environment", height: 720}, audio: true})` feeds `MediaRecorder` at about 1.5 Mbps, which comes to roughly 4 MB per clip.
- Recording stops automatically at 20s.
- Prefer `video/mp4` when `MediaRecorder.isTypeSupported` (Safari, Chrome 126+), otherwise webm.
- Grab about 6 frames from the live `<video>` element during recording with a canvas, 1280px or less (§1.1.3), so nothing has to be decoded afterward.
- Fallback when `getUserMedia` is unavailable: `<input type="file" accept="video/*" capture="environment">`. Treat it as best-effort, since the size and length can't be controlled.
- **Frames from a file** (sweep, 2026-10-24): for any clip not recorded live, load the blob into a hidden `<video>`, seek to 6 evenly spaced times, and grab each frame with a canvas. Used by the native-camera fallback and by demo-mode uploads (§6.1.1).
- ~~**Video only**, for both posts and fixes.~~
- **Retcon (2026-10-24):** a post is a **video or a photo slideshow** of 1–10 photos, picked from the camera or gallery (`<input type="file" accept="image/*" multiple>`) and resized in the browser to 1280px or less on the long edge. **Fixes stay video only** (§4.3.1). Reason: the user wants TikTok photo mode as an option.
- **Optional description** (2026-10-24): a text field of up to 280 characters on every post, video or slideshow. It goes into the Claude call (§1.1.3) and is screened (§4.2.1).
- Storage: about 1 GB free in Convex works out to roughly 250 clips (§8 covers pilot-scale hosting).
- Rationale: controls size, length and format, which keeps clips under the Groq file limit (§1.1.4) and the Convex 2-min upload timeout (§1.1.1), and makes them play on iOS and Android.
- Rejected: native camera only. Zero code, but iPhones save 4K HEVC `.mov` files (~60 MB for 20s) that break the Groq limit, don't play on Android Chrome, and can't be length-capped.
- Context: a production GovTok would be a native mobile app with native capture. It's mobile web for now, because no Apple developer account is available (Scope non-goal). 📌 Deferred (§8).

**4.1.2 Duplicate check — location-only check before recording, 50 m**
- When the resident taps Post, the app reads their GPS location and queries `open` reports within about 50 m (bounding box, §1.1.1).
- If there are matches, it shows "Is it one of these?" with up to 3 nearest cards (thumbnail, title, days open), each with a **Me too** button, plus "No, it's new," which opens the camera.
- If nothing is nearby, it goes straight to the camera (§4.1.1).
- Me too creates a `meToos` row (§2.1.1). No clip is recorded.
- Build-plan defaults (2026-10-24): Me too on your own post does nothing, and the button is hidden on your own posts and on fixed cards.
- No automatic merge after screening: a later post at the same spot with the same category stays a separate report.
- Rationale: location is known before recording, while category is known only after Claude runs. Checking up front means no clip gets recorded and thrown away, and it's a demo beat ("the app already knows about this pothole"). Phone GPS is usually 5–20 m accurate, so 50 m catches the same spot but not the next block.
- Rejected:
  - Matching on category after screening: the clip is already recorded, and an automatic merge can join two different problems.
  - Both checks: two flows for a 45s demo.

### 4.2 Screening

**4.2.1 Screening — one verdict, automatic actions, no human queue**
- The Claude call (§1.1.3) returns a `verdict` (`pass | mute | retake | emergency | reject`) and a short `reason`, along with category and title (§2.1.2).

| Verdict | Triggers | What happens |
|---|---|---|
| `pass` | Nothing found | `open` |
| `mute` | Visuals OK; transcript or description has names, addresses, phone numbers or slurs | `open`, `audioMuted: true`: plays muted, no unmute, no captions, description hidden |
| `retake` | Identifiable face or readable license plate | `held`; poster sees the reason and can record again |
| `emergency` | Fire, downed power line, gas smell, crash, person in danger | `held`; full-screen **Call 911** (`tel:911`) shown immediately |
| `reject` | Not a public-space problem: neighbor dispute aimed at a private person or home, spam, off-topic | `held`, with the reason |

- The poster stays on "Checking…" until the verdict arrives, so the emergency screen shows within seconds.
- **Where the poster sees the result:** live on the "Checking…" screen, and afterwards on their private Me page (§5.4.1).
- **Precedence** when several verdicts apply: `emergency` > `retake` > `reject` > `mute` > `pass`.
  - Exception (2026-10-25, US12): a post with no public-space problem at all (a selfie, off-topic content) is `reject` even when a face or plate is visible, because a retake makes no sense when there's nothing to film. `emergency` still wins.
  - `mute` "addresses" (2026-10-25, US12) means an address tied to a person: where someone lives or works ("John lives at 412 Elm St"). The address or street of the problem itself isn't private, since the location is public anyway (§7.1.1).
  - `reject` needs neither the frames nor the transcript/description to show a problem. A problem that's hard to see in about 6 frames but clearly described (a dark streetlight at dusk, a gas smell) isn't rejected, since held posts are purged after 7 days (§7.1.1).
- **Failure:** if Groq or Claude errors, retry once, then `held` with reason "screening failed."
- **Retake:** the new recording replaces the clip on the **same report**, which goes `held` → `pending` (§2.1.3).
- **Screening failed** (2026-10-24): the poster gets a Try again button that re-runs screening (`held` → `pending`).
- `held` → `open` only by hand, in the Convex dashboard. No moderation UI (§8).
- No blurring: Claude can't give per-frame boxes for a whole video, and re-encoding is too heavy for tonight.
- The mute is a playback flag only. The stored file keeps its audio. 📌 Deferred (§8): strip audio server-side for the pilot.
- Rationale: every outcome resolves without a human, since no one staffs a queue on Sunday morning. Each verdict maps to exactly one action.
- Rejected: hold every flag for human review. Simpler, but held posts would just sit unreviewed.

### 4.3 Resolution

**4.3.1 Proof of fix — geofence + silent clip + Claude before/after check**
- **Geofence:** the fixer's GPS must be within 50 m of the report (the same radius as §4.1.2). Otherwise recording is disabled.
- **Silent capture:** fix clips use the §4.1.1 recorder with `audio: false`. "No commentary" (Scope) is enforced at the source, with no transcription.
- **Claude check:** one Claude call (§1.1.3 model) gets the original report's frames and the fix clip's frames. It returns `verified | not_fixed | retake` and a reason. It asks:
  - Is it the same spot?
  - Is the problem visibly resolved?
  - Any identifiable faces or readable plates? This applies §4.2.1's screening, so no workers are shown.
- On `verified`, set `status: fixed`, `fixStorageId`, `fixedAt`, `fixedBy`, `fixedByKind` and bump `lastActivityAt` (§2.1.1, §2.1.3, §5.1.2). On anything else, show the reason to the fixer, who can retake.
- Rationale: the city doesn't declare a fix; Claude checks the footage. This is the trust anchor and the strongest Claude-in-product moment for the Anthropic track. Model: the dealership walk-around video (Scope).
- Rejected: accepting any clip from a valid fixer. Simpler, but it reduces the story to "trust the city."
- Resolves §1.1.3's forward reference: fix clips are muted at capture.

**4.3.2 Proof for problems the city doesn't own — neighbors confirm through the same pipeline**
- Open reports whose owner is `cobb | utility | unknown` (§2.1.2) show an **"Is it fixed?"** button to any resident. It runs the exact §4.3.1 pipeline: 50 m geofence, silent clip, Claude's before/after check.
- City-owned reports (`owner: city`) can be closed only by a fixer (§3.1.2).
- Fixers are **not** limited to their own org's reports. A city crew can close a Cobb report it sees fixed. This settles §3.1.2's forward reference.
- Card label: "Fix confirmed by a neighbor · Cobb DOT" when closed by a resident, "Fixed by Mableton Sanitation" when closed by a fixer.
- Data: `fixedBy` holds either a fixer ID or a resident ID, plus `fixedByKind: fixer | resident` (an addition to §2.1.1).
- Rationale: most reports (roads, stormwater, water, streetlights) aren't the city's. Without this, the most relatable reveal (a pothole) could never happen. It reuses the §4.3.1 code with one extra entry point, and it shows the community holding the county to account. The weak resident identity (§3.1.1) is acceptable because the geofence and Claude's check gate the result, not the identity.
- Rejected:
  - Never closing reports the city doesn't own: a pointed story, but potholes could never show a fix.
  - Only city fixers can close everything: depends on staff happening to drive by.

---

## 5. Surfaces

### 5.1 Feed

**5.1.1 Card layout and before/after reveal — directional; the partner's wireframes own the details**
- *Directional only.* The partner will produce wireframes with Claude Cowork, and those own layout, sizing and motion. This entry fixes only the content and the reveal behavior.
- Card content, following TikTok conventions:
  - Title, street, an owner chip colored by owner (§2.1.2, with the agency name), and status ("Open · N days" / "Fixed in N days").
  - Me too with its count.
  - "Is it fixed?" on open cards the city doesn't own (§4.3.2).
  - An "on map" pin that opens the map at this report (§5.2.1).
  - Captions from transcript segments, except when `audioMuted` (§4.2.1).
- Slideshow posts swipe sideways through their photos. The description shows under the title (hidden when `audioMuted`).
- Sound: phone browsers only autoplay video muted, so the first tap anywhere turns sound on for the session.
- **Reveal (fixed cards):** play the original, then a ~0.7s stamp ("FIXED · N days · <who fixed it>"), then the fix clip, and loop the pair.
- Rejected:
  - Split screen: halves too narrow on a 9:16 phone.
  - Swipe sideways between before and after: a hidden gesture judges would miss.

**5.1.2 Feed order — most recent activity first**
- Sort by `lastActivityAt`, descending. It's set at creation and bumped by each me-too and by the fix (§2.1.1). One Convex index.
- Only `open` and `fixed` reports appear (§2.1.3). No personalization (Scope non-goal).
- Rationale: a fresh fix jumps to the top, so reveals get seen (§5.1.1), and problems piling up me-toos rise.
- Build-plan default (2026-10-24): the order is snapshotted when the feed mounts. Counts update live, but cards don't reorder under the user's finger; reopening the feed re-sorts it.

### 5.2 Map

**5.2.1 Map — clustered counts, status colors, linked both ways with the feed (directional)**
- Google Maps with clustered markers (§1.1.2), showing `open` and `fixed` reports. A marker's number is `1 + meTooCount`, and a cluster sums its markers.
- Markers are colored by status (open vs fixed). One **Open / Fixed** toggle.
- Tapping a marker opens the feed at that card (`/?report=<id>`). Each card has an "on map" pin that goes back (§5.1.1).
- City leadership uses the same map. There's no separate dashboard.

### 5.3 Fixer screen

**5.3.1 Fixer screen — nearest-first list → record fix (directional)**
- `/fix` asks for the passcode once (§3.1.2). Then it lists `open` reports nearest first: thumbnail, title, owner chip, days open, me-too count. All owners are listed (§4.3.2).
- Tap a report to watch the original, then **Record fix**, which enables only within 50 m. Then "Checking…", then `verified` or a retake with Claude's reason (§4.3.1).
- Neighbors confirming fixes reuse the same capture and check screens, reached from "Is it fixed?" on a card (§4.3.2).

### 5.4 Me page

**5.4.1 Private Me page (added 2026-10-24, directional)**
- A tab visible only to its owner, keyed by the device token (§3.1.1). No display name, no public URL. The Scope non-goal "public profiles" still holds.
- **My posts:** every report you posted, with live status: Checking… / retake or reject with Claude's reason / Call 911 / open (days, me-toos) / fixed. A held retake has a **Retake** button (§4.2.1).
- **My me-toos:** reports you me-too'd, with status.
- Fixed items in either list are highlighted, with the reveal (§5.1.1). On stage: "the pothole I posted just got fixed."
- Rationale: the user wants results visible, which matters for the demo. Keeping it private avoids exposing which blocks someone films, usually their own (§7.1.1).
- Rejected: public profiles with display names. They leak which blocks a resident films, and they're a Scope non-goal.

---

## 6. Demo & impact

### 6.1 Demo

**6.1.1 California sample videos — Sample badge + demo location mode**
- Seeded reports have `isSample: true`, are placed at plausible Mableton coordinates, and show a **"Sample · filmed in California"** badge on the card.
- `?demo=mableton` swaps the phone's GPS for a fixed Mableton point next to the seeds and shows a **"Demo mode: location simulated"** banner. Posting (§4.1.1), the duplicate check (§4.1.2) and the fix geofence (§4.3.1) all use that point.
- Stage flow:
  1. Walk up to a seeded pothole: "Is it one of these?" → Me too.
  2. Post a new clip live.
  3. Play a pre-filmed before/after pair of the same California spot. Claude verifies it, and the reveal plays (§5.1.1).
- Needs before/after pairs filmed at the same spot, so Claude's same-spot check passes honestly.
- **Seeding** (sweep, 2026-10-24): an admin-only Convex action runs each sample clip through the real pipeline (transcription, then screening, §1.1.3/§1.1.4/§4.2.1), then sets `isSample: true`. Claude really did screen the seeds.
- **Backdating** (2026-10-24): samples may get backdated `createdAt` / `lastActivityAt` / `fixedAt`, so cards read "Open · 23 days" rather than "0 days". This is acceptable only because the Sample badge labels them.
- **Seed ownership** (2026-10-24): a seeded report can be assigned to the demo phone's resident token, so its Me page shows "the pothole I posted just got fixed" (§5.4.1).
- **Demo-mode upload** (sweep, 2026-10-24): with `?demo=mableton`, capture screens show an "Upload clip" button. Frames come from the file (§4.1.1). Uploaded fix clips always play muted (§4.3.1's "no commentary").
- Rationale: the whole flow runs live on stage in Berkeley, the routing and map stay Mableton, and everything simulated is labeled on screen. That matters for the Anthropic track's "real problem" criterion and for the Mayor on Oct 30.
- Rejected:
  - Samples at their real California locations: Berkeley potholes routed to "Cobb DOT."
  - The Bay Area as a second city: a second routing table, and it weakens the "named community" pitch.
- 📌 Deferred (§8): replace the samples with the Mableton teammate's real footage and turn demo mode off for Oct 30.

### 6.2 Impact

**6.2.1 Impact metric — a trust survey before and after, plus counters from existing data**
- **Headline:** a before-and-after survey of the 10–20 test-week residents (Google Form, no app code), two questions on a 1–5 scale:
  1. "How much do you believe reported problems in Mableton get fixed?"
  2. "How much do you feel your property taxes are being put to good use?" (tax framing, see Scope addendum)
- **Supporting, from stored data:**
  - **Days to a verified fix:** median, and the share fixed within 30 days, by owner (city / Cobb / utility), from `createdAt` and `fixedAt`. Shows which agency is slow.
  - **Views per fix reveal:** a `revealViews` counter on the report, incremented once per card view per session when the "FIXED" stamp first plays (§5.1.1), not on each loop. Shows whether fixes are actually seen, which is the premise.
  - **Me-toos as a share of reports:** a proxy for duplicate calls avoided.
- **For Cal Hacks:** there's no real data yet, so the pitch shows the plan plus the live counters from the demo. One stats query; no dashboard screen.
- Rationale: the premise is that visible fixes build trust (Scope), so the headline measures trust, and the counters show the mechanism (fixes happen, and people see them). It answers the Anthropic track's impact plan and Microsoft's "measurable usefulness."
- Rejected: an in-app trust question shown on first visit and after a week. More responses, but a new screen and timing logic. 📌 Deferred (§8).

---

## 7. Privacy

### 7.1 Privacy

**7.1.1 What's public — exact location, no poster identity; held clips purged after 7 days**
- **Location:** exact lat/lng and street are public. Fixers need them, and the 50 m checks depend on them (§4.1.2, §4.3.1).
- **Never public:** no query returns the poster, the me-too list, resident tokens or fixer tokens. The one exception is the Me page (§5.4.1): a query keyed by your own token returns only your own posts and me-toos. Only counts and the fixer's org (§3.1.2) are public.
- **Muted reports:** for `audioMuted` reports (§4.2.1), queries never return the transcript or captions.
- **Retention:**
  - `held` clips (retake / reject / emergency; never public) are deleted after 7 days by a Convex cron. The report row and its me-toos go too (2026-10-24). Unverified fix-attempt clips older than 7 days are also deleted.
    - (2026-10-25) Age runs from the newest file upload, so a retake (§4.2.1) restarts the 7 days. Samples (§6.1.1) are never purged, because their `createdAt` is backdated.
  - Published reports (`open` / `fixed`) are kept indefinitely; the public record is the point.
- Rejected:
  - Blurring locations to street level: breaks fixer navigation and the 50 m checks.
  - Expiring published clips: erases the accountability record.

---

## 8. Deferred decisions (record, don't decide)

**Before ship (verify when the product is near finished):**
- Routing table §2.1.2: confirm every owner and agency, especially streetlights (Georgia Power?) and water mains (Cobb Water System?)

**Before Oct 30 (second pass):**
- Reporting by text message (Scope non-goal for Cal Hacks)
- Spanish UI and posts
- Video hosting at pilot scale (free-tier bandwidth)
- Staff moderation queue for flagged posts (until then, `held` is released by hand in the Convex dashboard, §4.2.1)
- Strip audio server-side from `mute`-verdict clips (§4.2.1)
- Onboarding real fixers (city staff, contractors) with the city
- Mableton test-week logistics
- In-app trust question shown on first visit and after a week (§6.2.1)
- Replace the California samples with real Mableton footage, and turn `?demo=mableton` off (§6.1.1)
- Native mobile app with native capture (needs an Apple developer account) (§4.1.1)
- City single sign-on for fixers (§3.1.2)
- Real resident identity for the pilot (Google sign-in or phone) so me-too counts can be trusted (§3.1.1)
- Reopening a fixed report when the fix didn't hold (§2.1.3)
- Speech-to-text on Google STT for the Google-hosted Oct 30 event (optional)
- Audio in clips for the Mableton pilot (privacy of narration and bystander voices; consider silent clips plus a text note)

---

## Design queue

### Level 2 (tonight: blocks the Cal Hacks build)
**1.1 Platform**
- ~~1.1.1 App stack (frontend, data, file storage, hosting)~~ ✓ *(Next.js + Convex)*
- ~~1.1.2 Map library~~ ✓ *(Google Maps)*
- ~~1.1.3 Claude: model, and what it receives (frames vs video)~~ ✓ *(Opus 5.5 low; frames + transcript)*
- ~~1.1.4 Speech-to-text engine~~ ✓ *(Groq Whisper turbo)*

**2.1 Reports**
- ~~2.1.1 Report shape (one report, many "me too"s)~~ ✓ *(one clip + me-too taps)*
- ~~2.1.2 Categories and who handles each (Mableton routing table)~~ ✓ *(fixed table, 8 categories)*
- ~~2.1.3 Status lifecycle~~ ✓ *(pending/held/open/fixed)*

**3.1 Identity & roles**
- ~~3.1.1 Resident identity (posting, "me too")~~ ✓ *(device token in DB)*
- ~~3.1.2 Fixer access (who can close a report)~~ ✓ *(passcode per fixer)*

**4.1 Posting**
- ~~4.1.1 Capture (in-page recorder vs native camera, length, resolution)~~ ✓ *(in-page recorder, 720p, 20s; posts are a video or a photo slideshow, fixes video only)*
- ~~4.1.2 Duplicate check when posting~~ ✓ *(location pre-check, 50 m)*

**4.2 Screening**
- ~~4.2.1 What Claude checks, and what happens when something is flagged (incl. emergencies)~~ ✓ *(verdict → automatic action)*

**4.3 Resolution**
- ~~4.3.1 What counts as proof of fix~~ ✓ *(geofence + silent + Claude before/after)*
- ~~4.3.2 Proof for problems the city doesn't own (Cobb, utilities)~~ ✓ *(neighbors confirm, same pipeline)*

**5.1 Feed**
- ~~5.1.1 Card layout and the before/after reveal~~ ✓ *(directional; sequential reveal)*
- ~~5.1.2 Feed order~~ ✓ *(last activity)*

**5.2 Map**
- ~~5.2.1 What the map shows; map ↔ feed link~~ ✓ *(clusters, status colors, two-way link)*

**5.3 Fixer screen**
- ~~5.3.1 Minimal fixer flow~~ ✓ *(nearest-first list → record)*

**5.4 Me page**
- ~~5.4.1 Private Me page~~ ✓ *(added 2026-10-24)*

**6.1 Demo**
- ~~6.1.1 Where the California sample videos appear~~ ✓ *(Sample badge + demo location mode)*

**6.2 Impact**
- ~~6.2.1 Impact metric for the Anthropic submission~~ ✓ *(trust survey + counters)*

**7.1 Privacy**
- ~~7.1.1 What's public: location precision, retention~~ ✓ *(exact location, no poster identity, held purged after 7d)*

---

## Next steps (build)
1. **Scaffold:** Next.js App Router + Convex. Deploy to Vercel immediately so camera access works over HTTPS (§1.1.1).
2. **Keys:** Google Maps browser key + Geocoding key (§1.1.2), `ANTHROPIC_API_KEY` and `GROQ_API_KEY` in Convex env (§1.1.3, §1.1.4).
3. **Schema:** `reports`, `meToos`, `residents`, `fixers`, `fixAttempts` (§2.1.1). Indexes: `lastActivityAt` for the feed (the one index of §5.1.2; the query filters to `open` / `fixed`), and `status`+`lat` for bounding-box queries.
4. **Pipeline:** upload → frames, transcript or photos → one Claude call (structured JSON) → verdict → status (§1.1.3, §4.2.1). Then the fix check (§4.3.1).
5. **Surfaces** (partner, from wireframes): feed + reveal (§5.1), map (§5.2), `/fix` (§5.3), Me page (§5.4), capture screens (§4.1).
6. **Demo:** seed action + `?demo=mableton` (§6.1.1). Film the before/after pairs.
7. **Before ship:** verify the routing table (§8), and source the Mamdani claim and the tax figures before they go in the pitch (Scope).

**Partner handoff (wireframes in Claude Cowork):** read Scope, Scope addendum, §4.1 (capture: video / slideshow / description / duplicate check), §4.2.1 (Checking… and verdict screens, incl. Call 911), §5.1–§5.4, §6.1.1 (Sample badge, demo banner). §5 entries are directional: content and behavior are fixed, layout is the partner's call.

