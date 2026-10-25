"use client";

import { useQuery } from "convex/react";
import { useState } from "react";
import { api } from "@/convex/_generated/api";
import type { OwnerReport, PublicReport } from "@/convex/lib/publicReport";
import { useResidentToken } from "@/lib/hooks/useResidentToken";
import MeReportCard from "./MeReportCard";

type FollowedReport = { createdAt: number; report: PublicReport };

export default function MePage() {
  const token = useResidentToken();
  const reports = useQuery(api.me.myReports, token ? { token } : "skip");
  const meToos = useQuery(api.me.myMeToos, token ? { token } : "skip");
  const [now] = useState(() => Date.now());

  return (
    <main className="flex flex-col gap-8 p-5">
      <header>
        <h1 className="text-2xl font-extrabold text-[#17212B]">Me</h1>
        <p className="mt-1 text-sm text-[#46505C]">Your posts and the problems you follow are private to this device.</p>
      </header>
      {(!token || reports === undefined || meToos === undefined) && (
        <p role="status" className="text-sm text-[#46505C]">Loading your reports…</p>
      )}
      {token && reports !== undefined && meToos !== undefined && (
        <>
          <ReportSection title="My posts" empty="You haven't posted a problem yet." reports={reports} now={now} />
          <MeTooSection reports={meToos} now={now} />
        </>
      )}
    </main>
  );
}

function ReportSection({
  title,
  empty,
  reports,
  now,
}: {
  title: string;
  empty: string;
  reports: OwnerReport[];
  now: number;
}) {
  return (
    <section aria-label={title}>
      <h2 className="mb-3 text-lg font-extrabold text-[#17212B]">{title}</h2>
      {reports.length === 0 ? (
        <p className="rounded-xl bg-white p-4 text-sm text-[#46505C]">{empty}</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {reports.map((report) => (
            <li key={report._id}>
              <MeReportCard report={report} now={now} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function MeTooSection({ reports, now }: { reports: FollowedReport[]; now: number }) {
  return (
    <section aria-label="My me-toos">
      <h2 className="mb-3 text-lg font-extrabold text-[#17212B]">My me-toos</h2>
      {reports.length === 0 ? (
        <p className="rounded-xl bg-white p-4 text-sm text-[#46505C]">You haven&apos;t followed a problem yet.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {reports.map(({ report }) => (
            <li key={report._id}>
              <MeReportCard report={report} now={now} isMeToo />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
