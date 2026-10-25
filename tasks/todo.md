# US6 (#7): App shell with device token, location and sound plumbing

Spec §3.1.1, §5.1.1, §6.1.1. Dispatcher note: delete `app/page.tsx`; leave `convex/` alone (US5 owns it, incl. `getOrCreateResident`).

## Plan
- [x] Test deps: `jsdom`, `@testing-library/react`, `@testing-library/dom`; vitest includes `lib/**/*.test.{ts,tsx}` (jsdom via per-file docblock, convex tests stay on edge-runtime)
- [x] `lib/demo.ts`: `DEMO_PARAM`/`DEMO_VALUE`, `DEMO_POINT` (Mableton)
- [x] `lib/hooks/useResidentToken.ts`: UUID in localStorage, in-memory per-session fallback when storage throws
- [x] `lib/hooks/useDemoMode.ts`: `?demo=mableton` → sessionStorage flag, survives navigation
- [x] `lib/hooks/useCurrentLocation.ts`: high-accuracy geolocation w/ timeout; `loading | ready | denied | unavailable | timeout`; demo → `DEMO_POINT`; `refresh()`
- [x] `lib/hooks/sound.tsx`: `SoundProvider` + `useSoundUnlocked()`; first tap/key anywhere unmutes for the session
- [x] `app/layout.tsx`: wrap in `SoundProvider`, render `DemoBanner` on every page
- [x] `app/(tabs)/layout.tsx` + `TabBar.tsx` (Feed, Map, Post, Me; styling from `spec/UI_mockups`)
- [x] Stubs: `app/(tabs)/page.tsx` (/), `map`, `post` (shows location state incl. denied message), `me`; hidden `app/fix`, `app/admin/seed`
- [x] Delete `app/page.tsx`
- [x] Unit tests for the three hooks (+ sound)
- [x] Verify: `npm test`, `npx tsc --noEmit`, `npm run lint`, `npm run build`; click through in a browser
