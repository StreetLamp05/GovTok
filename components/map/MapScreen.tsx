"use client";

import { useQuery } from "convex/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { api } from "../../convex/_generated/api";
import { useDemoMode } from "../../lib/hooks/useDemoMode";
import { clusterCount, MIXED_COLOR, STATUS_COLOR, type MapStatus } from "./counts";
import ReportsMap from "./ReportsMap";

// The Map tab (§5.2.1), after the map screen in spec/UI_mockups. City leadership uses
// this same map; there's no separate dashboard.
type Filter = "all" | MapStatus;

export default function MapScreen() {
  const reports = useQuery(api.map.mapReports);
  const router = useRouter();
  const focusId = useSearchParams().get("report");
  const demo = useDemoMode();
  const [filter, setFilter] = useState<Filter>("all");

  const all = reports ?? [];
  const visible = filter === "all" ? all : all.filter((r) => r.status === filter);
  const openN = all.filter((r) => r.status === "open").length;
  const fixedN = all.length - openN;

  const filters: [Filter, string][] = [
    ["all", "All"],
    ["open", `Open · ${openN}`],
    ["fixed", `Fixed · ${fixedN}`],
  ];

  return (
    // Fixed between the demo banner (26px, when shown) and the tab bar, so map gestures
    // never scroll the page.
    <main className={`fixed inset-x-0 bottom-16 mx-auto max-w-md ${demo ? "top-[26px]" : "top-0"}`}>
      {/* Push, not replace, so Back from the feed returns here (§5.2.1). */}
      <ReportsMap reports={visible} focusId={focusId} onOpen={(id) => router.push(`/?report=${id}`)} />

      <div className="absolute inset-x-3 top-3 flex flex-col gap-2.5 rounded-2xl bg-white py-3 pr-3 pl-3.5 shadow-[0_4px_18px_rgba(15,30,51,.16)]">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h1 className="text-base font-extrabold text-[#0F1E33]">Problems in Mableton</h1>
            <p className="mt-0.5 text-xs font-medium text-[#4A5A6E]">
              {reports === undefined
                ? "Loading…"
                : `${openN} open · ${fixedN} fixed · ${clusterCount(all)} people reporting`}
            </p>
          </div>
          <span className="inline-flex items-center gap-[5px] rounded-full bg-[#E3F4EA] px-2 py-1 text-[11px] font-extrabold text-[#14653A]">
            <span className="h-[7px] w-[7px] animate-pulse rounded-full bg-[#157A47]" />
            Live
          </span>
        </div>
        <div role="group" aria-label="Filter by status" className="flex gap-[3px] rounded-[11px] bg-[#EEF1F4] p-[3px]">
          {filters.map(([key, label]) => (
            <button
              key={key}
              type="button"
              aria-pressed={filter === key}
              onClick={() => setFilter(key)}
              className={`h-[34px] flex-1 rounded-[9px] text-[13px] font-bold ${
                filter === key ? "bg-white text-[#0F1E33] shadow-[0_1px_3px_rgba(0,0,0,.14)]" : "text-[#4A5A6E]"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Above Google's logo, which has to stay visible. */}
      <div
        role="group"
        aria-label="Legend"
        className="absolute bottom-9 left-3 flex flex-col gap-[5px] rounded-xl bg-white px-3 py-[9px] text-xs font-semibold text-[#33445A] shadow-[0_2px_10px_rgba(15,30,51,.16)]"
      >
        <div className="flex items-center gap-3">
          {LEGEND.map(([label, color]) => (
            <span key={label} className="inline-flex items-center gap-[5px]">
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: color }} />
              {label}
            </span>
          ))}
        </div>
        <div className="font-medium text-[#4A5A6E]">Number = original post + me-toos</div>
      </div>
    </main>
  );
}

const LEGEND: [string, string][] = [
  ["Open", STATUS_COLOR.open],
  ["Fixed", STATUS_COLOR.fixed],
  ["Mixed", MIXED_COLOR],
];
