import { convexTest } from "convex-test";
import { expect, test } from "vitest";
import { api } from "../../convex/_generated/api";
import { toMapReport } from "../../convex/map";
import type { Doc } from "../../convex/_generated/dataModel";
import schema from "../../convex/schema";
import { modules } from "./setup";

const MAP_FIELDS = ["_id", "category", "isSample", "lat", "lng", "meTooCount", "status", "title"];

test("mapReports returns only open and fixed reports, with only the map's fields", async () => {
  const t = convexTest(schema, modules);
  const ids = await t.run(async (ctx) => {
    const residentId = await ctx.db.insert("residents", { token: "poster", createdAt: 1 });
    const fixerId = await ctx.db.insert("fixers", { name: "Dana", org: "Mableton Sanitation", passcode: "4821" });
    const clip = await ctx.storage.store(new Blob(["clip"], { type: "video/mp4" }));
    const insert = (status: Doc<"reports">["status"], meTooCount: number) =>
      ctx.db.insert("reports", {
        residentId,
        mediaType: "video",
        description: "Cars swerve around it",
        clipStorageId: clip,
        frameStorageIds: [clip],
        transcript: "This pothole's been here since June.",
        segments: [{ start: 0, end: 3, text: "This pothole's been here since June." }],
        lat: 33.8187,
        lng: -84.5824,
        street: "Floyd Rd SW",
        category: "pothole",
        owner: "cobb",
        agency: "Cobb DOT",
        title: `A ${status} pothole`,
        status,
        verdict: "pass",
        reason: "Nothing found",
        audioMuted: false,
        isSample: false,
        meTooCount,
        lastActivityAt: 10,
        revealViews: 0,
        createdAt: 1,
        ...(status === "fixed"
          ? { fixStorageId: clip, fixedAt: 9, fixedBy: fixerId, fixedByKind: "fixer" as const, fixedByOrg: "Mableton Sanitation" }
          : {}),
      });
    return {
      open: await insert("open", 2),
      fixed: await insert("fixed", 4),
      pending: await insert("pending", 0),
      held: await insert("held", 0),
    };
  });

  const reports = await t.query(api.map.mapReports, {});

  expect(reports.map((r) => r._id).sort()).toEqual([ids.open, ids.fixed].sort());
  for (const report of reports) {
    expect(Object.keys(report).sort()).toEqual(MAP_FIELDS);
  }
  expect(reports.find((r) => r._id === ids.fixed)).toEqual({
    _id: ids.fixed,
    lat: 33.8187,
    lng: -84.5824,
    status: "fixed",
    meTooCount: 4,
    title: "A fixed pothole",
    category: "pothole",
    isSample: false,
  });
});

test("mapReports is empty when nothing is public", async () => {
  const t = convexTest(schema, modules);
  expect(await t.query(api.map.mapReports, {})).toEqual([]);
});

test("toMapReport refuses a pending or held report, so a read path without a status filter fails loudly", async () => {
  const t = convexTest(schema, modules);
  const reports = await t.run(async (ctx) => {
    const residentId = await ctx.db.insert("residents", { token: "poster", createdAt: 1 });
    const insert = async (status: Doc<"reports">["status"]) =>
      (await ctx.db.get(
        await ctx.db.insert("reports", {
          residentId,
          mediaType: "video",
          frameStorageIds: [],
          lat: 33.8187,
          lng: -84.5824,
          status,
          audioMuted: false,
          isSample: false,
          meTooCount: 0,
          lastActivityAt: 1,
          revealViews: 0,
          createdAt: 1,
        }),
      ))!;
    return { pending: await insert("pending"), held: await insert("held"), open: await insert("open") };
  });

  expect(() => toMapReport(reports.pending)).toThrow(/is pending, not public/);
  expect(() => toMapReport(reports.held)).toThrow(/is held, not public/);
  expect(toMapReport(reports.open).status).toBe("open");
});
