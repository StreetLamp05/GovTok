import { FRAME_COUNT, FRAME_JPEG_QUALITY, FRAME_MAX_EDGE } from "./constants";

// Frames for Claude (§1.1.3) and the card poster. Live recordings grab them from the preview
// (§4.1.1); anything else (native-camera fallback, demo-mode upload) goes through framesFromFile.

const MEDIA_TIMEOUT_MS = 10_000;
// Seeking to the exact end can land past the last frame, so the last grab sits a bit before it.
const END_MARGIN_S = 0.1;

/** Keeps `n` evenly spaced items, always including the first and last. Fewer than `n` come back unchanged. */
export function pickEvenly<T>(items: readonly T[], n: number = FRAME_COUNT): T[] {
  if (items.length <= n) return items.slice();
  if (n <= 1) return items.slice(0, n);
  return Array.from({ length: n }, (_, i) => items[Math.round((i * (items.length - 1)) / (n - 1))]);
}

/** `n` evenly spaced seek times from 0 to just before the end of a clip. */
export function evenTimes(durationS: number, n: number = FRAME_COUNT): number[] {
  const end = Math.max(0, durationS - END_MARGIN_S);
  if (n <= 1) return [0];
  return Array.from({ length: n }, (_, i) => (i * end) / (n - 1));
}

/** Scales a frame down so its long edge is at most `maxEdge`. Never scales up. */
export function frameSize(width: number, height: number, maxEdge: number = FRAME_MAX_EDGE) {
  const scale = Math.min(1, maxEdge / Math.max(width, height));
  return { width: Math.round(width * scale), height: Math.round(height * scale) };
}

/** The video's current frame as a JPEG, 1280 px or less on the long edge. */
export function grabFrame(video: HTMLVideoElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    if (!video.videoWidth || !video.videoHeight) return reject(new Error("The video has no frame to grab yet."));
    const { width, height } = frameSize(video.videoWidth, video.videoHeight);
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return reject(new Error("Canvas 2D isn't available."));
    ctx.drawImage(video, 0, 0, width, height);
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Couldn't encode the frame."))),
      "image/jpeg",
      FRAME_JPEG_QUALITY,
    );
  });
}

/**
 * Resolves once `ready()` is true, re-checking on each of `events`. Rejects on a media error or
 * timeout. Media events fire as tasks, so listeners added right after setting `src` or
 * `currentTime` don't miss them.
 */
function until(video: HTMLVideoElement, events: string[], ready: () => boolean, what: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const settle = (err?: Error) => {
      clearTimeout(timer);
      events.forEach((e) => video.removeEventListener(e, check));
      video.removeEventListener("error", fail);
      if (err) reject(err);
      else resolve();
    };
    const check = () => ready() && settle();
    const fail = () => settle(new Error(`The clip couldn't be read (${video.error?.message || `code ${video.error?.code}`}).`));
    const timer = setTimeout(() => settle(new Error(`Timed out waiting for ${what}.`)), MEDIA_TIMEOUT_MS);
    events.forEach((e) => video.addEventListener(e, check));
    video.addEventListener("error", fail);
  });
}

function seek(video: HTMLVideoElement, timeS: number): Promise<void> {
  video.currentTime = timeS;
  return until(video, ["seeked"], () => true, "a seek");
}

/**
 * MediaRecorder webm files have no duration in their header, so `duration` reads Infinity until
 * the browser has scanned to the end. Seeking far past the end forces that scan.
 */
async function finiteDuration(video: HTMLVideoElement): Promise<number> {
  if (Number.isFinite(video.duration)) return video.duration;
  video.currentTime = Number.MAX_SAFE_INTEGER;
  await until(video, ["durationchange", "timeupdate", "seeked"], () => Number.isFinite(video.duration), "the clip's duration");
  return video.duration;
}

/** 6 evenly spaced JPEG frames from a clip, via a hidden `<video>`. Frame 0 is the first frame. */
export async function framesFromFile(file: Blob, count: number = FRAME_COUNT): Promise<Blob[]> {
  const url = URL.createObjectURL(file);
  const video = document.createElement("video");
  video.muted = true;
  video.playsInline = true;
  video.preload = "auto";
  // Kept in the DOM (but invisible) because iOS Safari won't decode frames for a detached video.
  video.style.cssText = "position:fixed;left:0;top:0;width:1px;height:1px;opacity:0;pointer-events:none";
  document.body.appendChild(video);
  try {
    video.src = url;
    await until(video, ["loadedmetadata"], () => true, "the clip to load");
    const duration = await finiteDuration(video);
    const frames: Blob[] = [];
    for (const t of evenTimes(duration, count)) {
      await seek(video, t);
      frames.push(await grabFrame(video));
    }
    return frames;
  } finally {
    video.removeAttribute("src");
    video.load();
    video.remove();
    URL.revokeObjectURL(url);
  }
}
