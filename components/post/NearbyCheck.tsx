"use client";

import { ConvexError } from "convex/values";
import { useMutation } from "convex/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import type { PublicReport } from "@/convex/lib/publicReport";
import { daysLabel, daysOpen } from "@/lib/days";

export type NearbyReport = {
  report: PublicReport;
  distanceMeters: number;
  isMine: boolean;
};

export default function NearbyCheck({
  reports,
  token,
  now,
  onContinue,
}: {
  reports: NearbyReport[];
  token: string;
  now: number;
  onContinue: () => void;
}) {
  const meToo = useMutation(api.meToos.meToo);
  const router = useRouter();
  const [pendingReportId, setPendingReportId] = useState<Id<"reports"> | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function addMeToo(reportId: Id<"reports">) {
    if (pendingReportId) return;
    setPendingReportId(reportId);
    setError(null);
    try {
      await meToo({ token, reportId });
      router.push(`/?report=${reportId}`);
    } catch (err) {
      setError(err instanceof ConvexError && typeof err.data === "string" ? err.data : "Couldn't add your me-too. Try again.");
    } finally {
      setPendingReportId(null);
    }
  }

  return (
    <main className="flex flex-col gap-4 p-6">
      <div>
        <h1 className="text-2xl font-extrabold">Is it one of these?</h1>
        <p className="mt-1 text-sm text-[#4A5A6E]">There are open reports within 50 m of your location.</p>
      </div>
      <ul className="flex flex-col gap-3">
        {reports.map(({ report, distanceMeters, isMine }) => (
          <li key={report._id} className="flex items-center gap-3 rounded-xl border border-[#E2E6EA] bg-white p-3">
            <Thumbnail url={report.frameUrls[0] ?? null} title={report.title ?? "Nearby report"} />
            <div className="min-w-0 flex-1">
              <p className="truncate font-bold">{report.title ?? "Untitled report"}</p>
              {report.street && <p className="truncate text-xs text-[#46505C]">{report.street}</p>}
              <p className="mt-1 text-xs text-[#46505C]">
                {daysLabel(daysOpen(report.createdAt, now))} open · {Math.round(distanceMeters)} m away
              </p>
            </div>
            {isMine ? (
              <span className="shrink-0 text-xs font-semibold text-[#46505C]">Your report</span>
            ) : (
              <button
                type="button"
                onClick={() => void addMeToo(report._id)}
                disabled={pendingReportId !== null}
                className="shrink-0 rounded-lg bg-[#157A47] px-3 py-2 text-sm font-bold text-white disabled:opacity-50"
              >
                {pendingReportId === report._id ? "Adding…" : "Me too"}
              </button>
            )}
          </li>
        ))}
      </ul>
      {error && <p role="alert" className="text-sm text-[#8A1C1C]">{error}</p>}
      <button
        type="button"
        onClick={onContinue}
        className="rounded-lg border border-[#C9D3DE] px-4 py-3 font-semibold text-[#17212B]"
      >
        No, it&apos;s new
      </button>
    </main>
  );
}

function Thumbnail({ url, title }: { url: string | null; title: string }) {
  if (!url) return <div aria-hidden="true" className="size-16 shrink-0 rounded-lg bg-[#E2E6EA]" />;
  // Convex storage URLs are not configured for next/image.
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={url} alt="" title={title} className="size-16 shrink-0 rounded-lg object-cover" />;
}
