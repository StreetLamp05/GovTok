"use client";

import { useEffect, useRef, useState } from "react";
import { MAX_PHOTOS } from "@/convex/lib/postLimits";
import { isHeic, keepPhotos, photoToJpeg } from "@/lib/media/photos";

// Photo mode for posts (§4.1.1): pick 1–10 photos from the camera or gallery. Each comes back
// as an upright JPEG, 1280 px or less on the long edge, with its EXIF (and GPS) stripped.
// Photos the browser can't read are left out, with a note.

type Props = { onDone: (jpegs: Blob[]) => void };

type Phase =
  | { kind: "idle" }
  | { kind: "preparing" }
  | { kind: "ready"; jpegs: Blob[]; urls: string[]; cut: number; unreadable: number; heic: boolean }
  | { kind: "error"; message: string };

const HEIC_HINT = "This browser can't open HEIC photos. Try JPEGs.";

export default function PhotoPicker({ onDone }: Props) {
  const [phase, setPhase] = useState<Phase>({ kind: "idle" });
  // Bumped on each pick and on unmount, so a slow conversion can't land after a newer one.
  const attemptRef = useRef(0);

  // Revoke the thumbnails when the pick is replaced or the picker unmounts.
  useEffect(() => {
    if (phase.kind !== "ready") return;
    return () => phase.urls.forEach((url) => URL.revokeObjectURL(url));
  }, [phase]);

  useEffect(() => () => void attemptRef.current++, []);

  async function pick(list: FileList | null) {
    const { kept, cut } = keepPhotos(Array.from(list ?? []));
    if (!kept.length) return;
    const attempt = ++attemptRef.current;
    setPhase({ kind: "preparing" });
    // One at a time: full-size phone photos decoded together can run an iPhone out of memory.
    const jpegs: Blob[] = [];
    let heic = false;
    for (const file of kept) {
      try {
        jpegs.push(await photoToJpeg(file));
      } catch {
        heic ||= isHeic(file);
      }
    }
    if (attempt !== attemptRef.current) return;
    if (!jpegs.length) {
      const message = heic ? HEIC_HINT : "We couldn't read those photos. Try different ones.";
      return setPhase({ kind: "error", message });
    }
    const urls = jpegs.map((jpeg) => URL.createObjectURL(jpeg));
    setPhase({ kind: "ready", jpegs, urls, cut, unreadable: kept.length - jpegs.length, heic });
  }

  const count = phase.kind === "ready" ? phase.jpegs.length : 0;

  return (
    <div className="flex flex-col items-center gap-4">
      {phase.kind === "ready" && (
        <ul className="grid w-full max-w-sm grid-cols-3 gap-2">
          {phase.urls.map((url, i) => (
            <li key={url}>
              {/* Local object URLs, so not next/image. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt={`Photo ${i + 1} of ${count}`} className="aspect-square w-full rounded-lg object-cover" />
            </li>
          ))}
        </ul>
      )}
      {phase.kind === "ready" && (phase.cut > 0 || phase.unreadable > 0) && (
        <div role="status" className="flex flex-col gap-1 text-center text-[#4A5A6E]">
          {phase.cut > 0 && (
            <p>
              A post can have up to {MAX_PHOTOS} photos, so we kept the first {MAX_PHOTOS} and left out {phase.cut}.
            </p>
          )}
          {phase.unreadable > 0 && (
            <p>
              {phase.unreadable === 1 ? "1 photo couldn't be read and was" : `${phase.unreadable} photos couldn't be read and were`}{" "}
              left out.{phase.heic && ` ${HEIC_HINT}`}
            </p>
          )}
        </div>
      )}
      {phase.kind === "preparing" && <p className="text-[#4A5A6E]">Preparing your photos…</p>}
      {phase.kind === "error" && (
        <p role="alert" className="text-center text-[#8A1C1C]">
          {phase.message}
        </p>
      )}

      {phase.kind !== "preparing" && (
        <label
          className={
            count
              ? "cursor-pointer rounded-lg border px-4 py-2 font-semibold"
              : "cursor-pointer rounded-lg bg-[#157A47] px-4 py-2 font-semibold text-white"
          }
        >
          {count ? "Choose again" : `Choose up to ${MAX_PHOTOS} photos`}
          {/* No `capture`, so the phone offers both the camera and the photo library. */}
          <input
            type="file"
            accept="image/*"
            multiple
            className="sr-only"
            onChange={(e) => {
              void pick(e.target.files);
              // Cleared so picking the same photos again still fires a change.
              e.target.value = "";
            }}
          />
        </label>
      )}
      <button
        onClick={() => phase.kind === "ready" && onDone(phase.jpegs)}
        disabled={!count}
        className="rounded-lg bg-[#157A47] px-4 py-2 font-semibold text-white disabled:opacity-40"
      >
        Use {count === 1 ? "this photo" : "these photos"}
      </button>
    </div>
  );
}
