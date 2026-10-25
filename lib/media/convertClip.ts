import { MAX_CLIP_BYTES } from "../../convex/lib/clipLimit";
import { AUDIO_BITS_PER_SECOND, MAX_RECORD_MS, VIDEO_BITS_PER_SECOND } from "./constants";
import { frameSize } from "./frames";
import { normalizeMimeType, pickMimeType } from "./mimeType";

// Uploaded clips (§4.1.1): a new iPhone saves .mov (often HEVC, often 4K) that Groq won't take
// (§1.1.4) and that can be well over 25 MB. The browser can decode it, so it's played in a hidden
// <video>, drawn to a canvas at 720p or less, and re-recorded with the same MediaRecorder
// settings as a live clip. It runs in real time, so a 20 s clip takes about 20 s.

// The containers Groq and every phone accept as they are.
const PASS_THROUGH_TYPES = ["video/mp4", "video/webm"];
const STALL_MS = 10_000;
const FPS = 30;

/** True when an uploaded clip has to be re-recorded before it can be posted. */
export function needsConversion(file: Blob): boolean {
  return !PASS_THROUGH_TYPES.includes(normalizeMimeType(file.type)) || file.size > MAX_CLIP_BYTES;
}

/** A long edge of at most `maxEdge`, with even sides, which video encoders need. */
export function convertedSize(width: number, height: number, maxEdge = 1280) {
  const size = frameSize(width, height, maxEdge);
  return { width: size.width - (size.width % 2), height: size.height - (size.height % 2) };
}

type Options = {
  /** 0 to 1, as the clip plays through. */
  onProgress?: (fraction: number) => void;
  /** Stop after this much of the clip (§4.1.1's 20 s cap). */
  maxMs?: number;
};

/**
 * Re-records `file` as MP4 (or WebM where MP4 isn't supported), 720p at about 1.5 Mbps, with its
 * audio, cut at 20 s. Call it straight from the file input's change handler: playback starts
 * before the first await, so iOS still counts the tap that picked the file.
 */
export function convertClip(file: Blob, { onProgress, maxMs = MAX_RECORD_MS }: Options = {}): Promise<Blob> {
  const url = URL.createObjectURL(file);
  const video = document.createElement("video");
  video.playsInline = true;
  video.preload = "auto";
  // In the DOM (but invisible), because iOS Safari won't decode frames for a detached video.
  video.style.cssText = "position:fixed;left:0;top:0;width:1px;height:1px;opacity:0;pointer-events:none";
  document.body.appendChild(video);
  video.src = url;

  // The audio goes to the recording only, never the speaker. Without WebAudio the clip is silent.
  let audio: { context: AudioContext; stream: MediaStream } | null = null;
  try {
    const context = new AudioContext();
    const destination = context.createMediaStreamDestination();
    context.createMediaElementSource(video).connect(destination);
    audio = { context, stream: destination.stream };
  } catch {
    video.muted = true;
  }
  // Inside the tap: this play() is what lets the later ones run on iOS.
  const unlocked = video.play().catch(() => {
    video.muted = true;
  });

  const cleanup = () => {
    video.pause();
    video.removeAttribute("src");
    video.load();
    video.remove();
    URL.revokeObjectURL(url);
    void audio?.context.close();
  };

  return (async () => {
    try {
      await unlocked;
      video.pause();
      await ready(video);
      video.currentTime = 0;
      await event(video, "seeked");

      const { width, height } = convertedSize(video.videoWidth, video.videoHeight);
      if (!width || !height) throw new Error("The clip has no picture.");
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas 2D isn't available.");

      const tracks = [...canvas.captureStream(FPS).getVideoTracks(), ...(audio?.stream.getAudioTracks() ?? [])];
      const mimeType = pickMimeType((type) => MediaRecorder.isTypeSupported(type));
      const recorder = new MediaRecorder(new MediaStream(tracks), {
        ...(mimeType && { mimeType }),
        videoBitsPerSecond: VIDEO_BITS_PER_SECOND,
        ...(audio && { audioBitsPerSecond: AUDIO_BITS_PER_SECOND }),
      });
      const chunks: Blob[] = [];
      recorder.ondataavailable = (e) => e.data.size > 0 && chunks.push(e.data);
      const stopped = new Promise<void>((resolve, reject) => {
        recorder.onstop = () => resolve();
        recorder.onerror = () => reject(new Error("Converting the clip stopped unexpectedly."));
      });

      const endS = Math.min(Number.isFinite(video.duration) ? video.duration : Infinity, maxMs / 1000);
      let lastProgressAt = Date.now();
      let lastTime = -1;
      await new Promise<void>((resolve, reject) => {
        const draw = () => {
          ctx.drawImage(video, 0, 0, width, height);
          if (video.currentTime !== lastTime) {
            lastTime = video.currentTime;
            lastProgressAt = Date.now();
            if (Number.isFinite(endS)) onProgress?.(Math.min(1, video.currentTime / endS));
          }
          if (video.ended || video.currentTime >= endS) return resolve();
          if (Date.now() - lastProgressAt > STALL_MS) return reject(new Error("The clip stopped playing."));
          requestAnimationFrame(draw);
        };
        video.onerror = () => reject(new Error("The clip couldn't be read."));
        recorder.start(1000);
        video.play().then(() => requestAnimationFrame(draw), reject);
      });
      video.pause();
      recorder.stop();
      tracks.forEach((track) => track.stop());
      await stopped;
      onProgress?.(1);
      return new Blob(chunks, { type: recorder.mimeType || mimeType || "video/webm" });
    } finally {
      cleanup();
    }
  })();
}

function event(video: HTMLVideoElement, name: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => done(new Error(`Timed out waiting for ${name}.`)), STALL_MS);
    const ok = () => done();
    const fail = () => done(new Error("The clip couldn't be read."));
    function done(err?: Error) {
      clearTimeout(timer);
      video.removeEventListener(name, ok);
      video.removeEventListener("error", fail);
      if (err) reject(err);
      else resolve();
    }
    video.addEventListener(name, ok);
    video.addEventListener("error", fail);
  });
}

// Metadata (size and duration) loaded.
async function ready(video: HTMLVideoElement): Promise<void> {
  if (video.readyState >= HTMLMediaElement.HAVE_METADATA) return;
  await event(video, "loadedmetadata");
}
