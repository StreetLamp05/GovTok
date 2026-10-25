import { v } from "convex/values";
import { query } from "./_generated/server";
import { findResident } from "./lib/auth";
import { ownerReport, publicReportOrNull } from "./lib/publicReport";

// The private Me page (§5.4.1). Reports and me-toos are intentionally complete lists:
// residents need to see every item they submitted, including posts still being screened.
export const summary = query({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    const residentId = await findResident(ctx, token);
    if (!residentId) {
      return { reports: [], meToos: [], stats: { reports: 0, meToos: 0, resolved: 0 } };
    }

    const [reportDocs, meTooDocs] = await Promise.all([
      ctx.db
        .query("reports")
        .withIndex("by_resident", (q) => q.eq("residentId", residentId))
        .collect(),
      ctx.db
        .query("meToos")
        .withIndex("by_resident", (q) => q.eq("residentId", residentId))
        .collect(),
    ]);

    reportDocs.sort((a, b) => b.createdAt - a.createdAt || b._creationTime - a._creationTime);
    meTooDocs.sort((a, b) => b.createdAt - a.createdAt || b._creationTime - a._creationTime);

    const [reports, meTooReports] = await Promise.all([
      Promise.all(reportDocs.map((report) => ownerReport(ctx, report, residentId))),
      Promise.all(
        meTooDocs.map(async ({ reportId }) => publicReportOrNull(ctx, await ctx.db.get(reportId))),
      ),
    ]);
    const meToos = meTooReports.filter((report) => report !== null);

    return {
      reports,
      meToos,
      stats: {
        reports: reports.length,
        meToos: meToos.length,
        resolved: reports.filter((report) => report.status === "fixed").length,
      },
    };
  },
});
