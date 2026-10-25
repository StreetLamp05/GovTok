import { v } from "convex/values";
import { mutation } from "./_generated/server";

// Views per fix reveal (§6.2.1): +1 when a card's FIXED stamp first plays. The client calls it
// once per report per session (recordRevealViewOnce in components/RevealPlayer.tsx), not on
// every loop. No-op unless the report is fixed. It doesn't bump lastActivityAt, so a reveal
// being watched never reorders the feed (§5.1.2). No token: anyone could inflate it, which is
// acceptable for a demo counter.
export const recordRevealView = mutation({
  args: { reportId: v.id("reports") },
  handler: async (ctx, { reportId }) => {
    const report = await ctx.db.get(reportId);
    if (report?.status !== "fixed") return;
    await ctx.db.patch(reportId, { revealViews: report.revealViews + 1 });
  },
});
