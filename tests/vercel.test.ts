// @vitest-environment node
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, test } from "vitest";

const config = JSON.parse(readFileSync(join(__dirname, "../vercel.json"), "utf8"));

// Vercel runs ignoreCommand in sh: exit 0 skips the build, exit 1 builds.
function ignoreExit(vercelEnv: string | undefined) {
  const env = { ...process.env };
  delete env.VERCEL_ENV;
  if (vercelEnv !== undefined) env.VERCEL_ENV = vercelEnv;
  return spawnSync("sh", ["-c", config.ignoreCommand], { env }).status;
}

// Without it, a project whose preset is "Other" looks for a `public` output directory and fails.
test("Vercel builds it as a Next.js app", () => {
  expect(config.framework).toBe("nextjs");
});

test("the build deploys Convex, then builds Next.js against it", () => {
  expect(config.buildCommand).toBe("npx convex deploy --cmd 'npm run build'");
});

test("only production builds; previews and unknown environments are skipped", () => {
  expect(ignoreExit("production")).toBe(1);
  expect(ignoreExit("preview")).toBe(0);
  expect(ignoreExit("development")).toBe(0);
  expect(ignoreExit(undefined)).toBe(0);
});
