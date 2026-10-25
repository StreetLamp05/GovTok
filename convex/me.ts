import { v } from "convex/values";
import { query } from "./_generated/server";
import { findResident } from "./lib/auth";
import { ownerReport, publicReportOrNull, type PublicReport } from "./lib/publicReport";

export const myReports = query({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    const residentId = await findResident(ctx, token);
    if (!residentId) return [];

    const reports = await ctx.db
      .query("reports")
      .withIndex("by_resident", (q) => q.eq("residentId", residentId))
      .collect();
    // Newest post first. Not lastActivityAt, which every me-too bumps.
    reports.sort((a, b) => b.createdAt - a.createdAt);
    return await Promise.all(reports.map((report) => ownerReport(ctx, report, residentId)));
  },
});

export const myMeToos = query({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    const residentId = await findResident(ctx, token);
    if (!residentId) return [];

    const meToos = await ctx.db
      .query("meToos")
      .withIndex("by_resident", (q) => q.eq("residentId", residentId))
      .collect();
    meToos.sort((a, b) => b.createdAt - a.createdAt);

    const followed = await Promise.all(
      meToos.map(async ({ reportId, createdAt }) => ({
        createdAt,
        report: await publicReportOrNull(ctx, await ctx.db.get(reportId)),
      })),
    );
    const publicFollowed: { createdAt: number; report: PublicReport }[] = [];
    for (const entry of followed) {
      if (entry.report) publicFollowed.push({ createdAt: entry.createdAt, report: entry.report });
    }
    return publicFollowed;
  },
});
