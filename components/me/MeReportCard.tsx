import Link from "next/link";
import type { OwnerReport, PublicReport } from "@/convex/lib/publicReport";

type Props = {
  report: OwnerReport | PublicReport;
  now: number;
  isMeToo?: boolean;
};

export function reportStatusText(report: OwnerReport | PublicReport, now: number): string {
  if (report.status === "pending") return "Checking…";
  if (report.status === "held") {
    if (report.verdict === "emergency") return "Emergency";
    if (report.verdict === "retake") return "Retake needed";
    if (report.verdict === "reject") return "Not posted";
    if (report.reason === "screening failed") return "Screening failed";
    return "Not posted";
  }
  if (report.status === "fixed") {
    const days = Math.max(0, Math.floor(((report.fixedAt ?? now) - report.createdAt) / 86_400_000));
    return `Fixed in ${days} ${days === 1 ? "day" : "days"}`;
  }
  const days = Math.max(0, Math.floor((now - report.createdAt) / 86_400_000));
  return `Open · ${days} ${days === 1 ? "day" : "days"}`;
}

export default function MeReportCard({ report, now, isMeToo = false }: Props) {
  const fixed = report.status === "fixed";
  const held = report.status === "held" ? report : null;
  const publicReport = report.status === "open" || fixed;
  const status = reportStatusText(report, now);
  const reason = held?.reason;

  return (
    <article
      aria-label={report.title ?? "Your report"}
      data-status={report.status}
      className={`rounded-2xl border bg-white p-4 shadow-sm ${
        fixed ? "border-[#157A47] ring-2 ring-[#157A47]/20" : "border-[#E2E6EA]"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="truncate font-bold text-[#17212B]">{report.title ?? "Your report"}</h2>
          {report.street && <p className="mt-1 truncate text-sm text-[#46505C]">{report.street}</p>}
        </div>
        <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-bold ${fixed ? "bg-[#E7F5EC] text-[#12643A]" : "bg-[#F1F3F5] text-[#364152]"}`}>
          {status}
        </span>
      </div>

      {report.status === "open" && (
        <p className="mt-2 text-sm text-[#46505C]">
          {isMeToo ? "You me-too'd this" : report.audioMuted ? "Audio muted for privacy" : "Posted"} ·{" "}
          {report.meTooCount} me-too{report.meTooCount === 1 ? "" : "s"}
        </p>
      )}
      {fixed && <p className="mt-2 text-sm font-semibold text-[#157A47]">This report has been fixed.</p>}
      {held && reason && <p className="mt-2 text-sm text-[#46505C]">{reason}</p>}
      {held?.verdict === "emergency" && (
        <a href="tel:911" className="mt-3 inline-flex rounded-lg bg-[#B42318] px-4 py-2 font-bold text-white">
          Call 911
        </a>
      )}
      {held?.verdict === "retake" && (
        <button
          type="button"
          disabled
          title="Retake will be available when the recording flow is connected."
          className="mt-3 rounded-lg bg-[#E2E6EA] px-4 py-2 text-sm font-bold text-[#46505C]"
        >
          Retake
        </button>
      )}
      {held?.reason === "screening failed" && (
        <button
          type="button"
          disabled
          title="Try again will be available when screening retry is connected."
          className="mt-3 rounded-lg bg-[#E2E6EA] px-4 py-2 text-sm font-bold text-[#46505C]"
        >
          Try again
        </button>
      )}
      {publicReport && (
        <Link href={`/?report=${report._id}`} className="mt-3 inline-flex font-semibold text-[#157A47] underline">
          View report
        </Link>
      )}
      {fixed && <p className="sr-only">Fixed report</p>}
    </article>
  );
}
