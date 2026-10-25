"use client";

import { useEffect, useState } from "react";
import VideoRecorder, { type RecordedClip } from "@/components/capture/VideoRecorder";
import { hasAudioTrack } from "./hasAudioTrack";
import { DEMO_VALUE } from "@/lib/demo";

type Result = { clip: RecordedClip; clipUrl: string; frameUrls: string[] };
type VideoInfo = { width: number; height: number; duration: number };

const MB = 1024 * 1024;

export default function RecorderLab() {
  const [audio, setAudio] = useState(true);
  const [autoOpen, setAutoOpen] = useState(false);
  const [run, setRun] = useState(0);
  const [result, setResult] = useState<Result | null>(null);
  const [audioTrack, setAudioTrack] = useState<boolean | null>(null);
  const [info, setInfo] = useState<VideoInfo | null>(null);

  // Revoke the previous clip's object URLs when it's replaced or the page unmounts.
  useEffect(() => {
    if (!result) return;
    return () => {
      URL.revokeObjectURL(result.clipUrl);
      result.frameUrls.forEach((u) => URL.revokeObjectURL(u));
    };
  }, [result]);

  function reset({ nextAudio = audio, nextAutoOpen = autoOpen } = {}) {
    setAudio(nextAudio);
    setAutoOpen(nextAutoOpen);
    setResult(null);
    setAudioTrack(null);
    setInfo(null);
    setRun((n) => n + 1);
  }

  async function handleDone(clip: RecordedClip) {
    setResult({
      clip,
      clipUrl: URL.createObjectURL(clip.blob),
      frameUrls: clip.frames.map((f) => URL.createObjectURL(f)),
    });
    setAudioTrack(await hasAudioTrack(clip.blob).catch(() => null));
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col gap-4 p-6">
      <h1 className="text-2xl font-bold">Recorder check</h1>
      <fieldset className="flex gap-4">
        <legend className="mb-1 text-sm text-[#4A5A6E]">Audio (post: on, fix: off)</legend>
        {[true, false].map((value) => (
          <label key={String(value)} className="flex items-center gap-2">
            <input type="radio" name="audio" checked={audio === value} onChange={() => reset({ nextAudio: value })} />
            {value ? "Audio on" : "Audio off"}
          </label>
        ))}
      </fieldset>
      <label className="flex items-center gap-2">
        <input type="checkbox" checked={autoOpen} onChange={(e) => reset({ nextAutoOpen: e.target.checked })} />
        Open the camera without a tap (<code>autoOpen</code>)
      </label>
      <p className="text-sm text-[#4A5A6E]">
        Add <code>?demo={DEMO_VALUE}</code> to the URL for the Upload clip button.
      </p>

      {!result && <VideoRecorder key={run} audio={audio} autoOpen={autoOpen} onDone={handleDone} />}

      {result && (
        <section className="flex flex-col gap-3">
          <video
            src={result.clipUrl}
            poster={result.frameUrls[0]}
            controls
            playsInline
            className="w-full rounded-lg bg-black"
            onLoadedMetadata={(e) => {
              const v = e.currentTarget;
              setInfo({ width: v.videoWidth, height: v.videoHeight, duration: v.duration });
            }}
          />
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
            <dt className="font-semibold">Requested audio</dt>
            <dd>{audio ? "on" : "off"}</dd>
            <dt className="font-semibold">Audio track</dt>
            <dd data-testid="audio-track">
              {audioTrack === null ? "checking…" : audioTrack ? "yes" : "no"}
            </dd>
            <dt className="font-semibold">Type</dt>
            <dd className="break-all">{result.clip.mimeType || "(none)"}</dd>
            <dt className="font-semibold">File size</dt>
            <dd>{(result.clip.blob.size / MB).toFixed(2)} MB</dd>
            <dt className="font-semibold">Video</dt>
            <dd>
              {info
                ? `${info.width}×${info.height}, ${
                    Number.isFinite(info.duration) ? `${info.duration.toFixed(1)} s` : "duration unknown"
                  }`
                : "…"}
            </dd>
            <dt className="font-semibold">Frames</dt>
            <dd>{result.clip.frames.length}</dd>
          </dl>
          <ol className="grid grid-cols-3 gap-2">
            {result.frameUrls.map((url, i) => (
              <li key={url} className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element -- local object URLs */}
                <img src={url} alt={`Frame ${i}`} className="w-full rounded bg-black object-contain" />
                <span className="absolute top-1 left-1 rounded bg-black/60 px-1 text-xs text-white">
                  {i === 0 ? "0 · poster" : i}
                </span>
              </li>
            ))}
          </ol>
          <button onClick={() => reset()} className="rounded-lg bg-[#157A47] px-4 py-2 font-semibold text-white">
            Record again
          </button>
        </section>
      )}
    </main>
  );
}
