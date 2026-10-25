"use client";

import { useMutation } from "convex/react";
import { ConvexError } from "convex/values";
import { useEffect, useState } from "react";
import VideoRecorder, { type RecordedClip } from "@/components/capture/VideoRecorder";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { MAX_CLIP_BYTES } from "@/convex/lib/clipLimit";
import { CLIP_TOO_BIG, MAX_DESCRIPTION_LENGTH } from "@/convex/lib/postLimits";
import type { LatLng } from "@/lib/demo";
import { useCurrentLocation, type LocationState } from "@/lib/hooks/useCurrentLocation";
import { getResidentToken } from "@/lib/hooks/useResidentToken";
import { uploadFile } from "@/lib/upload";
import CheckingScreen from "./CheckingScreen";

// Posting (§4.1.1): location → capture → preview + optional description → Submit → Checking….
// Each file is uploaded to Convex storage, then createReport saves the report as pending.

// What's being posted, with object URLs for the preview and the location it was filmed at.
// US9 adds a `{ kind: "photos" }` draft; createReport already takes both.
type Draft = { kind: "video"; clip: RecordedClip; clipUrl: string; posterUrl?: string; point: LatLng | null };

const SUBMIT_ERROR = "We couldn't send your post. Check your connection and try again.";

export default function PostFlow() {
  const location = useCurrentLocation();
  const createReport = useMutation(api.posts.createReport);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reportId, setReportId] = useState<Id<"reports"> | null>(null);

  // Revoke the preview URLs when the draft is replaced or the page unmounts.
  useEffect(() => {
    if (!draft) return;
    return () => {
      URL.revokeObjectURL(draft.clipUrl);
      if (draft.posterUrl) URL.revokeObjectURL(draft.posterUrl);
    };
  }, [draft]);

  // Back to the recorder, keeping the description.
  function recordAgain() {
    setDraft(null);
    setError(null);
  }

  function startOver() {
    recordAgain();
    setDescription("");
    setReportId(null);
  }

  function captured(clip: RecordedClip) {
    setDraft({
      kind: "video",
      clip,
      clipUrl: URL.createObjectURL(clip.blob),
      posterUrl: clip.frames[0] ? URL.createObjectURL(clip.frames[0]) : undefined,
      // The recorder only shows once there's a fix, so this is set in practice.
      point: location.status === "ready" ? location.point : null,
    });
    // A more accurate fix while they type. If it fails, the fix from filming is used.
    location.refresh();
  }

  const point = location.status === "ready" ? location.point : (draft?.point ?? null);

  async function submit() {
    if (!draft || submitting || !point) return;
    // Checked before uploading, so an oversized camera-app file fails fast instead of after a long upload.
    if (draft.clip.blob.size > MAX_CLIP_BYTES) {
      setError(CLIP_TOO_BIG);
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const { lat, lng } = point;
      const [clipStorageId, frameStorageIds] = await Promise.all([
        uploadFile(draft.clip.blob),
        Promise.all(draft.clip.frames.map((frame) => uploadFile(frame))),
      ]);
      const id = await createReport({
        token: getResidentToken(),
        mediaType: "video",
        clipStorageId,
        frameStorageIds,
        description: description.trim() || undefined,
        lat,
        lng,
      });
      setReportId(id);
    } catch (err) {
      setError(err instanceof ConvexError && typeof err.data === "string" ? err.data : SUBMIT_ERROR);
    } finally {
      setSubmitting(false);
    }
  }

  if (reportId) return <CheckingScreen reportId={reportId} onPostAnother={startOver} />;

  if (!draft) {
    if (location.status !== "ready") return <LocationGate location={location} />;
    // US10: the duplicate check ("Is it one of these?", §4.1.2) goes here, before the camera opens.
    // US9: the Video / Photos choice goes here; photos skip the recorder.
    return (
      <main className="flex flex-col gap-4 p-6">
        <h1 className="text-2xl font-extrabold">Post a problem</h1>
        <p className="text-[#4A5A6E]">Film the problem for up to 20 seconds. Say what&apos;s wrong if you like.</p>
        <VideoRecorder audio autoOpen onDone={captured} />
      </main>
    );
  }

  return (
    <main className="flex flex-col gap-4 p-6">
      <h1 className="text-2xl font-extrabold">Check your post</h1>
      <video
        src={draft.clipUrl}
        poster={draft.posterUrl}
        controls
        playsInline
        className="mx-auto aspect-[9/16] w-full max-w-sm rounded-lg bg-black object-contain"
      />
      <label className="flex flex-col gap-1">
        <span className="font-semibold">
          Description <span className="font-normal text-[#4A5A6E]">(optional)</span>
        </span>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          maxLength={MAX_DESCRIPTION_LENGTH}
          rows={3}
          disabled={submitting}
          placeholder="What's wrong, and how long has it been like this?"
          aria-describedby="description-count"
          className="rounded-lg border border-[#C9D3DE] p-3"
        />
        <span id="description-count" aria-live="polite" className="self-end text-sm text-[#4A5A6E] tabular-nums">
          {description.length}/{MAX_DESCRIPTION_LENGTH}
        </span>
      </label>
      {error && (
        <p role="alert" className="text-[#8A1C1C]">
          {error}
        </p>
      )}
      <div className="flex gap-3">
        <button
          onClick={recordAgain}
          disabled={submitting}
          className="flex-1 rounded-lg border px-4 py-3 font-semibold disabled:opacity-40"
        >
          Record again
        </button>
        <button
          onClick={submit}
          disabled={submitting || !point}
          className="flex-1 rounded-lg bg-[#157A47] px-4 py-3 font-semibold text-white disabled:opacity-40"
        >
          {submitting ? "Sending…" : "Submit"}
        </button>
      </div>
    </main>
  );
}

// Reports are pinned to where they were filmed, so posting waits for a location (§7.1.1).
function LocationGate({ location }: { location: LocationState & { refresh: () => void } }) {
  return (
    <main className="flex flex-col gap-4 p-6">
      <h1 className="text-2xl font-extrabold">Post a problem</h1>
      {location.status === "loading" ? (
        <p className="text-[#4A5A6E]">Finding your location…</p>
      ) : (
        <div role="alert" className="rounded-lg border border-[#F5C2C0] bg-[#FDECEC] p-4 text-[#8A1C1C]">
          <p className="font-bold">
            {location.status === "denied" ? "Location is turned off for GovTok" : "We couldn't find your location"}
          </p>
          <p className="mt-1 text-sm">
            {location.status === "denied"
              ? "Reports are pinned to where they were filmed. Allow location for this site in your browser settings, then try again."
              : "Make sure location services are on and you have a clear view of the sky, then try again."}
          </p>
          <button
            onClick={location.refresh}
            className="mt-3 rounded-lg bg-[#157A47] px-4 py-2 text-sm font-semibold text-white"
          >
            Try again
          </button>
        </div>
      )}
    </main>
  );
}
