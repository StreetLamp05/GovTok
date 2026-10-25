import { v } from "convex/values";
import { query } from "./_generated/server";
import { publicReport, publicReportOrNull } from "./lib/publicReport";

// No pagination at hackathon scale (§5.1.2).
export const FEED_SIZE = 50;

// The feed (§5.1.2): open and fixed reports only, most recent activity first, through the
// public projection (§7.1.1). The client snapshots the order when the feed mounts.
export const feed = query({
  args: {},
  handler: async (ctx) => {
    const reports = await ctx.db
      .query("reports")
      .withIndex("by_lastActivity")
      .order("desc")
      .filter((q) => q.or(q.eq(q.field("status"), "open"), q.eq(q.field("status"), "fixed")))
      .take(FEED_SIZE);
    return await Promise.all(reports.map((report) => publicReport(ctx, report)));
  },
});

// Deep links (`/?report=<id>`): null unless the report is open or fixed. The id comes from
// the URL, so a malformed one returns null instead of throwing.
export const reportById = query({
  args: { id: v.string() },
  handler: async (ctx, { id }) => {
    const reportId = ctx.db.normalizeId("reports", id);
    return await publicReportOrNull(ctx, reportId ? await ctx.db.get(reportId) : null);
  },
});
