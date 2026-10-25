"use client";

import { useQuery } from "convex/react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { OwnerChip } from "@/components/fix/FixerList";
import { api } from "@/convex/_generated/api";
import type { PublicReport } from "@/convex/lib/publicReport";
import { daysLabel, daysOpen } from "@/lib/days";
import { useSoundUnlocked } from "@/lib/hooks/sound";
import { useFixerToken } from "@/lib/hooks/useFixerToken";

// Report detail for a fixer (§5.3.1): watch the original, then Record fix. A report that's
// fixed while open here stays on screen as fixed, so US23's result isn't replaced.
export default function FixReportPage() {
  const { reportId } = useParams<{ reportId: string }>();
  const token = useFixerToken();
  const session = useQuery(api.fixers.fixerSession, token ? { fixerToken: token } : "skip");
  // Skipped until the token checks out, since the query throws on a bad one.
  const report = useQuery(api.fixers.fixerReport, token && session ? { fixerToken: token, reportId } : "skip");

  if (token === undefined) return null;
  if (!token || session === null) return <Message text="Sign in to see this report." />;
  if (report === undefined) return <Message text="Loading…" back={false} />;
  if (report === null) return <Message text="This report doesn't exist." />;

  return (
    <main className="mx-auto min-h-dvh max-w-md p-4">
      <BackLink />
      <Original report={report} />
      <h1 className="mt-4 text-xl font-extrabold">{report.title ?? "Untitled report"}</h1>
      {report.street && <p className="text-sm text-[#46505C]">{report.street}</p>}
      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-[#46505C]">
        <OwnerChip report={report} />
        <StatusText report={report} />
        <span>· {report.meTooCount} me too</span>
      </div>
      {report.status === "open" ? (
        // US23 wires this to the fix capture screen (50 m geofence, silent clip, Claude check).
        <button
          type="button"
          disabled
          className="mt-6 w-full rounded-xl bg-[#0F1E33] py-3 font-bold text-white disabled:opacity-40"
        >
          Record fix
        </button>
      ) : (
        <p className="mt-6 rounded-xl bg-[#E3F5F2] py-3 text-center font-bold text-[#0F5E56]">
          Fixed{report.fixedByLabel ? ` by ${report.fixedByLabel}` : ""}
        </p>
      )}
    </main>
  );
}

function Original({ report }: { report: PublicReport }) {
  const soundUnlocked = useSoundUnlocked();
  if (report.mediaType === "video" && report.clipUrl) {
    return (
      <video
        src={report.clipUrl}
        poster={report.frameUrls[0] ?? undefined}
        autoPlay
        loop
        playsInline
        controls
        muted={report.audioMuted || !soundUnlocked}
        className="aspect-[9/16] w-full rounded-2xl bg-black object-contain"
      />
    );
  }
  const photos = report.frameUrls.filter((url): url is string => url !== null);
  return (
    <div className="flex aspect-[9/16] w-full snap-x snap-mandatory overflow-x-auto rounded-2xl bg-black">
      {photos.map((url) => (
        // Convex storage URLs, so next/image's remote config doesn't apply.
        // eslint-disable-next-line @next/next/no-img-element
        <img key={url} src={url} alt="" className="h-full w-full shrink-0 snap-center object-contain" />
      ))}
    </div>
  );
}

function StatusText({ report }: { report: PublicReport }) {
  const [now] = useState(() => Date.now());
  return report.status === "open" ? (
    <span>Open · {daysLabel(daysOpen(report.createdAt, now))}</span>
  ) : (
    <span>Fixed in {daysLabel(daysOpen(report.createdAt, report.fixedAt ?? now))}</span>
  );
}

function BackLink() {
  return (
    <Link href="/fix" className="mb-3 inline-block text-sm font-semibold text-[#46505C]">
      ← All open reports
    </Link>
  );
}

function Message({ text, back = true }: { text: string; back?: boolean }) {
  return (
    <main className="mx-auto min-h-dvh max-w-md p-4">
      {back && <BackLink />}
      <p className="py-12 text-center text-sm text-[#46505C]">{text}</p>
    </main>
  );
}
