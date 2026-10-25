import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import type { MutationCtx } from "../../convex/_generated/server";
import schema from "../../convex/schema";
import { modules } from "./setup";

async function insertReport(ctx: MutationCtx, residentId: Id<"residents">) {
  return await ctx.db.insert("reports", {
    residentId,
    mediaType: "video",
    frameStorageIds: [],
    lat: 33.8187,
    lng: -84.5824,
    status: "open",
    audioMuted: false,
    isSample: false,
    meTooCount: 0,
    lastActivityAt: 1,
    revealViews: 0,
    createdAt: 1,
  });
}

describe("myRelation", () => {
  test("returns only the caller's own posts and me-toos, never another resident's", async () => {
    const t = convexTest(schema, modules);
    const ids = await t.run(async (ctx) => {
      const alice = await ctx.db.insert("residents", { token: "alice", createdAt: 1 });
      const bob = await ctx.db.insert("residents", { token: "bob", createdAt: 1 });
      return {
        alicePost: await insertReport(ctx, alice),
        bobPost: await insertReport(ctx, bob),
        other: await insertReport(ctx, bob),
      };
    });
    await t.mutation(api.meToos.meToo, { token: "alice", reportId: ids.bobPost });
    await t.mutation(api.meToos.meToo, { token: "bob", reportId: ids.alicePost });
    const reportIds = [ids.alicePost, ids.bobPost, ids.other];

    await expect(t.query(api.relation.myRelation, { token: "alice", reportIds })).resolves.toEqual({
      mine: [ids.alicePost],
      meTooed: [ids.bobPost],
    });
    await expect(t.query(api.relation.myRelation, { token: "bob", reportIds })).resolves.toEqual({
      mine: [ids.bobPost, ids.other],
      meTooed: [ids.alicePost],
    });
  });

  test("an unknown or empty token gets nothing", async () => {
    const t = convexTest(schema, modules);
    const reportId = await t.run(async (ctx) => {
      const poster = await ctx.db.insert("residents", { token: "poster", createdAt: 1 });
      const reportId = await insertReport(ctx, poster);
      await ctx.db.insert("meToos", { reportId, residentId: poster, createdAt: 2 });
      return reportId;
    });

    for (const token of ["stranger", "", "  "]) {
      await expect(t.query(api.relation.myRelation, { token, reportIds: [reportId] })).resolves.toEqual({
        mine: [],
        meTooed: [],
      });
    }
  });
});
