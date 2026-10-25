# Lessons

- **Hackathon mode → DB-only first (2026-10-24).** I recommended Convex Auth anonymous sessions for resident identity; the user pushed back: third-party auth is setup pain at a hackathon. Rule: during time-boxed builds, lead with the zero-dependency option (device token / passcode in the DB) and file the production-grade option under deferred.
- **Tests go in `tests/`, not next to the code (2026-10-24).** I put US5's tests beside their modules (`convex/lib/*.test.ts`); the user wants them in a separate testing directory. Rule: put new tests under `tests/` (Convex tests in `tests/convex/`, using `modules` from `tests/convex/setup.ts`), with paths that mirror the source.
