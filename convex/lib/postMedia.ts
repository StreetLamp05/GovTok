import { ConvexError } from "convex/values";
import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";
import { MAX_CLIP_BYTES } from "./clipLimit";
import { CLIP_TOO_BIG, MAX_PHOTOS, MAX_VIDEO_FRAMES } from "./postLimits";

// A post's media (§4.1.1), checked the same way for a new post (createReport) and a retake
// (retakeReport, §4.2.1): a video is a clip plus 1–6 frames, a slideshow is 1–10 photos and no clip.
export async function checkPostMedia(
  ctx: MutationCtx,
  {
    mediaType,
    clipStorageId,
    frameStorageIds: frames,
  }: { mediaType: Doc<"reports">["mediaType"]; clipStorageId?: Id<"_storage">; frameStorageIds: Id<"_storage">[] },
) {
  if (mediaType === "video") {
    if (!clipStorageId) throw new ConvexError("A video post needs its clip.");
    if (frames.length < 1 || frames.length > MAX_VIDEO_FRAMES) {
      throw new ConvexError(`A video post needs 1 to ${MAX_VIDEO_FRAMES} frames.`);
    }
    const clipSize = await storedSize(ctx, clipStorageId, "video");
    if (clipSize > MAX_CLIP_BYTES) throw new ConvexError(CLIP_TOO_BIG);
  } else {
    if (clipStorageId) throw new ConvexError("A photo post can't have a clip.");
    if (frames.length < 1 || frames.length > MAX_PHOTOS) {
      throw new ConvexError(`A photo post needs 1 to ${MAX_PHOTOS} photos.`);
    }
  }
  await Promise.all(frames.map((id) => storedSize(ctx, id, "image")));
}

// Throws unless the upload exists and is the right kind of file. An upload sent without a
// Content-Type has no type to check, so only a wrong type is refused.
async function storedSize(ctx: MutationCtx, id: Id<"_storage">, kind: "video" | "image"): Promise<number> {
  const file = await ctx.db.system.get(id);
  if (!file) throw new ConvexError("An uploaded file is missing. Try posting again.");
  if (file.contentType && !file.contentType.startsWith(`${kind}/`)) {
    throw new ConvexError(kind === "video" ? "The clip isn't a video file." : "A photo or frame isn't an image file.");
  }
  return file.size;
}
