"use client";

import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api";
import type { Id } from "../convex/_generated/dataModel";
import { getResidentToken } from "./hooks/useResidentToken";
import { normalizeMimeType } from "./media/mimeType";

// Client side of a Convex upload (§1.1.1): generate a URL, POST the blob, return the storage ID.
//
//   const storageId = await uploadFile(blob);                  // as this device's resident
//   const storageId = await uploadFile(blob, { fixerToken });  // as a fixer

let client: ConvexHttpClient | null = null;
const convex = () => (client ??= new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL as string));

export async function uploadFile(blob: Blob, auth?: { fixerToken: string }): Promise<Id<"_storage">> {
  const url = await convex().mutation(
    api.files.generateUploadUrl,
    auth ? { fixerToken: auth.fixerToken } : { token: getResidentToken() },
  );
  const contentType = normalizeMimeType(blob.type);
  const res = await fetch(url, {
    method: "POST",
    headers: contentType ? { "Content-Type": contentType } : undefined,
    body: blob,
  });
  if (!res.ok) throw new Error(`Upload failed (${res.status})`);
  const { storageId } = (await res.json()) as { storageId: Id<"_storage"> };
  return storageId;
}
