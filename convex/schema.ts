import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

// Placeholder so `npx convex dev` has something to push (US1).
// US5 replaces this file with the full schema (reports, meToos, residents,
// fixers, fixAttempts); nothing else should depend on this table.
export default defineSchema({
  placeholder: defineTable({
    label: v.string(),
    count: v.number(),
  }),
  videoIntake: defineTable({
    storageId: v.id("_storage"),
    fileName: v.string(),
    contentType: v.string(),
    fileSize: v.number(),
    status: v.union(
      v.literal("uploaded"),
      v.literal("transcribing"),
      v.literal("complete"),
      v.literal("failed"),
    ),
    transcript: v.optional(v.string()),
    segments: v.optional(
      v.array(
        v.object({
          start: v.number(),
          end: v.number(),
          text: v.string(),
        }),
      ),
    ),
    error: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_created_at", ["createdAt"]),
});
