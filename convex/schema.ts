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
});
