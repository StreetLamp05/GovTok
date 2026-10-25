import Feed from "@/components/feed/Feed";

// `/?report=<id>` opens with that card first. Keyed by it, so following a new deep link (or
// tapping Feed to go back to `/`) remounts the feed and re-sorts it (§5.1.2).
export default async function FeedPage({ searchParams }: { searchParams: Promise<{ report?: string | string[] }> }) {
  const { report } = await searchParams;
  const firstId = Array.isArray(report) ? report[0] : report;
  return <Feed key={firstId ?? ""} firstId={firstId} />;
}
