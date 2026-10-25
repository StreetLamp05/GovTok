import type { Doc } from "./_generated/dataModel";
import { query } from "./_generated/server";
import { isPublicStatus, PUBLIC_STATUSES, type PublicReport } from "./lib/publicReport";

// The map's live query (§5.2.1). Only the fields a marker needs, so the map doesn't pay
// for storage URLs on every report. Like publicReport it's an allowlist: a field added
// to `reports` never shows up here by accident.
// isSample labels seeded reports on the map too, since everything simulated is labeled (§6.1.1).
export type MapReport = Pick<
  PublicReport,
  "_id" | "lat" | "lng" | "status" | "meTooCount" | "title" | "category" | "isSample"
>;

// Throws on a pending or held report, like publicReport, so a future read path that
// forgets its status filter fails loudly instead of putting a held report on the map.
export function toMapReport(report: Doc<"reports">): MapReport {
  const status = report.status;
  if (!isPublicStatus(status)) {
    throw new Error(`toMapReport: report ${report._id} is ${status}, not public`);
  }
  return {
    _id: report._id,
    lat: report.lat,
    lng: report.lng,
    status,
    meTooCount: report.meTooCount,
    title: report.title,
    category: report.category,
    isSample: report.isSample,
  };
}

// Open and fixed reports only (§2.1.3). No bounding box yet: all of Mableton fits in one
// query at pilot scale (§1.1.1).
export const mapReports = query({
  args: {},
  handler: async (ctx): Promise<MapReport[]> => {
    const byStatus = await Promise.all(
      PUBLIC_STATUSES.map((status) =>
        ctx.db
          .query("reports")
          .withIndex("by_status_lat", (q) => q.eq("status", status))
          .collect(),
      ),
    );
    return byStatus.flat().map(toMapReport);
  },
});
