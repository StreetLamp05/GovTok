import { convexTest } from "convex-test";
import { afterEach, expect, test, vi } from "vitest";
import { internal } from "../../convex/_generated/api";
import type { Doc, Id } from "../../convex/_generated/dataModel";
import schema from "../../convex/schema";
import cronsModule from "../../convex/crons";
import { PURGE_AFTER_MS } from "../../convex/purge";
import { modules } from "./setup";

const DAY = 24 * 60 * 60 * 1000;
const NOW = Date.UTC(2026, 9, 25, 12);

afterEach(() => {
  vi.useRealTimers();
});

const setup = () => {
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
  return convexTest(schema, modules);
};
type T = ReturnType<typeof setup>;

// Fixtures are written with the clock set back to their files' age, so the files' _creationTime
// is that old. convex-test keeps _creationTime monotonic across every insert, so each test
// creates its fixtures oldest first.
async function at<R>(ageMs: number, fn: () => Promise<R>) {
  vi.setSystemTime(NOW - ageMs);
  try {
    return await fn();
  } finally {
    vi.setSystemTime(NOW);
  }
}

async function files(t: T, count: number) {
  const ids: Id<"_storage">[] = [];
  for (let i = 0; i < count; i++) {
    ids.push(await t.run((ctx) => ctx.storage.store(new Blob(["bytes"]))));
  }
  return ids;
}

async function report(
  t: T,
  status: Doc<"reports">["status"],
  ageMs: number,
  {
    isSample = false,
    filesAgeMs = ageMs,
    fileCount = 3,
  }: { isSample?: boolean; filesAgeMs?: number; fileCount?: number } = {},
) {
  return at(filesAgeMs, async () => {
    const [clip, ...frames] = await files(t, fileCount);
    const reportId = await t.run(async (ctx) => {
      const residentId = await ctx.db.insert("residents", { token: `r-${Math.random()}`, createdAt: 1 });
      const reportId = await ctx.db.insert("reports", {
        residentId,
        mediaType: "video",
        clipStorageId: clip,
        frameStorageIds: frames,
        lat: 33.8187,
        lng: -84.5824,
        status,
        audioMuted: false,
        isSample,
        meTooCount: 1,
        lastActivityAt: NOW - ageMs,
        revealViews: 0,
        createdAt: NOW - ageMs,
      });
      await ctx.db.insert("meToos", { reportId, residentId, createdAt: NOW - ageMs });
      return reportId;
    });
    return { reportId, files: [clip, ...frames] };
  });
}

async function attempt(t: T, reportId: Id<"reports">, status: Doc<"fixAttempts">["status"], ageMs: number) {
  return at(ageMs, async () => {
    const [clip, ...frames] = await files(t, 2);
    const attemptId = await t.run(async (ctx) => {
      const byId = await ctx.db.insert("residents", { token: `f-${Math.random()}`, createdAt: 1 });
      return await ctx.db.insert("fixAttempts", {
        reportId,
        byKind: "resident",
        byId,
        clipStorageId: clip,
        frameStorageIds: frames,
        lat: 33.8187,
        lng: -84.5824,
        status,
        createdAt: NOW - ageMs,
      });
    });
    return { attemptId, files: [clip, ...frames] };
  });
}

async function exists(t: T, ids: Id<"_storage">[]) {
  return await t.run(async (ctx) => Promise.all(ids.map(async (id) => (await ctx.storage.get(id)) !== null)));
}

async function meTooCount(t: T, reportId: Id<"reports">) {
  return await t.run(
    async (ctx) =>
      (await ctx.db.query("meToos").withIndex("by_report_resident", (q) => q.eq("reportId", reportId)).collect())
        .length,
  );
}

async function expectReportGone(t: T, r: { reportId: Id<"reports">; files: Id<"_storage">[] }) {
  expect(await t.run((ctx) => ctx.db.get(r.reportId))).toBeNull();
  expect(await exists(t, r.files)).toEqual(r.files.map(() => false));
  expect(await meTooCount(t, r.reportId)).toBe(0);
}

async function expectReportKept(t: T, r: { reportId: Id<"reports">; files: Id<"_storage">[] }) {
  expect(await t.run((ctx) => ctx.db.get(r.reportId))).not.toBeNull();
  expect(await exists(t, r.files)).toEqual(r.files.map(() => true));
  expect(await meTooCount(t, r.reportId)).toBe(1);
}

async function expectAttemptGone(t: T, a: { attemptId: Id<"fixAttempts">; files: Id<"_storage">[] }) {
  expect(await t.run((ctx) => ctx.db.get(a.attemptId))).toBeNull();
  expect(await exists(t, a.files)).toEqual(a.files.map(() => false));
}

