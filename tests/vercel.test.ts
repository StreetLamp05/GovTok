// @vitest-environment node
import { spawnSync } from "node:child_process";
import { chmodSync, copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, expect, test } from "vitest";

const config = JSON.parse(readFileSync(join(__dirname, "../vercel.json"), "utf8"));
const SCRIPT = join(__dirname, "../scripts/vercel-build.sh");
let root: string;

// Runs the real build script with fake `npx` and `npm` on PATH that record how they were called.
function build(env: Record<string, string>) {
  const base: NodeJS.ProcessEnv = { ...process.env, PATH: `${join(root, "bin")}:/usr/bin:/bin` };
  delete base.VERCEL_ENV;
  delete base.NEXT_PUBLIC_CONVEX_URL;
  const result = spawnSync(join(root, "scripts/vercel-build.sh"), { env: { ...base, ...env }, encoding: "utf8" });
  let calls = "";
  try {
    calls = readFileSync(join(root, "calls"), "utf8").trim();
  } catch {}
  return { status: result.status, stderr: result.stderr, calls };
}

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), "vercel-build-"));
  mkdirSync(join(root, "scripts"));
  mkdirSync(join(root, "bin"));
  copyFileSync(SCRIPT, join(root, "scripts/vercel-build.sh"));
  for (const bin of ["npx", "npm"]) {
    writeFileSync(join(root, "bin", bin), `#!/bin/sh\necho "${bin} $*" >> "${join(root, "calls")}"\n`);
    chmodSync(join(root, "bin", bin), 0o755);
  }
});

afterEach(() => rmSync(root, { recursive: true, force: true }));

test("vercel.json builds every push through the build script", () => {
  expect(config.buildCommand).toBe("scripts/vercel-build.sh");
  expect(config.ignoreCommand).toBeUndefined();
});

test("production deploys Convex, then builds Next.js against it", () => {
  const { status, calls } = build({ VERCEL_ENV: "production" });

  expect(status).toBe(0);
  expect(calls).toBe("npx convex deploy --cmd npm run build");
});

test("previews only build Next.js, against the prod Convex URL, and never deploy Convex", () => {
  const { status, calls } = build({ VERCEL_ENV: "preview", NEXT_PUBLIC_CONVEX_URL: "https://prod.convex.cloud" });

  expect(status).toBe(0);
  expect(calls).toBe("npm run build");
});

test("a preview without a Convex URL fails instead of building a broken app", () => {
  const { status, stderr, calls } = build({ VERCEL_ENV: "preview" });

  expect(status).toBe(1);
  expect(stderr).toContain("NEXT_PUBLIC_CONVEX_URL is not set");
  expect(calls).toBe("");
});

test("an unknown environment is treated as a preview", () => {
  const { calls } = build({ NEXT_PUBLIC_CONVEX_URL: "https://prod.convex.cloud" });

  expect(calls).toBe("npm run build");
});
