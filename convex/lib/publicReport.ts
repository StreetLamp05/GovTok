import type { Doc, Id } from "../_generated/dataModel";
import type { QueryCtx } from "../_generated/server";

// The single public projection of a report (§7.1.1). Every public query returns reports
// through this. It's an allowlist, so a field added to `reports` stays private until it's
// added here: residentId, fixedBy, fixedByOrg, verdict and reason are never returned.
// ownerReport is the poster's own view (Me page, Checking… screen, §5.4.1): the same
// fields plus verdict, reason and the screening-failure details, for any status, and only for the poster.

export const PUBLIC_STATUSES = ["open", "fixed"] as const satisfies readonly Doc<"reports">["status"][];
export type PublicStatus = (typeof PUBLIC_STATUSES)[number];

// Only open and fixed reports are public; pending and held never are (§2.1.3).
export function isPublicStatus(status: Doc<"reports">["status"]): status is PublicStatus {
  return (PUBLIC_STATUSES as readonly string[]).includes(status);
}

type ProjectedReport = Pick<
  Doc<"reports">,
  | "_id"
  | "_creationTime"
  | "mediaType"
  | "lat"
  | "lng"
  | "street"
  | "category"
  | "owner"
  | "agency"
  | "title"
  | "status"
  | "audioMuted"
  | "isSample"
  | "meTooCount"
  | "lastActivityAt"
  | "revealViews"
  | "createdAt"
  | "fixedAt"
  | "fixedByKind"
> &
  // Omitted when audioMuted (§4.2.1).
  Partial<Pick<Doc<"reports">, "description" | "transcript" | "segments">> & {
    clipUrl: string | null;
    frameUrls: (string | null)[];
    fixUrl: string | null;
    // The fixer's org, or "neighbor" for a resident (§4.3.2). Undefined until fixed.
    fixedByLabel?: string;
  };

export type PublicReport = Omit<ProjectedReport, "status"> & { status: PublicStatus };
export type OwnerReport = ProjectedReport &
  Pick<Doc<"reports">, "verdict" | "reason" | "screeningError" | "screeningRetries">;

const urlOf = (ctx: QueryCtx, id: Id<"_storage"> | undefined) => (id ? ctx.storage.getUrl(id) : null);

// For a report fetched by ID: null unless it exists and is public.
export async function publicReportOrNull(
  ctx: QueryCtx,
  report: Doc<"reports"> | null,
): Promise<PublicReport | null> {
  return report && isPublicStatus(report.status) ? await publicReport(ctx, report) : null;
}

// Throws on a pending or held report, so a query that forgets its status filter fails
// loudly instead of publishing a held clip.
export async function publicReport(ctx: QueryCtx, report: Doc<"reports">): Promise<PublicReport> {
  const status = report.status;
  if (!isPublicStatus(status)) {
    throw new Error(`publicReport: report ${report._id} is ${status}, not public`);
  }
  return { ...(await project(ctx, report)), status };
}

// Throws unless `residentId` posted the report, so one resident can never read another's
// verdict, reason or held clip. Me-toos aren't the caller's posts: use publicReport for those.
export async function ownerReport(
  ctx: QueryCtx,
  report: Doc<"reports">,
  residentId: Id<"residents">,
): Promise<OwnerReport> {
  if (report.residentId !== residentId) {
    throw new Error(`ownerReport: report ${report._id} isn't this resident's`);
  }
  return {
    ...(await project(ctx, report)),
    verdict: report.verdict,
    reason: report.reason,
    screeningError: report.screeningError,
    screeningRetries: report.screeningRetries,
  };
}

async function project(ctx: QueryCtx, report: Doc<"reports">): Promise<ProjectedReport> {
  const [clipUrl, frameUrls, fixUrl] = await Promise.all([
    urlOf(ctx, report.clipStorageId),
    Promise.all(report.frameStorageIds.map((id) => ctx.storage.getUrl(id))),
    urlOf(ctx, report.fixStorageId),
  ]);

  return {
    _id: report._id,
    _creationTime: report._creationTime,
    mediaType: report.mediaType,
    lat: report.lat,
    lng: report.lng,
    street: report.street,
    category: report.category,
    owner: report.owner,
    agency: report.agency,
    title: report.title,
    status: report.status,
    audioMuted: report.audioMuted,
    isSample: report.isSample,
    meTooCount: report.meTooCount,
    lastActivityAt: report.lastActivityAt,
    revealViews: report.revealViews,
    createdAt: report.createdAt,
    fixedAt: report.fixedAt,
    fixedByKind: report.fixedByKind,
    // Muted reports never return what was said or written (§4.2.1, §7.1.1).
    ...(report.audioMuted
      ? {}
      : { description: report.description, transcript: report.transcript, segments: report.segments }),
    clipUrl,
    frameUrls,
    fixUrl,
    fixedByLabel: await fixedByLabel(ctx, report),
  };
}

// Shown only if a fixer's fix has no org recorded and the fixer row is gone.
export const UNKNOWN_FIXER_LABEL = "a city crew";

async function fixedByLabel(ctx: QueryCtx, report: Doc<"reports">): Promise<string | undefined> {
  if (report.fixedByKind === "resident") return "neighbor";
  if (report.fixedByKind !== "fixer") return undefined;
  if (report.fixedByOrg) return report.fixedByOrg;
  // The org is public (§3.1.2); only the fixer's identity isn't, and that never leaves here.
  const fixer = report.fixedBy ? await ctx.db.get(report.fixedBy as Id<"fixers">) : null;
  return (fixer && "org" in fixer ? fixer.org : undefined) ?? UNKNOWN_FIXER_LABEL;
}
