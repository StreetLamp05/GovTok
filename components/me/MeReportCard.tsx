"use client";

import Link from "next/link";
import { useState } from "react";
import type { OwnerReport, PublicReport } from "@/convex/lib/publicReport";
import { daysLabel, daysOpen } from "@/lib/days";
import { SCREENING_FAILED_REASON } from "@/convex/lib/screening";
import { Retake, ScreeningFailed } from "@/components/post/CheckingScreen";

type Report = OwnerReport | PublicReport;

export default function MeReportCard({ report, token }: { report: Report; token: string | null }) {
  const [now] = useState(() => Date.now());
  const fixed = report.status === "fixed";
  const mine =
    "verdict" in report || "reason" in report || "screeningError" in report || "screeningRetries" in report;
  const href = report.status === "open" || fixed ? `/?report=${report._id}` : null;
  const status = statusLabel(report);
  const activityAt = fixed && report.fixedAt !== undefined ? report.fixedAt : report.createdAt;
  const age = daysOpen(activityAt, now);
  const activityText = fixed ? "Resolved" : "Posted";

  return (
    <article className="overflow-hidden rounded-[18px] border border-[#E7E6DE] bg-[#FFFEFA] shadow-[0_2px_8px_rgba(24,56,47,0.045)]">
      <div className="flex gap-3 p-3.5">
        <Thumbnail url={report.frameUrls[0] ?? null} title={report.title ?? "Report"} />
        <div className="min-w-0 flex-1 py-0.5">
          <div className="mb-1.5 flex items-center gap-1.5">
            <span className={`size-1.5 rounded-full ${status.color}`} />
            <span className={`text-[10px] font-bold uppercase tracking-[0.09em] ${status.textColor}`}>{status.label}</span>
          </div>
          <h3 className="line-clamp-2 text-[15px] font-semibold leading-snug tracking-[-0.015em] text-[#1C342D]">
            {report.title ?? "Neighborhood report"}
          </h3>
          {report.street && <p className="mt-1 truncate text-xs text-[#748079]">{report.street}</p>}
          <p className="mt-1.5 text-[11px] text-[#87918B]">
            {age === 0 ? `${activityText} today` : `${activityText} ${daysLabel(age)} ago`}
          </p>
        </div>
        {href && (
          <Link
            href={href}
            aria-label={fixed ? "View resolved report" : "View report"}
            className="flex size-8 shrink-0 items-center justify-center self-center rounded-full text-[#728078] transition-colors hover:bg-[#EEF0E8] focus-visible:outline-2 focus-visible:outline-[#173F35]"
          >
            <ChevronIcon />
          </Link>
        )}
      </div>

      {fixed && (
        <div className="flex items-center justify-between gap-3 border-t border-[#EAEAE1] bg-[#F5F7EF] px-4 py-2.5">
          <span className="text-xs font-medium text-[#48634F]">
            {report.fixedByLabel ? `Fixed by ${report.fixedByLabel}` : "This report has been resolved"}
          </span>
          <Link href={href!} className="shrink-0 text-xs font-semibold text-[#245446] hover:underline">
            Watch the fix
          </Link>
        </div>
      )}

      {mine && report.status === "held" && report.reason !== SCREENING_FAILED_REASON && report.verdict === "retake" && (
        <div className="border-t border-[#EAEAE1] px-3.5 py-3">
          <Retake token={token} report={report} />
        </div>
      )}
      {mine && report.status === "held" && report.reason === SCREENING_FAILED_REASON && (
        <div className="border-t border-[#EAEAE1] px-3.5 py-3">
          <ScreeningFailed token={token} report={report} />
        </div>
      )}
      {mine && report.status === "held" && report.verdict === "emergency" && (
        <div className="border-t border-[#EAEAE1] bg-[#FFF5F2] px-4 py-3">
          <p className="text-sm text-[#743226]">{report.reason ?? "If someone is in immediate danger, call 911."}</p>
          <a href="tel:911" className="mt-2 inline-flex min-h-10 items-center rounded-xl bg-[#A33F2B] px-4 text-sm font-semibold text-white">
            Call 911
          </a>
        </div>
      )}
      {mine &&
        report.status === "held" &&
        report.verdict !== "retake" &&
        report.verdict !== "emergency" &&
        report.reason !== SCREENING_FAILED_REASON && (
        <div className="border-t border-[#EAEAE1] bg-[#FBF6E9] px-4 py-3">
          <p className="text-sm font-medium text-[#66552B]">This post wasn&apos;t published.</p>
          {report.reason && <p className="mt-1 text-sm leading-relaxed text-[#776A4B]">{report.reason}</p>}
        </div>
      )}
    </article>
  );
}

function Thumbnail({ url, title }: { url: string | null; title: string }) {
  return (
    <div className="relative size-[76px] shrink-0 overflow-hidden rounded-[13px] bg-[#E7E9E0]">
      {url ? (
        // Convex storage URLs are not configured for next/image.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt="" title={title} className="h-full w-full object-cover" />
      ) : (
        <div className="flex h-full items-center justify-center text-[#87938B]" aria-hidden="true">
          <ReportIcon />
        </div>
      )}
    </div>
  );
}

function statusLabel(report: Report) {
  if (report.status === "pending") {
    return { label: "Checking", color: "bg-[#D49B35]", textColor: "text-[#866021]" };
  }
  if (report.status === "held") {
    if ("verdict" in report && report.verdict === "emergency") {
      return { label: "Emergency", color: "bg-[#B54A36]", textColor: "text-[#A13D2C]" };
    }
    if ("reason" in report && report.reason === "screening_failed") {
      return { label: "Check failed", color: "bg-[#B88338]", textColor: "text-[#8E632A]" };
    }
    if ("verdict" in report && report.verdict === "retake") {
      return { label: "Retake requested", color: "bg-[#B88338]", textColor: "text-[#8E632A]" };
    }
    return { label: "Not published", color: "bg-[#84705C]", textColor: "text-[#75614F]" };
  }
  if (report.status === "fixed") {
    return { label: "Resolved", color: "bg-[#4B7951]", textColor: "text-[#426B48]" };
  }
  return { label: "In progress", color: "bg-[#B88338]", textColor: "text-[#8E632A]" };
}

function ChevronIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m9 18 6-6-6-6" />
    </svg>
  );
}

function ReportIcon() {
  return (
    <svg width="29" height="29" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z" />
      <circle cx="12" cy="9.5" r="2.5" />
    </svg>
  );
}
