"use node";

import { v } from "convex/values";
import { internalAction } from "./_generated/server";

// Stub (US5) so fix cards can schedule verification before the pipeline lands.
// US22 replaces the body, never the signature. Its mutations go in fixVerificationDb.ts,
// because a "use node" file can only contain actions.
export const verifyFix = internalAction({
  // `attempt` counts tries: omitted or 0 is the first, and a retry reschedules with attempt + 1.
  args: { attemptId: v.id("fixAttempts"), attempt: v.optional(v.number()) },
  handler: async (_ctx, { attemptId, attempt = 0 }) => {
    console.log(`verifyFix stub: would check fix attempt ${attemptId} (attempt ${attempt})`);
  },
});
