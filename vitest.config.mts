import { defineConfig } from "vitest/config";

export default defineConfig({
  // The `@/*` import alias from tsconfig.json, for components under test.
  resolve: { tsconfigPaths: true },
  test: {
    environment: "edge-runtime",
    server: { deps: { inline: ["convex-test"] } },
    // Client tests opt into jsdom with a `// @vitest-environment jsdom` docblock.
    // convex/placeholder.test.ts goes with the placeholder in a follow-up; everything else lives in tests/.
    include: ["tests/**/*.test.{ts,tsx}", "convex/**/*.test.ts"],
    // Real-browser tests run under vitest.browser.config.mts (`npm run test:browser`).
    exclude: ["tests/browser/**", "**/node_modules/**"],
  },
});
