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
    transcript: string;
    description: string;
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
        insertReport(ctx, own, { title: "Pending", status: "pending", createdAt: 1, lastActivityAt: 1 }),
        insertReport(ctx, own, { title: "Held", status: "held", verdict: "retake", reason: "Cover the plate", createdAt: 2, lastActivityAt: 2 }),
        insertReport(ctx, own, { title: "Open", status: "open", createdAt: 3, lastActivityAt: 3 }),
        insertReport(ctx, own, { title: "Muted", status: "open", audioMuted: true, transcript: "John at 412 Elm", description: "Ask John", createdAt: 4, lastActivityAt: 4 }),
        insertReport(ctx, own, { title: "Fixed", status: "fixed", fixedAt: 5, createdAt: 5, lastActivityAt: 5 }),
      ]);
      await insertReport(ctx, other, { title: "Other resident" });
      return { ownIds };
    });

    const ownReports = await t.query(api.me.myReports, { token: "resident-a" });
    expect(ownReports.map((report) => report.title)).toEqual(["Fixed", "Muted", "Open", "Held", "Pending"]);
    expect(ownReports.map((report) => report._id)).toEqual([...ownIds].reverse());
    expect(ownReports.every((report) => !("residentId" in report))).toBe(true);
    const muted = ownReports.find((report) => report.title === "Muted");
    expect(muted).not.toHaveProperty("transcript");
    expect(muted).not.toHaveProperty("description");
    expect(ownReports.find((report) => report.title === "Held")).toMatchObject({ verdict: "retake", reason: "Cover the plate" });
    const otherReports = await t.query(api.me.myReports, { token: "resident-b" });
    expect(otherReports.map((report) => report.title)).toEqual(["Other resident"]);
    expect(await t.query(api.me.myReports, { token: "unknown" })).toEqual([]);
  });
});

test("orders posts by when they were posted, not by me-too activity", async () => {
  const t = convexTest(schema, modules);
  const { olderId } = await t.run(async (ctx) => {
    const own = await ctx.db.insert("residents", { token: "resident-a", createdAt: 1 });
    const olderId = await insertReport(ctx, own, { title: "Older", createdAt: 1, lastActivityAt: 1 });
    await insertReport(ctx, own, { title: "Newer", createdAt: 2, lastActivityAt: 2 });
    return { olderId };
  });
  await t.mutation(api.meToos.meToo, { token: "neighbor", reportId: olderId });
  const titles = (await t.query(api.me.myReports, { token: "resident-a" })).map((report) => report.title);
  expect(titles).toEqual(["Newer", "Older"]);
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
    expect(followed.every(({ report }) => !("verdict" in report) && !("reason" in report))).toBe(true);
    const otherResidentFollowed = await t.query(api.me.myMeToos, { token: "resident-b" });
    expect(otherResidentFollowed.map(({ report }) => report._id)).toEqual([ids.otherOpenId]);
    expect(otherResidentFollowed.some(({ report }) => report._id === ids.openId || report._id === ids.fixedId)).toBe(false);
    expect(await t.query(api.me.myMeToos, { token: "unknown" })).toEqual([]);
  });

  test("lists a report after the real meToo mutation, with the bumped count and no own posts", async () => {
    const t = convexTest(schema, modules);
    const { openId, ownId } = await t.run(async (ctx) => {
      const poster = await ctx.db.insert("residents", { token: "poster", createdAt: 1 });
      const openId = await insertReport(ctx, poster, { title: "Open", status: "open" });
      const ownId = await insertReport(ctx, poster, { title: "Mine", status: "open" });
      return { openId, ownId };
    });

    expect(await t.mutation(api.meToos.meToo, { token: "neighbor", reportId: openId })).toEqual({ added: true });
    expect(await t.mutation(api.meToos.meToo, { token: "poster", reportId: ownId })).toEqual({ added: false });

    const followed = await t.query(api.me.myMeToos, { token: "neighbor" });
    expect(followed.map(({ report }) => report._id)).toEqual([openId]);
    expect(followed[0].report.meTooCount).toBe(1);
    expect(await t.query(api.me.myMeToos, { token: "poster" })).toEqual([]);
  });
});
