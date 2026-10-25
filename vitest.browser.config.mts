import { playwright } from "@vitest/browser-playwright";
import { defineConfig } from "vitest/config";

// Headless Chromium tests for code that needs real media decoding (`npm run test:browser`).
// First run on a machine: `npx playwright install chromium`.
export default defineConfig({
  // The `@/*` import alias from tsconfig.json, for components under test.
  resolve: { tsconfigPaths: true },
  test: {
    include: ["tests/browser/**/*.test.ts"],
    browser: {
      enabled: true,
      provider: playwright(),
      headless: true,
      instances: [{ browser: "chromium" }],
    },
  },
});
