"use client";

import { useDemoMode } from "@/lib/hooks/useDemoMode";
import { useClipRecorder, type RecordedClip } from "@/lib/hooks/useClipRecorder";

// In-page recorder (§4.1.1): rear camera, about 720p at 1.5 Mbps, stopping by itself at 20 s.
// Used for fixes (audio off, US23), seeding (US25) and the dev pages. Posts use the full-screen
// CameraCapture; both share useClipRecorder.

export type { RecordedClip };

type Props = {
  audio: boolean;
  onDone: (clip: RecordedClip) => void;
  /**
   * Open the camera as soon as the recorder appears, saving a tap ("No, it's new" opens the
   * camera, §4.1.2). If the browser refuses without a tap, the error offers "Try the camera again".
   */
  autoOpen?: boolean;
};

export default function VideoRecorder({ audio, onDone, autoOpen = false }: Props) {
  const { videoRef, phase, inPage, openCamera, startRecording, stopRecording, takeFile, secondsLeft, canStop, busy, showCamera } =
    useClipRecorder({ audio, onDone, autoOpen });
  const demo = useDemoMode();

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
      {phase.kind === "converting" && (
        <p className="text-[#4A5A6E]">Converting your clip… {Math.round(phase.progress * 100)}%</p>
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
