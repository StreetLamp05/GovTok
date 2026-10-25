import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { internalMutation, type MutationCtx } from "./_generated/server";

// Retention (§7.1.1): held reports and unverified fix attempts are deleted 7 days after
// they were posted. Published reports (open / fixed), samples and verified attempts are kept.
export const PURGE_AFTER_MS = 7 * 24 * 60 * 60 * 1000;

// Deletions per table (per status, for attempts) per run. A full batch means more may be
// left, so the job reschedules itself.
const BATCH = 50;

const UNVERIFIED_ATTEMPT_STATUSES = ["checking", "not_fixed", "retake", "failed", "superseded"] as const;

// The files' _storage rows. Files already gone (e.g. replaced and deleted elsewhere) are
// skipped, so a missing file can't wedge the job.
async function storedFiles(ctx: MutationCtx, ids: (Id<"_storage"> | undefined)[]) {
  const docs = await Promise.all(ids.map((id) => (id === undefined ? null : ctx.db.system.get(id))));
  return docs.filter((doc) => doc !== null);
}

async function deleteFiles(ctx: MutationCtx, files: { _id: Id<"_storage"> }[]) {
  for (const file of files) {
    await ctx.storage.delete(file._id);
  }
}

export const purgeExpired = internalMutation({
  args: {},
  handler: async (ctx) => {
    const cutoff = Date.now() - PURGE_AFTER_MS;
    let more = false;

    // Held reports are iterated rather than taken, because skipped ones stay in the index
    // range and would otherwise fill every batch.
    let purged = 0;
    const held = ctx.db
      .query("reports")
      .withIndex("by_status_createdAt", (q) => q.eq("status", "held").lt("createdAt", cutoff));
    for await (const report of held) {
      if (purged === BATCH) {
        more = true;
        break;
      }
      // Samples are backdated (§6.1.1) and released by hand for the demo; never purge them.
      if (report.isSample) continue;
      // A retake swaps in new files on the same report (§4.2.1), so age runs from the newest upload.
      const files = await storedFiles(ctx, [report.clipStorageId, ...report.frameStorageIds]);
      if (files.some((file) => file._creationTime >= cutoff)) continue;

      await deleteFiles(ctx, files);
      const meToos = await ctx.db
        .query("meToos")
        .withIndex("by_report_resident", (q) => q.eq("reportId", report._id))
        .collect();
      for (const meToo of meToos) {
        await ctx.db.delete(meToo._id);
      }
      await ctx.db.delete(report._id);
      purged++;
    }

    for (const status of UNVERIFIED_ATTEMPT_STATUSES) {
      const attempts = await ctx.db
        .query("fixAttempts")
        .withIndex("by_status_createdAt", (q) => q.eq("status", status).lt("createdAt", cutoff))
        .take(BATCH);
      more ||= attempts.length === BATCH;
      for (const attempt of attempts) {
        await deleteFiles(ctx, await storedFiles(ctx, [attempt.clipStorageId, ...attempt.frameStorageIds]));
        await ctx.db.delete(attempt._id);
      }
    }

    if (more) {
      await ctx.scheduler.runAfter(0, internal.purge.purgeExpired, {});
    }
  },
});
