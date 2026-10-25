"use client";

import { useQuery } from "convex/react";
import Link from "next/link";
import { api } from "@/convex/_generated/api";
import type { OwnerReport, PublicReport } from "@/convex/lib/publicReport";
import { useResidentToken } from "@/lib/hooks/useResidentToken";
import MeReportCard from "./MeReportCard";

export default function MePage() {
  const token = useResidentToken();
  const summary = useQuery(api.me.summary, token ? { token } : "skip");

  return (
    <main className="min-h-dvh bg-[#F4F1E8] pb-24">
      <header className="relative overflow-hidden rounded-b-[30px] bg-[#173F35] px-6 pb-8 pt-9 text-center text-white">
        <div aria-hidden="true" className="absolute -right-14 -top-16 size-48 rounded-full bg-white/[0.035]" />
        <div
          aria-hidden="true"
          className="relative mx-auto flex size-[84px] items-center justify-center rounded-full bg-[#DDF56B] text-[#173F35]"
        >
          <ProfileIcon />
        </div>
        <p className="mt-5 text-[11px] font-bold uppercase tracking-[0.18em] text-white/65">Your neighborhood</p>
        <h1 className="mt-1 text-[25px] font-semibold tracking-[-0.035em]">Your profile</h1>
        <p className="mt-2 text-sm text-white/75">Helping make the neighborhood better.</p>
        <p className="mt-4 inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/[0.06] px-3 py-1.5 text-[11px] font-medium text-white/75">
          <LockIcon />
          Private to this device
        </p>
      </header>

      <section aria-label="Your impact" className="grid grid-cols-3 border-b border-[#E3E2D8] bg-[#F8F6EF] px-2 py-6">
        <Stat label="Reports" value={summary?.stats.reports} />
        <Stat label="Me-toos" value={summary?.stats.meToos} divider />
        <Stat label="Resolved" value={summary?.stats.resolved} divider />
      </section>

      <div className="space-y-8 px-4 pt-7">
        <ActivitySection
          title="Your requests"
          count={summary?.reports.length}
          loading={summary === undefined}
          empty={summary?.reports.length === 0}
          emptyTitle="Your first report starts here"
          emptyDescription="Share a neighborhood issue and follow its progress from this page."
          reports={summary?.reports}
          token={token}
        />
        <ActivitySection
          title="Problems you supported"
          count={summary?.meToos.length}
          loading={summary === undefined}
          empty={summary?.meToos.length === 0}
          emptyTitle="No me-toos yet"
          emptyDescription="When you join an open report, it will show up here."
          reports={summary?.meToos}
          token={null}
        />
      </div>
    </main>
  );
}

function Stat({ label, value, divider = false }: { label: string; value: number | undefined; divider?: boolean }) {
  return (
    <div className={`px-1 text-center ${divider ? "border-l border-[#E3E2D8]" : ""}`}>
      <p className="text-[29px] font-semibold leading-none tracking-[-0.04em] text-[#173F35] tabular-nums">
        {value ?? <span className="inline-block h-7 w-7 animate-pulse rounded bg-[#E5E4DA] align-middle" />}
      </p>
      <p className="mt-2.5 text-xs font-medium text-[#68756F]">{label}</p>
    </div>
  );
}

function ActivitySection({
  title,
  count,
  loading,
  empty,
  emptyTitle,
  emptyDescription,
  reports,
  token,
}: {
  title: string;
  count: number | undefined;
  loading: boolean;
  empty: boolean | undefined;
  emptyTitle: string;
  emptyDescription: string;
  reports: OwnerReport[] | PublicReport[] | undefined;
  token: string | null;
}) {
  const headingId = title.replace(/\s+/g, "-").toLowerCase();

  return (
    <section aria-labelledby={headingId}>
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <h2 id={headingId} className="text-[18px] font-semibold tracking-[-0.025em] text-[#18382F]">
          {title}
        </h2>
        {count !== undefined && <span className="text-xs font-medium text-[#77837D]">{count}</span>}
      </div>

      {loading ? (
        <div aria-label={`Loading ${title.toLowerCase()}`} aria-busy="true" className="space-y-3">
          <div className="h-[116px] animate-pulse rounded-[18px] bg-[#E9E8DF]" />
          <div className="h-[116px] animate-pulse rounded-[18px] bg-[#E9E8DF]" />
        </div>
      ) : empty ? (
        <div className="rounded-[18px] border border-dashed border-[#D5D9CF] bg-[#F8F6EF] px-5 py-6 text-center">
          <p className="font-semibold text-[#263E35]">{emptyTitle}</p>
          <p className="mx-auto mt-1.5 max-w-xs text-sm leading-relaxed text-[#6C7872]">{emptyDescription}</p>
          {token && (
            <Link
              href="/post"
              className="mt-4 inline-flex min-h-10 items-center justify-center rounded-xl bg-[#173F35] px-4 text-sm font-semibold text-white transition-colors hover:bg-[#245446] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#173F35]"
            >
              Post a problem
            </Link>
          )}
        </div>
      ) : (
        <ul className="space-y-3">
          {reports?.map((report) => (
            <li key={report._id}>
              <MeReportCard report={report} token={token} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function ProfileIcon() {
  return (
    <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="3.5" />
      <path d="M5 20c.7-3.3 3.1-5 7-5s6.3 1.7 7 5" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="4" y="10" width="16" height="11" rx="2" />
      <path d="M8 10V7a4 4 0 0 1 8 0v3" />
    </svg>
  );
}
