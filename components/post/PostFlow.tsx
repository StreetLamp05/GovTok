"use client";

import { useMutation } from "convex/react";
import { ConvexError } from "convex/values";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import CameraCapture from "@/components/capture/CameraCapture";
import type { RecordedClip } from "@/lib/hooks/useClipRecorder";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { MAX_CLIP_BYTES } from "@/convex/lib/clipLimit";
import { CLIP_TOO_BIG, MAX_DESCRIPTION_LENGTH } from "@/convex/lib/postLimits";
import type { LatLng } from "@/lib/demo";
import { useCurrentLocation, type LocationState } from "@/lib/hooks/useCurrentLocation";
import { getResidentToken } from "@/lib/hooks/useResidentToken";
import { uploadFile } from "@/lib/upload";
import CheckingScreen from "./CheckingScreen";

// Posting (§4.1.1): location → full-screen camera (video or photos) → preview + optional description → Submit → Checking….
// Each file is uploaded to Convex storage, then createReport saves the report as pending.

// What's being posted, with object URLs for the preview and the location it was captured at.
type Draft =
  | { kind: "video"; clip: RecordedClip; clipUrl: string; posterUrl?: string; point: LatLng | null }
  | { kind: "photos"; photos: Blob[]; photoUrls: string[]; point: LatLng | null };
type Mode = Draft["kind"];

const SUBMIT_ERROR = "We couldn't send your post. Check your connection and try again.";
const HINTS = {
  video: "Film the problem for up to 20 seconds. Say what's wrong if you like.",
  // Re-encoding strips each photo's GPS, so the pin is the phone's location now (§4.1.1).
  photos: "Up to 10 photos. Your post is pinned to where you are now, so post from where the problem is.",
};

export default function PostFlow() {
  const router = useRouter();
  const location = useCurrentLocation();
  const createReport = useMutation(api.posts.createReport);
  const [mode, setMode] = useState<Mode>("video");
  const [draft, setDraft] = useState<Draft | null>(null);
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reportId, setReportId] = useState<Id<"reports"> | null>(null);

  // Revoke the preview URLs when the draft is replaced or the page unmounts.
  useEffect(() => {
    if (!draft) return;
    return () => {
      if (draft.kind === "photos") return draft.photoUrls.forEach((url) => URL.revokeObjectURL(url));
      URL.revokeObjectURL(draft.clipUrl);
      if (draft.posterUrl) URL.revokeObjectURL(draft.posterUrl);
    };
  }, [draft]);

  // Back to the recorder or photo picker, keeping the description.
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
    // So Record again comes back to the same mode.
    setMode("video");
    setDraft({
      kind: "video",
      clip,
      clipUrl: URL.createObjectURL(clip.blob),
      posterUrl: clip.frames[0] ? URL.createObjectURL(clip.frames[0]) : undefined,
      // Capture only shows once there's a fix, so this is set in practice.
      point: location.status === "ready" ? location.point : null,
    });
    // A more accurate fix while they type. If it fails, the fix from filming is used.
    location.refresh();
  }

  function picked(photos: Blob[]) {
    setMode("photos");
    setDraft({
      kind: "photos",
      photos,
      photoUrls: photos.map((photo) => URL.createObjectURL(photo)),
      point: location.status === "ready" ? location.point : null,
    });
    location.refresh();
  }

  const point = location.status === "ready" ? location.point : (draft?.point ?? null);

  async function submit() {
    if (!draft || submitting || !point) return;
    // Checked before uploading, so an oversized camera-app file fails fast instead of after a long upload.
    if (draft.kind === "video" && draft.clip.blob.size > MAX_CLIP_BYTES) {
      setError(CLIP_TOO_BIG);
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const { lat, lng } = point;
      const report = { token: getResidentToken(), description: description.trim() || undefined, lat, lng };
      let id: Id<"reports">;
      if (draft.kind === "photos") {
        // A slideshow's photos go where a video's frames would (§2.1.1), and there's no clip.
        const frameStorageIds = await Promise.all(draft.photos.map((photo) => uploadFile(photo)));
        id = await createReport({ ...report, mediaType: "photos", frameStorageIds });
      } else {
        const [clipStorageId, frameStorageIds] = await Promise.all([
          uploadFile(draft.clip.blob),
          Promise.all(draft.clip.frames.map((frame) => uploadFile(frame))),
        ]);
        id = await createReport({ ...report, mediaType: "video", clipStorageId, frameStorageIds });
      }
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
    return (
      <CameraCapture
        modes={["video", "photos"]}
        initialMode={mode}
        hints={HINTS}
        onVideo={captured}
        onPhotos={picked}
        onClose={() => router.push("/")}
      />
    );
  }

  return (
    <main className="flex flex-col gap-4 p-6">
      <h1 className="text-2xl font-extrabold">Check your post</h1>
      {draft.kind === "video" ? (
        <video
          src={draft.clipUrl}
          poster={draft.posterUrl}
          controls
          playsInline
          className="mx-auto aspect-[9/16] w-full max-w-sm rounded-lg bg-black object-contain"
        />
      ) : (
        // Swipes sideways through the photos, the way the feed shows a slideshow (§5.1.1).
        <div className="mx-auto flex aspect-[9/16] w-full max-w-sm snap-x snap-mandatory overflow-x-auto rounded-lg bg-black">
          {draft.photoUrls.map((url, i) => (
            // Local object URLs, so not next/image.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={url}
              src={url}
              alt={`Photo ${i + 1} of ${draft.photoUrls.length}`}
              className="h-full w-full shrink-0 snap-center object-contain"
            />
          ))}
        </div>
      )}
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
          {draft.kind === "video" ? "Record again" : "Pick again"}
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
