"use node";

import { v } from "convex/values";
import { internalAction } from "./_generated/server";

// Stub (US5) so posting cards can schedule screening before the pipeline lands.
// US13 replaces the body, never the signature. Its mutations go in screeningDb.ts,
// because a "use node" file can only contain actions.
export const screenReport = internalAction({
  // `attempt` counts tries: omitted or 0 is the first, and a retry reschedules with attempt + 1 (§4.2.1).
  args: { reportId: v.id("reports"), attempt: v.optional(v.number()) },
  handler: async (_ctx, { reportId, attempt = 0 }) => {
    console.log(`screenReport stub: would screen report ${reportId} (attempt ${attempt})`);
  },
});
