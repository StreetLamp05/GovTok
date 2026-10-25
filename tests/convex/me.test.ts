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
  status: "pending" | "held" | "open" | "fixed",
  createdAt: number,
) {
  return await ctx.db.insert("reports", {
    residentId,
    mediaType: "video",
    frameStorageIds: [],
    lat: 37.7694,
    lng: -122.4862,
    status,
    audioMuted: false,
    isSample: false,
    meTooCount: 0,
    lastActivityAt: createdAt,
    revealViews: 0,
    createdAt,
    ...(status === "held" ? { verdict: "retake" as const, reason: "Please record again." } : {}),
  });
}

describe("me.summary", () => {
  test("returns the resident's complete posts and only public reports they me-too'd", async () => {
    const t = convexTest(schema, modules);
    const ids = await t.run(async (ctx) => {
      const owner = await ctx.db.insert("residents", { token: "owner", createdAt: 1 });
      const neighbor = await ctx.db.insert("residents", { token: "neighbor", createdAt: 1 });
      const older = await insertReport(ctx, owner, "pending", 10);
      const resolved = await insertReport(ctx, owner, "fixed", 30);
      const held = await insertReport(ctx, owner, "held", 20);
      const supported = await insertReport(ctx, neighbor, "open", 40);
      const privateReport = await insertReport(ctx, neighbor, "held", 50);
      await ctx.db.insert("meToos", { reportId: supported, residentId: owner, createdAt: 60 });
      await ctx.db.insert("meToos", { reportId: privateReport, residentId: owner, createdAt: 70 });
      await ctx.db.insert("meToos", { reportId: older, residentId: neighbor, createdAt: 80 });
      return { older, resolved, held, supported };
    });

    const summary = await t.query(api.me.summary, { token: "owner" });

    expect(summary.reports.map(({ _id }) => _id)).toEqual([ids.resolved, ids.held, ids.older]);
    expect(summary.reports.map(({ status }) => status)).toEqual(["fixed", "held", "pending"]);
    expect(summary.reports[1].verdict).toBe("retake");
    expect(summary.meToos.map(({ _id }) => _id)).toEqual([ids.supported]);
    expect(summary.meToos[0]).not.toHaveProperty("residentId");
    expect(summary.stats).toEqual({ reports: 3, meToos: 1, resolved: 1 });
  });

  test("returns an empty private profile for an unknown token", async () => {
    const t = convexTest(schema, modules);
    await t.run(async (ctx) => {
      const resident = await ctx.db.insert("residents", { token: "other-device", createdAt: 1 });
      await insertReport(ctx, resident, "open", 1);
    });

    await expect(t.query(api.me.summary, { token: "unknown" })).resolves.toEqual({
      reports: [],
      meToos: [],
      stats: { reports: 0, meToos: 0, resolved: 0 },
    });
  });
});
