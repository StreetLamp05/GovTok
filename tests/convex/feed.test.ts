import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";
import { api } from "../../convex/_generated/api";
import type { Doc, Id } from "../../convex/_generated/dataModel";
import type { MutationCtx } from "../../convex/_generated/server";
import schema from "../../convex/schema";
import { modules } from "./setup";

type Overrides = Partial<Doc<"reports">>;

async function insertReport(ctx: MutationCtx, residentId: Id<"residents">, overrides: Overrides) {
  const clip = await ctx.storage.store(new Blob(["clip"], { type: "video/mp4" }));
  return await ctx.db.insert("reports", {
    residentId,
    mediaType: "video",
    description: "Cars swerve around it",
    clipStorageId: clip,
    frameStorageIds: [],
    transcript: "This pothole's been here since June.",
    segments: [{ start: 0, end: 3, text: "This pothole's been here since June." }],
    lat: 33.8187,
    lng: -84.5824,
    street: "Floyd Rd SW",
    category: "pothole",
    owner: "cobb",
    agency: "Cobb DOT",
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

// One report per status, with lastActivityAt deliberately out of insertion order.
async function seed(t: ReturnType<typeof convexTest>) {
  return await t.run(async (ctx) => {
    const residentId = await ctx.db.insert("residents", { token: "poster", createdAt: 1 });
    const ids = {
      open: await insertReport(ctx, residentId, { title: "Open", lastActivityAt: 20 }),
      pending: await insertReport(ctx, residentId, { title: "Pending", status: "pending", lastActivityAt: 50 }),
      fixed: await insertReport(ctx, residentId, { title: "Fixed", status: "fixed", fixedAt: 30, lastActivityAt: 40 }),
      held: await insertReport(ctx, residentId, { title: "Held", status: "held", verdict: "retake", lastActivityAt: 60 }),
      muted: await insertReport(ctx, residentId, { title: "Muted", audioMuted: true, verdict: "mute", lastActivityAt: 10 }),
      older: await insertReport(ctx, residentId, { title: "Older", lastActivityAt: 30 }),
    };
    return { residentId, ids };
  });
}

describe("feed", () => {
  test("excludes pending and held reports and orders by lastActivityAt descending", async () => {
    const t = convexTest(schema, modules);
    await seed(t);
    const feed = await t.query(api.feed.feed, {});
    expect(feed.map((r) => r.title)).toEqual(["Fixed", "Older", "Open", "Muted"]);
    expect(feed.every((r) => r.status === "open" || r.status === "fixed")).toBe(true);
  });

  test("no item carries residentId", async () => {
    const t = convexTest(schema, modules);
    const { residentId } = await seed(t);
    const feed = await t.query(api.feed.feed, {});
    for (const item of feed) expect(item).not.toHaveProperty("residentId");
    expect(JSON.stringify(feed)).not.toContain(residentId);
  });

  test("a muted report has no transcript, captions or description", async () => {
    const t = convexTest(schema, modules);
    await seed(t);
    const muted = (await t.query(api.feed.feed, {})).find((r) => r.title === "Muted")!;
    expect(muted.audioMuted).toBe(true);
    expect(muted).not.toHaveProperty("transcript");
    expect(muted).not.toHaveProperty("segments");
    expect(muted).not.toHaveProperty("description");
    expect(muted.clipUrl).toBeTruthy();
  });

  test("returns at most 50 public reports, the most recent ones, even with newer held and pending ones", async () => {
    const t = convexTest(schema, modules);
    await t.run(async (ctx) => {
      const residentId = await ctx.db.insert("residents", { token: "poster", createdAt: 1 });
      for (let i = 1; i <= 55; i++) await insertReport(ctx, residentId, { title: `#${i}`, lastActivityAt: i });
      // Newer but not public: they must not use up any of the 50.
      for (let i = 1; i <= 10; i++) {
        await insertReport(ctx, residentId, { status: i % 2 ? "held" : "pending", lastActivityAt: 100 + i });
      }
    });
    const feed = await t.query(api.feed.feed, {});
    expect(feed).toHaveLength(50);
    expect(feed[0].title).toBe("#55");
    expect(feed[49].title).toBe("#6");
  });
});

describe("reportById", () => {
  test("returns open and fixed reports through the public projection", async () => {
    const t = convexTest(schema, modules);
    const { ids } = await seed(t);
    const open = await t.query(api.feed.reportById, { id: ids.open });
    expect(open?.title).toBe("Open");
    expect(open).not.toHaveProperty("residentId");
    expect((await t.query(api.feed.reportById, { id: ids.fixed }))?.title).toBe("Fixed");
  });

  test("returns null for a held or pending report", async () => {
    const t = convexTest(schema, modules);
    const { ids } = await seed(t);
    expect(await t.query(api.feed.reportById, { id: ids.held })).toBeNull();
    expect(await t.query(api.feed.reportById, { id: ids.pending })).toBeNull();
  });

  test("returns null for a malformed id or another table's id", async () => {
    const t = convexTest(schema, modules);
    const { residentId } = await seed(t);
    expect(await t.query(api.feed.reportById, { id: "not-an-id" })).toBeNull();
    expect(await t.query(api.feed.reportById, { id: residentId })).toBeNull();
  });
});
