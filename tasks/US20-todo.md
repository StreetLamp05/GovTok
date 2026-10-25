# US20: See clustered reports on a map (#25)

Spec: §1.1.2 (Google Maps + `@vis.gl/react-google-maps` + `@googlemaps/markerclusterer`), §5.2.1 (counts, status colors, Open/Fixed toggle, links to the feed). Parent F5 (#24).
Design reference: `spec/UI_mockups` map screen (open `#C2410C`, fixed `#157A47`, mixed cluster `#1E3A5F`; white-bordered count bubbles; top card "Problems in Mableton" with summary + segmented All / Open · N / Fixed · N).

## Plan
- [x] `convex/map.ts`: `mapReports` query. Reads the `by_status_lat` index once per public status (open, fixed) and returns an allowlist projection `{_id, lat, lng, status, meTooCount, title, category, isSample}`; `toMapReport` throws on a non-public status. No storage URLs, nothing private.
- [x] `components/map/counts.ts`: `markerCount(r) = 1 + meTooCount`, `clusterCount(members)` = sum of member counts (§5.2.1), status colors, cluster color (all open / all fixed / mixed).
- [x] `components/map/clusterRenderer.ts`: markerclusterer `Renderer` whose label is `clusterCount` of its members, rendered as an AdvancedMarkerElement bubble.
- [x] `components/map/ReportsMap.tsx`: `APIProvider` + `Map` (Map ID, centered on `MABLETON_CENTER`, or `DEMO_POINT` in demo mode; plain `/map` resets to city zoom) with one `AdvancedMarker` per report, clustered. Focused report (`?report=`) is centered at street zoom, ringed, and kept out of clusters. Fallback message when the Maps key/Map ID is missing.
- [x] `components/map/MapScreen.tsx`: `useQuery(api.map.mapReports)`, All / Open / Fixed filter, summary line, marker tap → `router.push("/?report=<id>")` (push, so Back returns to the map).
- [x] `app/(tabs)/map/page.tsx`: full-height map, `Suspense` around `useSearchParams`.
- [x] Tests (under `tests/`): cluster label = 9 for 0/2/4 me-toos; `mapReports` returns only open/fixed with exactly the map fields; component test for the toggle and marker tap.
- [x] Verify: `npm test`, `npx tsc --noEmit`, `npm run lint`, `npm run build`, `npm run check:bundle`, push functions to this worktree's local Convex deployment.

## Notes / decisions
- Toggle is a 3-way segmented control (All / Open / Fixed) per the mockup; spec's "Open / Fixed toggle" is the two filters, All is the default so the map isn't half-empty on load.
- `MABLETON_CENTER` is kept separate from `DEMO_POINT`, which US25 may move next to the seeds.
- The feed's handling of `/?report=<id>` belongs to the feed card, not this one.

## Review round 1 (review-card: NEEDS_INPUT) → fixes
- [x] Clusters stale on live updates: `clearMarkers(true)` + re-adding the same markers didn't redraw. Now `clearMarkers()` with a draw.
- [x] No clustering under `next dev` (StrictMode remount detached it): the clusterer is built detached and attached/detached in one effect.
- [x] Test gaps: `tests/components/map/ReportsMap.test.tsx` drives a fake map + clusterer (marker→report lookup, live relabel, StrictMode, colors, focus, centering).
- [x] Non-demo centering: `MABLETON_CENTER` in `ReportsMap.tsx`; `DEMO_POINT` only in demo mode, so US25 moving it doesn't move the normal view.
- [x] `mapReports` runtime guard: `toMapReport` throws on a non-public status, like `publicReport`.
- [x] User decisions (2026-10-25):
  - Sample reports: `isSample` in `mapReports`, marker title starts "Sample." (no visual badge).
  - Marker tap stays straight to the feed; All / Open / Fixed control stays.
  - Added from the mockup: colour legend (Open / Fixed / Mixed, "Number = original post + me-toos") above Google's logo, and a "you" dot via `useCurrentLocation` (DEMO_POINT in demo mode; none when denied).
  - Bandwidth: accepted for M0, trigger recorded in GOVTOK_DECISIONS.md §8.
  - Muted titles: forward reference added under §4.2.1 for the screening prompt.
  - `google.maps` types moved to tsconfig `compilerOptions.types`; `components/map/google-maps.d.ts` removed.
  - Local Convex smoke-test rows cleared.
- Verified after fixes: 107 tests (22 map), tsc, lint, build, bundle check. Each original bug reintroduced → a ReportsMap test fails. Real browser on the production build: cluster 9, filter, tap → feed → Back, focus, legend, you dot, "Sample." titles. Not verified in a real browser under `next dev` (the cross-origin harness wouldn't hydrate); StrictMode is covered by the unit test.

## Review round 2 (review-card: CLEAN, 2026-10-25)
- All 4 ACs proven; round-1 findings 1–5 fixed (stale-cluster fix confirmed against the real markerclusterer 2.6.2).
- Non-blocking, left for the user:
  - §8 bandwidth note should also list reveal-view writes (US19 `recordRevealView`) as re-run triggers; heading says "map/feed" but only analyses the map.
  - §4.2.1 muted-title note: US12's prompt already bans PII in titles (gap: slurs); handoff block still says no forward references are open.
  - "You" dot asks for location on Map tab open; a deny there can break Post's GPS on Android. Option: demo mode only, or only when already granted.
  - "Sample." prefix is tooltip-only (screen readers); the visible badge is US17's card.
  - Keep `AGENTS.md` (regenerated by `next dev`) out of the commit.
- [x] User decisions after round 2: the "you" dot shows only in demo mode or when location is already granted (Permissions API; the Map tab never prompts); §4.2.1 note restated as a locked rule with the slurs gap, and the handoff line mentions it; "Sample." stays tooltip-only.
- [x] Fixed after round 2: §8 note lists every re-run trigger (incl. reveal views) and is scoped to the map; tests for the no-re-centre guard (mutation-checked) and `toMapReport`'s throw; plain `/map` after `?report=` resets to city zoom; this file brought up to date.

## Progress
- Added deps: `@vis.gl/react-google-maps@1.10.1`, `@googlemaps/markerclusterer@2.6.2`, dev `@types/google.maps@3.66.7` (TS 6 no longer auto-loads `@types/*`, so tsconfig `compilerOptions.types` lists it).
- Verified: `npm test` (all files pass, 12 new tests), `npx tsc --noEmit`, `npm run lint`, `npm run build`, `npm run check:bundle`; `convex dev --once` against this worktree's local deployment (port 3210), `npx convex run map:mapReports` returned only open/fixed rows with the 7 fields of that time (now 8, with `isSample`).
- Real-map smoke test (headless Chromium 390×844, production key, page served under the allowed `localhost:3000` origin): 3 nearby open reports with 0/2/4 me-toos cluster as **9**; pending report absent; Fixed filter leaves one green marker; tapping a marker goes to `/?report=<id>`, Back returns to `/map`; `/map?report=<id>` centers at zoom 17 with the ringed marker. Test rows were later cleared from the local Convex.
