import { expect, test } from "vitest";
import { framesFromFile } from "../../../lib/media/frames";

// Fixtures are recorded here with MediaRecorder from an animated canvas, so the webm one has the
// real MediaRecorder quirk (no duration in the header). Playwright's Chromium can't decode H.264,
// so the mp4 fixture is whatever codec it records into an MP4 container (VP9); H.264 is covered
// by the manual phone check.
async function recordCanvas(mimeType: string, width: number, height: number, ms = 1500): Promise<Blob> {
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
  const recorder = new MediaRecorder(canvas.captureStream(30), { mimeType });
  const chunks: Blob[] = [];
  recorder.ondataavailable = (e) => e.data.size && chunks.push(e.data);
  const stopped = new Promise((resolve) => (recorder.onstop = resolve));
  recorder.start(250);
  await new Promise((resolve) => setTimeout(resolve, ms));
  recorder.stop();
  await stopped;
  clearInterval(timer);
  recorder.stream.getTracks().forEach((t) => t.stop());
  return new Blob(chunks, { type: mimeType });
}

async function durationAtLoad(blob: Blob): Promise<number> {
  const video = document.createElement("video");
  video.src = URL.createObjectURL(blob);
  await new Promise((resolve, reject) => {
    video.onloadedmetadata = resolve;
    video.onerror = reject;
  });
  URL.revokeObjectURL(video.src);
  return video.duration;
}

async function expectSixJpegs(frames: Blob[], width: number, height: number) {
  expect(frames).toHaveLength(6);
  for (const frame of frames) {
    expect(frame.type).toBe("image/jpeg");
    const bitmap = await createImageBitmap(frame);
    expect([bitmap.width, bitmap.height]).toEqual([width, height]);
  }
}

test("6 frames from a MediaRecorder webm whose duration reads as Infinity", async () => {
  const webm = await recordCanvas("video/webm", 640, 360);
  expect(await durationAtLoad(webm)).toBe(Infinity);

  await expectSixJpegs(await framesFromFile(webm), 640, 360);
});

test("6 frames from an mp4", async () => {
  expect(MediaRecorder.isTypeSupported("video/mp4")).toBe(true);
  const mp4 = await recordCanvas("video/mp4", 640, 360);
  expect(await durationAtLoad(mp4)).toBeLessThan(Infinity);

  await expectSixJpegs(await framesFromFile(mp4), 640, 360);
});

test("frames are capped at 1280 px on the long edge", async () => {
  const webm = await recordCanvas("video/webm", 1920, 1080, 600);

  await expectSixJpegs(await framesFromFile(webm), 1280, 720);
});

test("frames are evenly spaced through the clip, not repeats of one frame", async () => {
  const frames = await framesFromFile(await recordCanvas("video/webm", 64, 64));

  const colors = await Promise.all(
    frames.map(async (frame) => {
      const canvas = new OffscreenCanvas(1, 1);
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(await createImageBitmap(frame), 0, 0, 1, 1);
      return ctx.getImageData(0, 0, 1, 1).data.join(",");
    }),
  );
  expect(new Set(colors).size).toBeGreaterThanOrEqual(5);
});
