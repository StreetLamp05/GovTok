/// <reference types="vite/client" />

// Every Convex module, for convexTest(schema, modules). Tests live outside convex/, so the
// glob reaches back into it.
export const modules = import.meta.glob(["../../convex/**/*.ts", "../../convex/**/*.js", "!../../convex/**/*.test.ts", "!../../convex/**/*.d.ts"]);
