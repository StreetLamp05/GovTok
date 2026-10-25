"use client";

import { useAction, useMutation, useQuery } from "convex/react";
import { useState, type ChangeEvent, type FormEvent } from "react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

const MAX_FILE_SIZE = 25 * 1024 * 1024;

export default function VideoIntakePage() {
  const [file, setFile] = useState<File | null>(null);
  const [recordId, setRecordId] = useState<Id<"videoIntake"> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [working, setWorking] = useState(false);
  const generateUploadUrl = useMutation(api.videoIntake.generateUploadUrl);
  const saveUpload = useMutation(api.videoIntake.saveUpload);
  const transcribeVideo = useAction(api.videoIntake.transcribeVideo);
  const entry = useQuery(api.videoIntake.get, recordId ? { id: recordId } : "skip");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!file) return;

    setWorking(true);
    setError(null);
    setRecordId(null);

    try {
      const contentType = file.type.split(";")[0].trim().toLowerCase();
      if (contentType !== "video/mp4" && contentType !== "video/webm") {
        throw new Error("Choose an MP4 or WebM video.");
      }
      if (file.size === 0 || file.size > MAX_FILE_SIZE) {
        throw new Error("Choose a video larger than 0 bytes and no larger than 25 MB.");
      }

      const uploadUrl = await generateUploadUrl();
      const uploadResponse = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      });
      if (!uploadResponse.ok) {
        throw new Error(`Convex upload failed (${uploadResponse.status}): ${await uploadResponse.text()}`);
      }

      const { storageId } = (await uploadResponse.json()) as { storageId: Id<"_storage"> };
      const id = await saveUpload({
        storageId,
        fileName: file.name,
        contentType,
        fileSize: file.size,
      });
      setRecordId(id);
      await transcribeVideo({ id });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setWorking(false);
    }
  }

  function selectFile(event: ChangeEvent<HTMLInputElement>) {
    setFile(event.currentTarget.files?.[0] ?? null);
    setError(null);
    setRecordId(null);
  }

  return (
    <main className="mx-auto flex max-w-xl flex-col gap-6 p-6">
      <header>
        <h1 className="text-2xl font-extrabold">Video intake test</h1>
        <p className="mt-2 text-sm text-[#4A5A6E]">
          Upload an MP4 or WebM video up to 25 MB. Convex stores it, then Groq Whisper transcribes it.
        </p>
      </header>

      <form onSubmit={submit} className="flex flex-col gap-4 rounded-xl border border-[#D8DEE6] bg-white p-5">
        <label className="flex flex-col gap-2 text-sm font-semibold">
          Video file
          <input
            type="file"
            accept="video/mp4,video/webm"
            onChange={selectFile}
            disabled={working}
            className="text-sm font-normal"
          />
        </label>
        {file && <p className="text-sm text-[#4A5A6E]">{file.name} ({(file.size / 1024 / 1024).toFixed(1)} MB)</p>}
        <button
          type="submit"
          disabled={!file || working}
          className="rounded-lg bg-[#157A47] px-4 py-3 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          {working ? "Uploading and transcribing…" : "Upload and transcribe"}
        </button>
      </form>

      {error && (
        <p role="alert" className="rounded-lg border border-[#F5C2C0] bg-[#FDECEC] p-4 text-sm text-[#8A1C1C]">
          {error}
        </p>
      )}

      {recordId && (
        <section aria-live="polite" className="flex flex-col gap-3 rounded-xl border border-[#D8DEE6] bg-white p-5">
          <h2 className="font-bold">Convex intake result</h2>
          <p className="text-sm">Status: {entry?.status ?? "saving"}</p>
          {entry?.transcript !== undefined && <p className="whitespace-pre-wrap">{entry.transcript || "(No speech detected)"}</p>}
          {entry?.segments && entry.segments.length > 0 && (
            <ul className="flex flex-col gap-2 text-sm text-[#4A5A6E]">
              {entry.segments.map((segment, index) => (
                <li key={`${segment.start}-${index}`}>
                  {segment.start.toFixed(1)}s–{segment.end.toFixed(1)}s: {segment.text}
                </li>
              ))}
            </ul>
          )}
          {entry?.error && <p role="alert" className="text-sm text-[#8A1C1C]">{entry.error}</p>}
        </section>
      )}
    </main>
  );
}
