import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";
import { api } from "../../convex/_generated/api";
import type { Doc } from "../../convex/_generated/dataModel";
import schema from "../../convex/schema";
import { modules } from "./setup";

async function insertReport(t: ReturnType<typeof convexTest>, overrides: Partial<Doc<"reports">> = {}) {
  return await t.run(async (ctx) => {
    const residentId = await ctx.db.insert("residents", { token: "poster", createdAt: 1 });
    return await ctx.db.insert("reports", {
      residentId,
      mediaType: "video",
      frameStorageIds: [],
      lat: 33.8187,
      lng: -84.5824,
      status: "fixed",
      audioMuted: false,
      isSample: false,
      meTooCount: 0,
      lastActivityAt: 40,
      revealViews: 0,
      createdAt: 1,
      fixedAt: 30,
      fixedByKind: "fixer",
      ...overrides,
    });
  });
}

const read = (t: ReturnType<typeof convexTest>, id: Doc<"reports">["_id"]) => t.run((ctx) => ctx.db.get(id));

describe("recordRevealView", () => {
  test("adds 1 per call and leaves lastActivityAt alone", async () => {
    const t = convexTest(schema, modules);
    const id = await insertReport(t, { revealViews: 4 });

    await t.mutation(api.reveal.recordRevealView, { reportId: id });
    expect((await read(t, id))?.revealViews).toBe(5);

    await t.mutation(api.reveal.recordRevealView, { reportId: id });
    const after = await read(t, id);
    expect(after?.revealViews).toBe(6);
    expect(after?.lastActivityAt).toBe(40);
  });

  test.each(["open", "pending", "held"] as const)("does nothing on a %s report", async (status) => {
    const t = convexTest(schema, modules);
    const id = await insertReport(t, { status, fixedAt: undefined, fixedByKind: undefined });
    await t.mutation(api.reveal.recordRevealView, { reportId: id });
    expect((await read(t, id))?.revealViews).toBe(0);
  });

  test("does nothing for a deleted report", async () => {
    const t = convexTest(schema, modules);
    const id = await insertReport(t);
    await t.run((ctx) => ctx.db.delete(id));
    await expect(t.mutation(api.reveal.recordRevealView, { reportId: id })).resolves.toBeNull();
  });
});
