import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import type { MutationCtx } from "../../convex/_generated/server";
import schema from "../../convex/schema";
import { modules } from "./setup";

async function insertReport(
  ctx: MutationCtx,
  residentId: Id<"residents">,
  overrides: Partial<{
    status: "pending" | "held" | "open" | "fixed";
    title: string;
    verdict: "pass" | "mute" | "retake" | "emergency" | "reject";
    reason: string;
    audioMuted: boolean;
    createdAt: number;
    lastActivityAt: number;
    fixedAt: number;
  }> = {},
) {
  return await ctx.db.insert("reports", {
    residentId,
    mediaType: "video",
    frameStorageIds: [],
    lat: 33.8187,
    lng: -84.5824,
    title: "Pothole",
    status: "open",
    audioMuted: false,
    isSample: false,
    meTooCount: 0,
    lastActivityAt: 1,
    revealViews: 0,
    createdAt: 1,
    ...overrides,
  });
}

describe("myReports", () => {
  test("returns all statuses only for the resident identified by the token", async () => {
    const t = convexTest(schema, modules);
    const { ownIds } = await t.run(async (ctx) => {
      const own = await ctx.db.insert("residents", { token: "resident-a", createdAt: 1 });
      const other = await ctx.db.insert("residents", { token: "resident-b", createdAt: 1 });
      const ownIds = await Promise.all([
        insertReport(ctx, own, { title: "Pending", status: "pending", lastActivityAt: 1 }),
        insertReport(ctx, own, { title: "Held", status: "held", verdict: "retake", reason: "Cover the plate", lastActivityAt: 2 }),
        insertReport(ctx, own, { title: "Open", status: "open", lastActivityAt: 3 }),
        insertReport(ctx, own, { title: "Muted", status: "open", audioMuted: true, lastActivityAt: 4 }),
        insertReport(ctx, own, { title: "Fixed", status: "fixed", fixedAt: 5, lastActivityAt: 5 }),
      ]);
      await insertReport(ctx, other, { title: "Other resident" });
      return { ownIds };
    });

    const ownReports = await t.query(api.me.myReports, { token: "resident-a" });
    expect(ownReports.map((report) => report.title)).toEqual(["Fixed", "Muted", "Open", "Held", "Pending"]);
    expect(ownReports.map((report) => report._id)).toEqual([...ownIds].reverse());
    expect(ownReports.every((report) => !("residentId" in report))).toBe(true);
    expect(ownReports.find((report) => report.title === "Muted")).not.toHaveProperty("transcript");
    expect(await t.query(api.me.myReports, { token: "resident-b" })).toHaveLength(1);
    expect(await t.query(api.me.myReports, { token: "unknown" })).toEqual([]);
  });
});

describe("myMeToos", () => {
  test("returns only public reports the caller me-too'd, newest first", async () => {
    const t = convexTest(schema, modules);
    const ids = await t.run(async (ctx) => {
      const residentA = await ctx.db.insert("residents", { token: "resident-a", createdAt: 1 });
      const residentB = await ctx.db.insert("residents", { token: "resident-b", createdAt: 1 });
      const openId = await insertReport(ctx, residentB, { title: "Open", status: "open" });
      const fixedId = await insertReport(ctx, residentB, { title: "Fixed", status: "fixed", fixedAt: 2 });
      const heldId = await insertReport(ctx, residentB, { title: "Held", status: "held", verdict: "reject" });
      const otherOpenId = await insertReport(ctx, residentB, { title: "Other open", status: "open" });
      await ctx.db.insert("meToos", { reportId: openId, residentId: residentA, createdAt: 1 });
      await ctx.db.insert("meToos", { reportId: fixedId, residentId: residentA, createdAt: 2 });
      await ctx.db.insert("meToos", { reportId: heldId, residentId: residentA, createdAt: 3 });
      await ctx.db.insert("meToos", { reportId: otherOpenId, residentId: residentB, createdAt: 4 });
      return { openId, fixedId, otherOpenId };
    });

    const followed = await t.query(api.me.myMeToos, { token: "resident-a" });
    expect(followed.map(({ report }) => report._id)).toEqual([ids.fixedId, ids.openId]);
    expect(followed.map(({ report }) => report.status)).toEqual(["fixed", "open"]);
    expect(followed.every(({ report }) => !("residentId" in report))).toBe(true);
    const otherResidentFollowed = await t.query(api.me.myMeToos, { token: "resident-b" });
    expect(otherResidentFollowed.map(({ report }) => report._id)).toEqual([ids.otherOpenId]);
    expect(otherResidentFollowed.some(({ report }) => report._id === ids.openId || report._id === ids.fixedId)).toBe(false);
    expect(await t.query(api.me.myMeToos, { token: "unknown" })).toEqual([]);
  });
});
