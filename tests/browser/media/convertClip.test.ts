import { expect, test } from "vitest";
import { convertClip } from "../../../lib/media/convertClip";

// Real decoding and re-recording in headless Chromium. The fixture is a 1080p WebM recorded
// here from an animated canvas; a real iPhone .mov (HEVC) is covered by the manual phone check.
async function recordCanvas(width: number, height: number, ms: number): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d")!;
  let hue = 0;
  const paint = () => {
    ctx.fillStyle = `hsl(${(hue += 12) % 360} 80% 50%)`;
    ctx.fillRect(0, 0, width, height);
  };
  paint();
  const timer = setInterval(paint, 33);
  const recorder = new MediaRecorder(canvas.captureStream(30), { mimeType: "video/webm" });
  const chunks: Blob[] = [];
  recorder.ondataavailable = (e) => e.data.size && chunks.push(e.data);
  const stopped = new Promise((resolve) => (recorder.onstop = resolve));
  recorder.start(250);
  await new Promise((resolve) => setTimeout(resolve, ms));
  recorder.stop();
  await stopped;
  clearInterval(timer);
  return new Blob(chunks, { type: "video/webm" });
}

async function load(blob: Blob) {
  const video = document.createElement("video");
  video.muted = true;
  video.src = URL.createObjectURL(blob);
  await new Promise((resolve, reject) => {
    video.onloadeddata = resolve;
    video.onerror = reject;
  });
  return video;
}

test("re-records a 1080p clip at 720p as a playable video, reporting progress", async () => {
  const source = await recordCanvas(1920, 1080, 1500);
  const progress: number[] = [];
  const out = await convertClip(source, { onProgress: (p) => progress.push(p) });

  expect(out.size).toBeGreaterThan(0);
  expect(out.type).toMatch(/^video\/(mp4|webm)/);
  const video = await load(out);
  expect([video.videoWidth, video.videoHeight]).toEqual([1280, 720]);
  expect(progress.at(-1)).toBe(1);
  expect(progress.some((p) => p > 0 && p < 1)).toBe(true);
}, 20_000);

test("stops at maxMs, the 20 s cap in production", async () => {
  const source = await recordCanvas(640, 360, 3000);
  const started = performance.now();
  await convertClip(source, { maxMs: 1000 });
  // Real time: about 1 s of playback, nowhere near the 3 s clip.
  expect(performance.now() - started).toBeLessThan(2500);
}, 20_000);

test("rejects a file that isn't a video", async () => {
  await expect(convertClip(new Blob(["not a video"], { type: "video/quicktime" }))).rejects.toThrow();
}, 20_000);
