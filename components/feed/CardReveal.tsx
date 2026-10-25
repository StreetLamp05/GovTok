"use client";

import RevealPlayer, { useRecordRevealView } from "@/components/RevealPlayer";
import type { FeedSlotProps } from "./FeedCard";

// The before/after reveal on fixed cards (§5.1.1). `video` is the pooled element playing the
// original (null for slideshows); RevealPlayer takes it over with `video.loop = false`, so the
// pool never restarts it on a tap during the stamp or the fix clip. The fix clip plays in
// RevealPlayer's own always-muted <video> at z-[2], loaded only when `near`. The pool resets
// loop when it gives the element to another card.
export default function CardReveal(props: FeedSlotProps) {
  return props.report.status === "fixed" ? <FixedReveal {...props} /> : null;
}

// The first stamp per report per session records a reveal view (§6.2.1).
function FixedReveal({ report, active, near, video }: FeedSlotProps) {
  const record = useRecordRevealView();
  return <RevealPlayer report={report} active={active} near={near} video={video} onStamp={() => record(report._id)} />;
}
