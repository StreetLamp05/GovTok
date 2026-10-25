import { execSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { transcribe } from "../convex/lib/transcribe.ts";

const fixtures = [
  { fileName: "narrated.mp4", contentType: "video/mp4" },
  { fileName: "narrated.webm", contentType: "video/webm" },
  { fileName: "near-silent.mp4", contentType: "video/mp4" },
  { fileName: "near-silent.webm", contentType: "video/webm" },
] as const;

function readDeploymentApiKey(): string {
  const key = execSync("npx convex env get GROQ_API_KEY", {
    cwd: process.cwd(),
    encoding: "utf8",
    stdio: ["ignore", "pipe", "inherit"],
  }).trim();

  if (!key) {
    throw new Error("GROQ_API_KEY is empty in the selected Convex deployment.");
  }
  return key;
}

async function main() {
  const apiKey = readDeploymentApiKey();
  const fixtureDirectory = resolve("scripts/fixtures");
  let failed = false;

  for (const fixture of fixtures) {
    const path = resolve(fixtureDirectory, fixture.fileName);
    const bytes = await readFile(path);
    const blob = new Blob([bytes], { type: fixture.contentType });

    try {
      const result = await transcribe(blob, fixture.contentType, fixture.fileName, apiKey);
      if (fixture.fileName.startsWith("near-silent.") && result.text.trim().length > 20) {
        failed = true;
        console.error(
          `${fixture.fileName}: expected an empty or near-empty transcript, got ${result.text.trim().length} characters.`,
        );
      }
      console.log(JSON.stringify({ fileName: fixture.fileName, ...result }));
    } catch (error) {
      failed = true;
      console.error(`${fixture.fileName}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  if (failed) process.exitCode = 1;
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
