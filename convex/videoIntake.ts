import { v } from "convex/values";
import { action, internalMutation, internalQuery, mutation, query } from "./_generated/server";
import { internal } from "./_generated/api";
import { transcribe } from "./lib/transcribe";
import { validateVideoMetadata } from "./lib/videoIntakeValidation";

function cleanError(error: unknown): string {
  return (error instanceof Error ? error.message : String(error)).slice(0, 1000);
}

export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => await ctx.storage.generateUploadUrl(),
});

export const saveUpload = mutation({
  args: {
    storageId: v.id("_storage"),
    fileName: v.string(),
    contentType: v.string(),
    fileSize: v.number(),
  },
  handler: async (ctx, args) => {
    const contentType = validateVideoMetadata(args.contentType, args.fileSize);

    const now = Date.now();
    return await ctx.db.insert("videoIntake", {
      storageId: args.storageId,
      fileName: args.fileName.trim().slice(0, 255) || `video.${contentType === "video/mp4" ? "mp4" : "webm"}`,
      contentType,
      fileSize: args.fileSize,
      status: "uploaded",
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const get = query({
  args: { id: v.id("videoIntake") },
  handler: async (ctx, args) => await ctx.db.get(args.id),
});

export const listRecent = query({
  args: {},
  handler: async (ctx) => await ctx.db.query("videoIntake").withIndex("by_created_at").order("desc").take(20),
});

export const getForTranscription = internalQuery({
  args: { id: v.id("videoIntake") },
  handler: async (ctx, args) => await ctx.db.get(args.id),
});

export const claimForTranscription = internalMutation({
  args: { id: v.id("videoIntake") },
  handler: async (ctx, args) => {
    const entry = await ctx.db.get(args.id);
    if (!entry || (entry.status !== "uploaded" && entry.status !== "failed")) return null;

    await ctx.db.patch(args.id, {
      status: "transcribing",
      error: undefined,
      updatedAt: Date.now(),
    });
    return entry;
  },
});

export const saveTranscript = internalMutation({
  args: {
    id: v.id("videoIntake"),
    transcript: v.string(),
    segments: v.array(v.object({ start: v.number(), end: v.number(), text: v.string() })),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, {
      status: "complete",
      transcript: args.transcript,
      segments: args.segments,
      error: undefined,
      updatedAt: Date.now(),
    });
  },
});

export const saveFailure = internalMutation({
  args: { id: v.id("videoIntake"), error: v.string() },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, {
      status: "failed",
      error: args.error,
      updatedAt: Date.now(),
    });
  },
});

export const transcribeVideo = action({
  args: { id: v.id("videoIntake") },
  handler: async (ctx, args) => {
    const entry = await ctx.runMutation(internal.videoIntake.claimForTranscription, { id: args.id });
    if (!entry) throw new Error("This video is missing or is already being transcribed.");

    try {
      const blob = await ctx.storage.get(entry.storageId);
      if (!blob) throw new Error("The uploaded video could not be found in Convex storage.");

      const result = await transcribe(blob, entry.contentType, entry.fileName);
      await ctx.runMutation(internal.videoIntake.saveTranscript, {
        id: args.id,
        transcript: result.text,
        segments: result.segments,
      });
      return result;
    } catch (error) {
      await ctx.runMutation(internal.videoIntake.saveFailure, {
        id: args.id,
        error: cleanError(error),
      });
      throw error;
    }
  },
});
