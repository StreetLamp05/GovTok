import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";
import type { Doc, Id } from "../../../convex/_generated/dataModel";
import type { MutationCtx } from "../../../convex/_generated/server";
import schema from "../../../convex/schema";
import { isPublicStatus, ownerReport, publicReport, publicReportOrNull, UNKNOWN_FIXER_LABEL } from "../../../convex/lib/publicReport";
import { modules } from "../setup";

async function seed(ctx: MutationCtx, overrides: Partial<Doc<"reports">> = {}) {
  const residentId = await ctx.db.insert("residents", { token: "poster", createdAt: 1 });
  const fixerId = await ctx.db.insert("fixers", { name: "Dana", org: "Mableton Sanitation", passcode: "4821" });
  const clip = await ctx.storage.store(new Blob(["clip"], { type: "video/mp4" }));
  const frame = await ctx.storage.store(new Blob(["frame"], { type: "image/jpeg" }));
  const fix = await ctx.storage.store(new Blob(["fix"], { type: "video/mp4" }));
  const reportId: Id<"reports"> = await ctx.db.insert("reports", {
    residentId,
    mediaType: "video",
    description: "Cars swerve around it",
    clipStorageId: clip,
    frameStorageIds: [frame, frame],
    transcript: "This pothole's been here since June.",
    segments: [{ start: 0, end: 3, text: "This pothole's been here since June." }],
    lat: 33.8187,
    lng: -84.5824,
    street: "Floyd Rd SW",
    category: "trash_missed",
    owner: "city",
    agency: "Mableton Sanitation",
    title: "Missed pickup",
    status: "fixed",
    verdict: "pass",
    reason: "Nothing found",
    audioMuted: false,
    isSample: false,
    meTooCount: 3,
    lastActivityAt: 10,
    revealViews: 0,
    createdAt: 1,
    fixStorageId: fix,
    fixedAt: 9,
    fixedBy: fixerId,
    fixedByKind: "fixer",
    fixedByOrg: "Mableton Sanitation",
    ...overrides,
  });
  return { report: (await ctx.db.get(reportId))!, residentId, fixerId };
}

describe("publicReport", () => {
  test("never returns residentId, fixedBy or screening notes, and labels a fixer's fix with the org", async () => {
    const t = convexTest(schema, modules);
    const out = await t.run(async (ctx) => {
      const { report } = await seed(ctx);
      return await publicReport(ctx, report);
    });
    for (const key of ["residentId", "fixedBy", "fixedByOrg", "verdict", "reason", "clipStorageId", "frameStorageIds", "fixStorageId"]) {
      expect(out).not.toHaveProperty(key);
    }
    expect(out.fixedByLabel).toBe("Mableton Sanitation");
    expect(out.fixedByKind).toBe("fixer");
    expect(out.transcript).toBe("This pothole's been here since June.");
    expect(out.description).toBe("Cars swerve around it");
    expect(out.segments).toHaveLength(1);
  });

  test("the payload contains no resident or fixer IDs anywhere", async () => {
    const t = convexTest(schema, modules);
    const { out, residentId, fixerId } = await t.run(async (ctx) => {
      const { report, residentId, fixerId } = await seed(ctx);
      return { out: await publicReport(ctx, report), residentId, fixerId };
    });
    const json = JSON.stringify(out);
    expect(json).not.toContain(residentId);
    expect(json).not.toContain(fixerId);
  });

  test("a neighbor's fix is labeled \"neighbor\"", async () => {
    const t = convexTest(schema, modules);
    const out = await t.run(async (ctx) => {
      const { report, residentId } = await seed(ctx);
      await ctx.db.patch(report._id, { fixedBy: residentId, fixedByKind: "resident", fixedByOrg: undefined });
      return await publicReport(ctx, (await ctx.db.get(report._id))!);
    });
    expect(out.fixedByLabel).toBe("neighbor");
  });

  test("a fixer's fix without fixedByOrg is labeled with the fixer's org from the fixers table", async () => {
    const t = convexTest(schema, modules);
    const out = await t.run(async (ctx) => {
      const { report } = await seed(ctx, { fixedByOrg: undefined });
      return await publicReport(ctx, report);
    });
    expect(out.fixedByLabel).toBe("Mableton Sanitation");
  });

  test("a fixer's fix with no org and no fixer row falls back to a generic label", async () => {
    const t = convexTest(schema, modules);
    const out = await t.run(async (ctx) => {
      const { report, fixerId } = await seed(ctx, { fixedByOrg: undefined });
      await ctx.db.delete(fixerId);
      return await publicReport(ctx, report);
    });
    expect(out.fixedByLabel).toBe(UNKNOWN_FIXER_LABEL);
  });

  test("an unfixed report has no fixedByLabel and no fix URL", async () => {
    const t = convexTest(schema, modules);
    const out = await t.run(async (ctx) => {
      const { report } = await seed(ctx, {
        status: "open",
        fixStorageId: undefined,
        fixedAt: undefined,
        fixedBy: undefined,
        fixedByKind: undefined,
        fixedByOrg: undefined,
      });
      return await publicReport(ctx, report);
    });
    expect(out.fixedByLabel).toBeUndefined();
    expect(out.fixUrl).toBeNull();
  });

  test("hides transcript, segments and description when audioMuted", async () => {
    const t = convexTest(schema, modules);
    const out = await t.run(async (ctx) => {
      const { report } = await seed(ctx, { audioMuted: true, verdict: "mute" });
      return await publicReport(ctx, report);
    });
    expect(out).not.toHaveProperty("transcript");
    expect(out).not.toHaveProperty("segments");
    expect(out).not.toHaveProperty("description");
    expect(out.audioMuted).toBe(true);
  });

  test("resolves storage IDs to URLs", async () => {
    const t = convexTest(schema, modules);
    const out = await t.run(async (ctx) => {
      const { report } = await seed(ctx);
      return await publicReport(ctx, report);
    });
    expect(out.clipUrl).toEqual(expect.any(String));
    expect(out.fixUrl).toEqual(expect.any(String));
    expect(out.frameUrls).toHaveLength(2);
    for (const url of out.frameUrls) expect(url).toEqual(expect.any(String));
  });

  test.each(["pending", "held"] as const)("refuses a %s report", async (status) => {
    const t = convexTest(schema, modules);
    await expect(
      t.run(async (ctx) => {
        const { report } = await seed(ctx, { status });
        return await publicReport(ctx, report);
      }),
    ).rejects.toThrow(/not public/);
  });
});

