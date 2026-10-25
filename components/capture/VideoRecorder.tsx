"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useDemoMode } from "@/lib/hooks/useDemoMode";
import { describeCameraError } from "@/lib/media/cameraError";
import {
  AUDIO_BITS_PER_SECOND,
  FRAME_SAMPLE_MS,
  MAX_RECORD_MS,
  MIN_RECORD_MS,
  VIDEO_BITS_PER_SECOND,
} from "@/lib/media/constants";
import { framesFromFile, grabFrame, pickEvenly } from "@/lib/media/frames";
import { pickMimeType } from "@/lib/media/mimeType";

// In-page recorder (§4.1.1): rear camera, about 720p at 1.5 Mbps, stopping by itself at 20 s.
// Used for posts (audio on, US8), fixes (audio off, US23) and seeding (US25).

export type RecordedClip = {
  blob: Blob;
  mimeType: string;
  /** 6 evenly spaced JPEG frames (fewer for very short clips). Frame 0 is the thumbnail and poster. */
  frames: Blob[];
};
// Clips from a file (the camera-app fallback and demo-mode upload) are passed through as they
// are, so they keep any audio track even when `audio` is false.

type Props = {
  audio: boolean;
  onDone: (clip: RecordedClip) => void;
  /**
   * Open the camera as soon as the recorder appears, saving a tap ("No, it's new" opens the
   * camera, §4.1.2). If the browser refuses without a tap, the error offers "Try the camera again".
   */
  autoOpen?: boolean;
};

type Phase =
  | { kind: "idle" }
  | { kind: "preview" }
  | { kind: "recording"; startedAt: number; endsAt: number }
  | { kind: "processing" }
  | { kind: "done" }
  | { kind: "error"; message: string };

const COUNTDOWN_TICK_MS = 250;
const EMPTY_CLIP_MESSAGE = "The recording came out empty. Try again.";
const RECORDER_ERROR_MESSAGE = "Recording stopped unexpectedly. Try again.";
const FILE_ERROR_MESSAGE = "We couldn't read that video. Try a different clip.";

const subscribe = () => () => {};
const canRecordInPage = () => !!navigator.mediaDevices?.getUserMedia && typeof MediaRecorder !== "undefined";

