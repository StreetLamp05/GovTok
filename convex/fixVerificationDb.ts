// Internal mutations for internal.fixVerification.verifyFix (US22). They live here, not in
// fixVerification.ts, because a "use node" file can only contain actions.
import { v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import { internalMutation, type MutationCtx } from "./_generated/server";

// One fix per report (§4.3.1): an attempt is only worth checking while it's `checking` and its
// report is still `open`. Otherwise another fix got there first, or the report is gone, so the
// attempt is marked `superseded`. Returns the pair when the check should go ahead.
async function claim(
  ctx: MutationCtx,
  attemptId: Id<"fixAttempts">,
): Promise<{ attempt: Doc<"fixAttempts">; report: Doc<"reports"> } | null> {
  const attempt = await ctx.db.get(attemptId);
  if (!attempt || attempt.status !== "checking") return null;
  const report = await ctx.db.get(attempt.reportId);
  if (!report || report.status !== "open") {
    await ctx.db.patch(attemptId, { status: "superseded" });
    return null;
  }
  return { attempt, report };
}

// What the action needs to call Claude, or null to stop.
export const beginCheck = internalMutation({
  args: { attemptId: v.id("fixAttempts") },
  handler: async (ctx, { attemptId }) => {
    const claimed = await claim(ctx, attemptId);
    if (!claimed) return null;
    const { attempt, report } = claimed;
    return {
      beforeKind: report.mediaType,
      beforeStorageIds: report.frameStorageIds,
      afterStorageIds: attempt.frameStorageIds,
      category: report.category,
      title: report.title,
    };
  },
});

// Re-runs the guard, since another attempt may have closed the report while Claude was checking.
export const applyFixVerdict = internalMutation({
  args: {
    attemptId: v.id("fixAttempts"),
    verdict: v.union(v.literal("verified"), v.literal("not_fixed"), v.literal("retake")),
    reason: v.string(),
  },
  handler: async (ctx, { attemptId, verdict, reason }) => {
    const claimed = await claim(ctx, attemptId);
    if (!claimed) return;
    const { attempt, report } = claimed;

    if (verdict === "verified") {
      const now = Date.now();
      // The card names the fixer's org (§3.1.2, §4.3.2). Neighbors have none.
      const fixer = attempt.byKind === "fixer" ? await ctx.db.get(attempt.byId as Id<"fixers">) : null;
      await ctx.db.patch(report._id, {
        status: "fixed",
        fixStorageId: attempt.clipStorageId,
        fixedAt: now,
        fixedBy: attempt.byId,
        fixedByKind: attempt.byKind,
        fixedByOrg: fixer?.org,
        lastActivityAt: now,
      });
    }
    await ctx.db.patch(attemptId, { status: verdict, reason });
  },
});

// Same guard: if another fix closed the report meanwhile, this attempt is superseded, not
// failed, so the person isn't told to record again for a report that's already fixed.
export const markFailed = internalMutation({
  args: { attemptId: v.id("fixAttempts"), reason: v.string() },
  handler: async (ctx, { attemptId, reason }) => {
    if (!(await claim(ctx, attemptId))) return;
    await ctx.db.patch(attemptId, { status: "failed", reason });
  },
});
