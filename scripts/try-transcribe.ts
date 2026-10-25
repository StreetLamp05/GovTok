import { execSync } from "node:child_process";
import { access, readFile } from "node:fs/promises";
import { basename, resolve } from "node:path";
import { transcribe } from "../convex/lib/transcribe.ts";

const fixtures = [
  { fileName: "audio-only/narrated.mp4", contentType: "video/mp4" },
  { fileName: "audio-only/narrated.webm", contentType: "video/webm" },
  { fileName: "audio-only/near-silent.mp4", contentType: "video/mp4" },
  { fileName: "audio-only/near-silent.webm", contentType: "video/webm" },
  { fileName: "audio-only/audio-only-IMG_6372.mp4", contentType: "video/mp4" },
  { fileName: "audio-only/audio-only-IMG_6372.webm", contentType: "video/webm" },
  { fileName: "audio-only/audio-only-IMG_6374.mp4", contentType: "video/mp4" },
  { fileName: "audio-only/audio-only-IMG_6374.webm", contentType: "video/webm" },
  { fileName: "audio-only/audio-only-IMG_6375.mp4", contentType: "video/mp4" },
  { fileName: "audio-only/audio-only-IMG_6375.webm", contentType: "video/webm" },
  { fileName: "audio-only/audio-only-IMG_6376.mp4", contentType: "video/mp4" },
  { fileName: "audio-only/audio-only-IMG_6376.webm", contentType: "video/webm" },
  { fileName: "audio-only/audio-only-IMG_6377.mp4", contentType: "video/mp4" },
  { fileName: "audio-only/audio-only-IMG_6377.webm", contentType: "video/webm" },
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
  const fixtureDirectory = resolve("scripts/fixtures");
  const missingFixtures: string[] = [];
  for (const fixture of fixtures) {
    try {
      await access(resolve(fixtureDirectory, fixture.fileName));
    } catch (error) {
      if (error instanceof Error && "code" in error && error.code === "ENOENT") {
        missingFixtures.push(fixture.fileName);
      } else {
        throw error;
      }
    }
  }
  if (missingFixtures.length > 0) {
    throw new Error(
      `Missing local transcription fixtures: ${missingFixtures.join(", ")}. ` +
        "Restore the user-provided fixture files under scripts/fixtures/audio-only before running this check.",
    );
  }

  const apiKey = readDeploymentApiKey();
  let failed = false;

  for (const fixture of fixtures) {
    try {
      const path = resolve(fixtureDirectory, fixture.fileName);
      const bytes = await readFile(path);
      const blob = new Blob([bytes], { type: fixture.contentType });
      const result = await transcribe(blob, fixture.contentType, basename(fixture.fileName), apiKey);
      if (fixture.fileName.includes("near-silent") && result.text.trim().length > 20) {
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
