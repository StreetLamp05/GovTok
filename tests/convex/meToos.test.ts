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
  status: "open" | "fixed" = "open",
  lastActivityAt = 1,
) {
  return await ctx.db.insert("reports", {
    residentId,
    mediaType: "video",
    frameStorageIds: [],
    lat: 33.8187,
    lng: -84.5824,
    status,
    audioMuted: false,
    isSample: false,
    meTooCount: 0,
    lastActivityAt,
    revealViews: 0,
    createdAt: 1,
  });
}

describe("meToo", () => {
  test("adds one me-too, increments count, and bumps lastActivityAt only once", async () => {
    const t = convexTest(schema, modules);
    const reportId = await t.run(async (ctx) => {
      const poster = await ctx.db.insert("residents", { token: "poster", createdAt: 1 });
      return await insertReport(ctx, poster);
    });

    await expect(t.mutation(api.meToos.meToo, { token: "neighbor", reportId })).resolves.toEqual({ added: true });
    const first = await t.run((ctx) => ctx.db.get(reportId));
    expect(first?.meTooCount).toBe(1);
    expect(first?.lastActivityAt).toBeGreaterThan(1);

    await expect(t.mutation(api.meToos.meToo, { token: "neighbor", reportId })).resolves.toEqual({ added: false });
    const second = await t.run(async (ctx) => ({
      report: await ctx.db.get(reportId),
      meToos: await ctx.db.query("meToos").collect(),
    }));
    expect(second.report?.meTooCount).toBe(1);
    expect(second.report?.lastActivityAt).toBe(first?.lastActivityAt);
    expect(second.meToos).toHaveLength(1);
  });

  test("does nothing on your own open report and rejects a fixed report", async () => {
    const t = convexTest(schema, modules);
    const ids = await t.run(async (ctx) => {
      const resident = await ctx.db.insert("residents", { token: "owner", createdAt: 1 });
      return {
        own: await insertReport(ctx, resident, "open"),
        fixed: await insertReport(ctx, resident, "fixed"),
      };
    });

    await expect(t.mutation(api.meToos.meToo, { token: "owner", reportId: ids.own })).resolves.toEqual({ added: false });
    await expect(t.mutation(api.meToos.meToo, { token: "neighbor", reportId: ids.fixed })).rejects.toThrow(
      /only me-too an open report/,
    );
    const state = await t.run(async (ctx) => ({
      reports: await ctx.db.query("reports").collect(),
      meToos: await ctx.db.query("meToos").collect(),
    }));
    expect(state.reports.find(({ _id }) => _id === ids.own)?.meTooCount).toBe(0);
    expect(state.meToos).toHaveLength(0);
  });

  test("rejects a missing token and unknown report", async () => {
    const t = convexTest(schema, modules);
    const resident = await t.run((ctx) => ctx.db.insert("residents", { token: "poster", createdAt: 1 }));
    const reportId = await t.run((ctx) => insertReport(ctx, resident));
    await expect(t.mutation(api.meToos.meToo, { token: "", reportId })).rejects.toThrow(/Missing device token/);
    await expect(
      t.mutation(api.meToos.meToo, { token: "neighbor", reportId: "00000000000000000000000000reports" as Id<"reports"> }),
    ).rejects.toThrow(/Report not found/);
  });
});
