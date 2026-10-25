"use client";

import { useDemoMode } from "@/lib/hooks/useDemoMode";

// Every simulated thing is labeled on screen (§6.1.1).
export default function DemoBanner() {
  if (!useDemoMode()) return null;
  return (
    <div
      role="note"
      className="sticky top-0 z-50 flex h-[26px] items-center justify-center bg-[#FDE68A] text-xs font-bold text-[#713F12]"
    >
      Demo mode: location simulated
    </div>
  );
}