describe("status guards", () => {
  test("isPublicStatus is true only for open and fixed", () => {
    expect(isPublicStatus("open")).toBe(true);
    expect(isPublicStatus("fixed")).toBe(true);
    expect(isPublicStatus("pending")).toBe(false);
    expect(isPublicStatus("held")).toBe(false);
  });

  test("publicReportOrNull returns null for a missing, pending or held report", async () => {
    const t = convexTest(schema, modules);
    const out = await t.run(async (ctx) => {
      const { report: pending } = await seed(ctx, { status: "pending" });
      const { report: held } = await seed(ctx, { status: "held", verdict: "retake" });
      return [
        await publicReportOrNull(ctx, null),
        await publicReportOrNull(ctx, pending),
        await publicReportOrNull(ctx, held),
      ];
    });
    expect(out).toEqual([null, null, null]);
  });

  test("publicReportOrNull projects an open report", async () => {
    const t = convexTest(schema, modules);
    const out = await t.run(async (ctx) => {
      const { report } = await seed(ctx, { status: "open" });
      return await publicReportOrNull(ctx, report);
    });
    expect(out?.status).toBe("open");
    expect(out).not.toHaveProperty("residentId");
  });
});

describe("ownerReport", () => {
  test("gives the poster their held report with verdict and reason", async () => {
    const t = convexTest(schema, modules);
    const out = await t.run(async (ctx) => {
      const { report, residentId } = await seed(ctx, {
        status: "held",
        verdict: "retake",
        reason: "A face is visible",
        fixStorageId: undefined,
        fixedAt: undefined,
        fixedBy: undefined,
        fixedByKind: undefined,
        fixedByOrg: undefined,
      });
      return await ownerReport(ctx, report, residentId);
    });
    expect(out.status).toBe("held");
    expect(out.verdict).toBe("retake");
    expect(out.reason).toBe("A face is visible");
    expect(out.clipUrl).toEqual(expect.any(String));
    expect(out).not.toHaveProperty("residentId");
  });

  test("never leaks the neighbor who confirmed the fix", async () => {
    const t = convexTest(schema, modules);
    const { out, neighborId } = await t.run(async (ctx) => {
      const { report, residentId } = await seed(ctx);
      const neighborId = await ctx.db.insert("residents", { token: "neighbor", createdAt: 2 });
      await ctx.db.patch(report._id, { fixedBy: neighborId, fixedByKind: "resident", fixedByOrg: undefined });
      return { out: await ownerReport(ctx, (await ctx.db.get(report._id))!, residentId), neighborId };
    });
    expect(out).not.toHaveProperty("fixedBy");
    expect(JSON.stringify(out)).not.toContain(neighborId);
    expect(out.fixedByLabel).toBe("neighbor");
  });

  test("refuses another resident", async () => {
    const t = convexTest(schema, modules);
    await expect(
      t.run(async (ctx) => {
        const { report } = await seed(ctx, { status: "pending" });
        const otherId = await ctx.db.insert("residents", { token: "someone-else", createdAt: 2 });
        return await ownerReport(ctx, report, otherId);
      }),
    ).rejects.toThrow(/isn't this resident's/);
  });

  test("still hides transcript, segments and description when audioMuted", async () => {
    const t = convexTest(schema, modules);
    const out = await t.run(async (ctx) => {
      const { report, residentId } = await seed(ctx, { audioMuted: true, verdict: "mute" });
      return await ownerReport(ctx, report, residentId);
    });
    expect(out).not.toHaveProperty("transcript");
    expect(out).not.toHaveProperty("segments");
    expect(out).not.toHaveProperty("description");
    expect(out.verdict).toBe("mute");
  });
});