export default function VideoRecorder({ audio, onDone, autoOpen = false }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const framesRef = useRef<Promise<Blob | null>[]>([]);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const busyRef = useRef(false);
  // Bumped when a file is picked, so a camera that finishes opening afterwards is closed again.
  const attemptRef = useRef(0);
  const mountedRef = useRef(true);
  const onDoneRef = useRef(onDone);
  const [phase, setPhase] = useState<Phase>({ kind: "idle" });
  const [now, setNow] = useState(0);
  // True during server render and hydration, so the page doesn't flash the fallback.
  const inPage = useSyncExternalStore(subscribe, canRecordInPage, () => true);
  const demo = useDemoMode();

  useEffect(() => {
    onDoneRef.current = onDone;
  }, [onDone]);

  function clearTimers() {
    timersRef.current.forEach((t) => clearTimeout(t));
    timersRef.current = [];
  }

  function stopCamera() {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }

  // Release the camera (and drop any half-finished clip) when the component unmounts.
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      clearTimers();
      const recorder = recorderRef.current;
      if (recorder) {
        recorder.onstop = null;
        if (recorder.state !== "inactive") recorder.stop();
      }
      stopCamera();
    };
  }, []);

  useEffect(() => {
    if (autoOpen && canRecordInPage()) openCamera();
    // Only on mount: toggling autoOpen later shouldn't reopen a camera the resident is using.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function deliver(clip: RecordedClip) {
    if (!mountedRef.current) return;
    setPhase({ kind: "done" });
    onDoneRef.current(clip);
  }

  function fail(message: string) {
    clearTimers();
    stopCamera();
    if (mountedRef.current) setPhase({ kind: "error", message });
  }

  async function openCamera() {
    // A double tap would otherwise open two streams.
    if (busyRef.current) return;
    busyRef.current = true;
    const attempt = ++attemptRef.current;
    const stale = () => !mountedRef.current || attempt !== attemptRef.current;
    stopCamera();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio,
      });
      if (stale()) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }
      streamRef.current = stream;
      const video = videoRef.current!;
      video.srcObject = stream;
      await video.play();
      if (stale()) return stopCamera();
      setPhase({ kind: "preview" });
    } catch (err) {
      if (!stale()) fail(describeCameraError(err, { audio }));
    } finally {
      busyRef.current = false;
    }
  }

  function sampleFrame() {
    framesRef.current.push(grabFrame(videoRef.current!).catch(() => null));
  }

  function startRecording() {
    const stream = streamRef.current;
    if (!stream || recorderRef.current) return;
    const mimeType = pickMimeType((type) => MediaRecorder.isTypeSupported(type));
    const chunks: Blob[] = [];
    let recorder: MediaRecorder;
    try {
      recorder = new MediaRecorder(stream, {
        ...(mimeType && { mimeType }),
        videoBitsPerSecond: VIDEO_BITS_PER_SECOND,
        ...(audio && { audioBitsPerSecond: AUDIO_BITS_PER_SECOND }),
      });
      recorder.ondataavailable = (e) => e.data.size > 0 && chunks.push(e.data);
      recorder.onstop = () => finishRecording(new Blob(chunks, { type: recorder.mimeType || mimeType }));
      recorder.onerror = () => {
        recorder.onstop = null;
        recorderRef.current = null;
        fail(RECORDER_ERROR_MESSAGE);
      };
      recorder.start(1000);
    } catch (err) {
      // Nothing is kept on failure, so Record works again once the camera reopens.
      return fail(describeCameraError(err, { audio }));
    }
    recorderRef.current = recorder;
    framesRef.current = [];
    sampleFrame();

    const startedAt = Date.now();
    setNow(startedAt);
    setPhase({ kind: "recording", startedAt, endsAt: startedAt + MAX_RECORD_MS });
    timersRef.current = [
      setTimeout(stopRecording, MAX_RECORD_MS),
      setInterval(sampleFrame, FRAME_SAMPLE_MS),
      setInterval(() => setNow(Date.now()), COUNTDOWN_TICK_MS),
    ];
  }

  function stopRecording() {
    clearTimers();
    const recorder = recorderRef.current;
    if (!recorder || recorder.state === "inactive") return;
    sampleFrame();
    recorder.stop();
  }

  async function finishRecording(blob: Blob) {
    clearTimers();
    stopCamera();
    recorderRef.current = null;
    if (!mountedRef.current) return;
    // Never hand back a clip that has no video in it (the recorder failed or stopped instantly).
    if (blob.size === 0) return fail(EMPTY_CLIP_MESSAGE);
    setPhase({ kind: "processing" });
    try {
      let frames = (await Promise.all(framesRef.current)).filter((f): f is Blob => f !== null);
      // Every live grab failing is unlikely, but decoding the clip still gets the frames.
      if (frames.length === 0) frames = await framesFromFile(blob);
      deliver({ blob, mimeType: blob.type, frames: pickEvenly(frames) });
    } catch {
      fail(EMPTY_CLIP_MESSAGE);
    }
  }

  // Native-camera fallback and demo-mode upload: the clip comes from a file, so do its frames.
  async function takeFile(file: File | undefined) {
    if (!file) return;
    attemptRef.current++;
    stopCamera();
    setPhase({ kind: "processing" });
    try {
      deliver({ blob: file, mimeType: file.type, frames: await framesFromFile(file) });
    } catch {
      fail(FILE_ERROR_MESSAGE);
    }
  }

  const secondsLeft = phase.kind === "recording" ? Math.max(0, Math.ceil((phase.endsAt - now) / 1000)) : 0;
  // Stop takes Record's place on screen, so the second tap of a double tap would otherwise land on it.
  const canStop = phase.kind === "recording" && now - phase.startedAt >= MIN_RECORD_MS;
  const busy = phase.kind === "processing" || phase.kind === "done";
  const showCamera = phase.kind === "preview" || phase.kind === "recording";

  return (
    <div className="flex flex-col items-center gap-4">
      <div className={showCamera ? "relative w-full max-w-sm" : "hidden"}>
        <video ref={videoRef} playsInline muted className="aspect-[9/16] w-full rounded-lg bg-black object-contain" />
        {phase.kind === "recording" && (
          <p
            aria-live="polite"
            className="absolute top-3 left-1/2 -translate-x-1/2 rounded-full bg-black/60 px-3 py-1 text-sm font-semibold text-white tabular-nums"
          >
            <span className="mr-2 inline-block h-2 w-2 rounded-full bg-red-500" />
            {secondsLeft}s left
          </p>
        )}
      </div>

      {inPage && (phase.kind === "idle" || phase.kind === "error") && (
        <button onClick={openCamera} className="rounded-lg bg-[#157A47] px-4 py-2 font-semibold text-white">
          {phase.kind === "error" ? "Try the camera again" : "Open camera"}
        </button>
      )}
      {phase.kind === "preview" && (
        <button onClick={startRecording} className="rounded-full bg-red-600 px-6 py-3 font-semibold text-white">
          Record
        </button>
      )}
      {phase.kind === "recording" && (
        <button
          onClick={stopRecording}
          disabled={!canStop}
          className="rounded-full border-2 border-red-600 px-6 py-3 font-semibold text-red-700 disabled:opacity-40"
        >
          Stop
        </button>
      )}
      {phase.kind === "processing" && <p className="text-[#4A5A6E]">Preparing your clip…</p>}
      {phase.kind === "error" && (
        <p role="alert" className="text-center text-[#8A1C1C]">
          {phase.message}
        </p>
      )}

      {/* The phone's own camera app, when in-page recording isn't available. Size and length can't be capped. */}
      {(!inPage || phase.kind === "error") && !busy && (
        <label className="cursor-pointer rounded-lg border px-4 py-2 font-semibold">
          Record with the camera app
          <input
            type="file"
            accept="video/*"
            capture="environment"
            className="sr-only"
            onChange={(e) => takeFile(e.target.files?.[0])}
          />
        </label>
      )}
      {/* Demo mode (§6.1.1): play a pre-filmed clip through the same flow. */}
      {demo && !busy && phase.kind !== "recording" && (
        <label className="cursor-pointer rounded-lg border px-4 py-2 font-semibold">
          Upload clip
          <input type="file" accept="video/*" className="sr-only" onChange={(e) => takeFile(e.target.files?.[0])} />
        </label>
      )}
    </div>
  );
}
