import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { query } from "./_generated/server";
import { findResident } from "./lib/auth";

// Enough for a feed window; caps the reads one call can make.
const MAX_REPORT_IDS = 50;

// The caller's relation to some reports, for the card's Me too button (§5.1.1): which of them
// they posted and which they already me-too'd. Only ever the caller's own ids, keyed by their
// token, so it never reveals who posted or me-too'd anything else (§7.1.1).
export const myRelation = query({
  args: { token: v.string(), reportIds: v.array(v.id("reports")) },
  handler: async (ctx, { token, reportIds }) => {
    const mine: Id<"reports">[] = [];
    const meTooed: Id<"reports">[] = [];
    const residentId = await findResident(ctx, token);
    if (!residentId) return { mine, meTooed };

    for (const reportId of [...new Set(reportIds)].slice(0, MAX_REPORT_IDS)) {
      const report = await ctx.db.get(reportId);
      if (report?.residentId === residentId) mine.push(reportId);
      const meToo = await ctx.db
        .query("meToos")
        .withIndex("by_report_resident", (q) => q.eq("reportId", reportId).eq("residentId", residentId))
        .unique();
      if (meToo) meTooed.push(reportId);
    }
    return { mine, meTooed };
  },
});