async function expectAttemptKept(t: T, a: { attemptId: Id<"fixAttempts">; files: Id<"_storage">[] }) {
  expect(await t.run((ctx) => ctx.db.get(a.attemptId))).not.toBeNull();
  expect(await exists(t, a.files)).toEqual(a.files.map(() => true));
}

test("purges an 8-day-old held report with its files and me-toos; keeps newer held, published reports and verified fixes", async () => {
  const t = setup();

  const oldOpen = await report(t, "open", 30 * DAY);
  const oldFixed = await report(t, "fixed", 30 * DAY);
  const verified = await attempt(t, oldFixed.reportId, "verified", 20 * DAY);
  const oldHeld = await report(t, "held", 8 * DAY);
  const unverified = [];
  for (const status of ["checking", "not_fixed", "retake", "failed", "superseded"] as const) {
    unverified.push(await attempt(t, oldOpen.reportId, status, 8 * DAY));
  }
  const newHeld = await report(t, "held", 6 * DAY);
  const recentRetake = await attempt(t, oldOpen.reportId, "retake", 6 * DAY);

  await t.mutation(internal.purge.purgeExpired, {});

  await expectReportGone(t, oldHeld);
  for (const kept of [newHeld, oldOpen, oldFixed]) {
    await expectReportKept(t, kept);
  }

  // A verified attempt keeps its clip; old attempts in every other status go; a 6-day-old one stays.
  await expectAttemptKept(t, verified);
  for (const gone of unverified) {
    await expectAttemptGone(t, gone);
  }
  await expectAttemptKept(t, recentRetake);
});

test("a held sample is never purged, however old", async () => {
  const t = setup();

  const sample = await report(t, "held", 30 * DAY, { isSample: true });

  await t.mutation(internal.purge.purgeExpired, {});

  await expectReportKept(t, sample);
});

test("a retake restarts the clock: an 8-day-old held report with 1-day-old files is kept", async () => {
  const t = setup();

  const retaken = await report(t, "held", 8 * DAY, { filesAgeMs: 1 * DAY });

  await t.mutation(internal.purge.purgeExpired, {});

  await expectReportKept(t, retaken);
});

test("exactly 7 days old is kept; a second older is purged", async () => {
  const t = setup();

  // A second, not 1 ms: convex-test's monotonic _creationTime bumps can push a file 1 ms forward.
  const owner = await report(t, "open", 30 * DAY);
  const overReport = await report(t, "held", PURGE_AFTER_MS + 1000);
  const overAttempt = await attempt(t, owner.reportId, "not_fixed", PURGE_AFTER_MS + 1000);
  // Each guard on its own: posted exactly 7 days ago (older files), and a single file uploaded
  // exactly 7 days ago (older post).
  const postedAt = await report(t, "held", PURGE_AFTER_MS, { filesAgeMs: PURGE_AFTER_MS + 1000 });
  const uploadedAt = await report(t, "held", PURGE_AFTER_MS + 1000, { filesAgeMs: PURGE_AFTER_MS, fileCount: 1 });
  const atAttempt = await attempt(t, owner.reportId, "not_fixed", PURGE_AFTER_MS);

  await t.mutation(internal.purge.purgeExpired, {});

  await expectReportGone(t, overReport);
  await expectAttemptGone(t, overAttempt);
  await expectReportKept(t, postedAt);
  await expectReportKept(t, uploadedAt);
  await expectAttemptKept(t, atAttempt);
});

test("a held report whose file was already deleted is still purged", async () => {
  const t = setup();

  const oldHeld = await report(t, "held", 8 * DAY);
  await t.run((ctx) => ctx.storage.delete(oldHeld.files[0]));

  await t.mutation(internal.purge.purgeExpired, {});

  await expectReportGone(t, oldHeld);
});

test("a backlog bigger than one batch is drained by rescheduled runs, even with skipped rows in the way", async () => {
  const t = setup();

  // Old samples sort first in the index, so they'd fill every batch if skips counted.
  const samples = [];
  for (let i = 0; i < 60; i++) {
    samples.push(await report(t, "held", 9 * DAY, { isSample: true }));
  }
  for (let i = 0; i < 60; i++) {
    await report(t, "held", 8 * DAY);
  }

  await t.mutation(internal.purge.purgeExpired, {});
  await t.finishAllScheduledFunctions(vi.runAllTimers);

  const left = await t.run((ctx) => ctx.db.query("reports").collect());
  expect(left.map((r) => r._id).sort()).toEqual(samples.map((s) => s.reportId).sort());
});

test("the purge is registered as a daily cron", () => {
  const jobs = Object.values(cronsModule.crons);
  expect(jobs).toHaveLength(1);
  expect(jobs[0].schedule.type).toBe("daily");
  expect(jobs[0].name).toBe("purge:purgeExpired");
});
