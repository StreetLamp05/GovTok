import { ConvexError, v } from "convex/values";
import { mutation } from "./_generated/server";
import { getOrCreateResident } from "./lib/auth";

export const meToo = mutation({
  args: { token: v.string(), reportId: v.id("reports") },
  handler: async (ctx, { token, reportId }) => {
    const residentId = await getOrCreateResident(ctx, token);
    const report = await ctx.db.get(reportId);
    if (!report) throw new ConvexError("Report not found");
    if (report.status !== "open") throw new ConvexError("You can only me-too an open report");
    if (report.residentId === residentId) return { added: false };

    const existing = await ctx.db
      .query("meToos")
      .withIndex("by_report_resident", (q) => q.eq("reportId", reportId).eq("residentId", residentId))
      .unique();
    if (existing) return { added: false };

    const now = Math.max(Date.now(), report.lastActivityAt + 1);
    await ctx.db.insert("meToos", { reportId, residentId, createdAt: now });
    await ctx.db.patch(reportId, {
      meTooCount: report.meTooCount + 1,
      lastActivityAt: now,
    });
    return { added: true };
  },
});
