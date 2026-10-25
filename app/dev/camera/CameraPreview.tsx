"use client";

import { useEffect, useRef, useState } from "react";

type State = { kind: "idle" } | { kind: "live"; label: string } | { kind: "error"; message: string };

function describeError(err: unknown): string {
  if (!window.isSecureContext) return "This page isn't on HTTPS, so the browser blocks the camera.";
  if (err instanceof DOMException) {
    if (err.name === "NotAllowedError") return "Camera permission was denied. Allow it in the browser's site settings.";
    if (err.name === "NotFoundError") return "No camera found on this device.";
    if (err.name === "NotReadableError") return "The camera is in use by another app.";
    return `${err.name}: ${err.message}`;
  }
  return String(err);
}

export default function CameraPreview() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const startingRef = useRef(false);
  const mountedRef = useRef(true);
  const [state, setState] = useState<State>({ kind: "idle" });

  function stop() {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }

  // Release the camera when the page unmounts.
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      stop();
    };
  }, []);

  async function start() {
    // A double tap would otherwise open two streams.
    if (startingRef.current) return;
    startingRef.current = true;
    stop();
    try {
      let stream: MediaStream;
      try {
        if (!navigator.mediaDevices?.getUserMedia) throw new Error("getUserMedia unavailable");
        // getUserMedia is called from the tap handler: iOS Safari only prompts on a user gesture.
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" } },
          audio: false,
        });
      } catch (err) {
        setState({ kind: "error", message: describeError(err) });
        return;
      }
      if (!mountedRef.current) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }
      streamRef.current = stream;
      try {
        const video = videoRef.current!;
        video.srcObject = stream;
        await video.play();
      } catch (err) {
        stop();
        const reason = err instanceof DOMException ? err.name : String(err);
        setState({ kind: "error", message: `The camera opened but the preview didn't start (${reason}).` });
        return;
      }
      const track = stream.getVideoTracks()[0];
      setState({ kind: "live", label: `${track.label || "camera"} (${track.getSettings().facingMode ?? "unknown"} facing)` });
    } finally {
      startingRef.current = false;
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-4 p-6">
      <h1 className="text-2xl font-bold">Camera check</h1>
      <video
        ref={videoRef}
        playsInline
        muted
        className={state.kind === "live" ? "w-full rounded-lg bg-black" : "hidden"}
      />
      {state.kind === "idle" && (
        <button onClick={start} className="rounded-lg bg-green-700 px-4 py-2 font-semibold text-white">
          Open rear camera
        </button>
      )}
      {state.kind === "live" && <p className="text-sm text-gray-600">Live: {state.label}</p>}
      {state.kind === "error" && (
        <>
          <p className="text-center text-red-700">{state.message}</p>
          <button onClick={start} className="rounded-lg border px-4 py-2 font-semibold">
            Try again
          </button>
        </>
      )}
    </main>
  );
}
