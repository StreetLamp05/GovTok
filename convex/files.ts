import { v } from "convex/values";
import { mutation } from "./_generated/server";
import { getOrCreateResident, requireFixer } from "./lib/auth";

// Step one of a Convex upload (§1.1.1): get a URL, POST the file to it, save the storage ID.
// Residents pass their device token (a brand-new device gets its resident row here, so its
// first upload works); fixers pass their fixer token.
export const generateUploadUrl = mutation({
  args: { token: v.optional(v.string()), fixerToken: v.optional(v.string()) },
  handler: async (ctx, { token, fixerToken }) => {
    if (fixerToken !== undefined) {
      await requireFixer(ctx, fixerToken);
    } else {
      await getOrCreateResident(ctx, token ?? "");
    }
    return await ctx.storage.generateUploadUrl();
  },
});
