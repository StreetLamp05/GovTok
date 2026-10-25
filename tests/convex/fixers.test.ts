import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";
import { api, internal } from "../../convex/_generated/api";
import type { Doc } from "../../convex/_generated/dataModel";
import type { MutationCtx } from "../../convex/_generated/server";
import schema from "../../convex/schema";
import { requireFixer } from "../../convex/lib/auth";
import { modules } from "./setup";

const DANA = { name: "Dana", org: "Mableton Sanitation", passcode: "sanit-4821" };
const LEE = { name: "Lee", org: "Mableton Code Enforcement", passcode: "code-7730" };

function setup() {
  const t = convexTest(schema, modules);
  return { t, seed: () => t.mutation(internal.fixers.seed, { fixers: [DANA, LEE] }) };
}

async function insertReport(ctx: MutationCtx, overrides: Partial<Doc<"reports">> = {}) {
  const residentId = await ctx.db.insert("residents", { token: `poster-${Math.random()}`, createdAt: 1 });
  const frame = await ctx.storage.store(new Blob(["frame"], { type: "image/jpeg" }));
  return await ctx.db.insert("reports", {
    residentId,
    mediaType: "video",
    frameStorageIds: [frame],
    lat: 33.8158,
    lng: -84.5825,
    owner: "cobb",
    agency: "Cobb DOT",
    title: "Pothole",
    status: "open",
    verdict: "pass",
    reason: "Looks fine",
    audioMuted: false,
    isSample: false,
    meTooCount: 0,
    lastActivityAt: 1,
    revealViews: 0,
    createdAt: 1,
    ...overrides,
  });
}

describe("seed", () => {
  test("inserts fixers, and a re-run updates them by passcode without duplicating or dropping tokens", async () => {
    const { t, seed } = setup();
    expect(await seed()).toEqual({ inserted: 2, updated: 0 });
    const { token } = await t.mutation(api.fixers.fixerLogin, { passcode: DANA.passcode });

    const renamed = { ...DANA, org: "Mableton Public Works" };
    expect(await t.mutation(internal.fixers.seed, { fixers: [renamed] })).toEqual({ inserted: 0, updated: 1 });

    const fixers = await t.run((ctx) => ctx.db.query("fixers").collect());
    expect(fixers).toHaveLength(2);
    const dana = fixers.find((f) => f.passcode === DANA.passcode)!;
    expect(dana).toMatchObject({ org: "Mableton Public Works", token });
  });

  test("rejects an empty passcode and a passcode used twice, inserting nothing", async () => {
    const { t } = setup();
    await expect(
      t.mutation(internal.fixers.seed, { fixers: [LEE, { ...DANA, passcode: "  " }] }),
    ).rejects.toThrow(/empty/);
    await expect(
      t.mutation(internal.fixers.seed, { fixers: [DANA, { ...LEE, passcode: DANA.passcode }] }),
    ).rejects.toThrow(/used twice/);
    expect(await t.run((ctx) => ctx.db.query("fixers").collect())).toHaveLength(0);
  });

  test("accepts a short passcode like the spec's 4821", async () => {
    const { t } = setup();
    await t.mutation(internal.fixers.seed, { fixers: [{ ...DANA, passcode: "4821" }] });
    expect((await t.mutation(api.fixers.fixerLogin, { passcode: "4821" })).org).toBe("Mableton Sanitation");
  });
});

describe("fixerLogin", () => {
  test("a wrong passcode fails with the same message as an empty one", async () => {
    const { t, seed } = setup();
    await seed();
    await expect(t.mutation(api.fixers.fixerLogin, { passcode: "nope-0000" })).rejects.toThrow(/Wrong passcode/);
    await expect(t.mutation(api.fixers.fixerLogin, { passcode: "   " })).rejects.toThrow(/Wrong passcode/);
    // A near miss doesn't hint either, and no token was issued to anyone.
    await expect(t.mutation(api.fixers.fixerLogin, { passcode: "sanit-482" })).rejects.toThrow(/Wrong passcode/);
    const fixers = await t.run((ctx) => ctx.db.query("fixers").collect());
    expect(fixers.every((f) => f.token === undefined)).toBe(true);
  });

  test("the right passcode returns the org and a token that requireFixer accepts", async () => {
    const { t, seed } = setup();
    await seed();
    const login = await t.mutation(api.fixers.fixerLogin, { passcode: ` ${DANA.passcode} ` });
    expect(login.org).toBe("Mableton Sanitation");
    expect(login.token).toMatch(/^[0-9a-f-]{36}$/);
    const fixer = await t.run((ctx) => requireFixer(ctx, login.token));
    expect(fixer.name).toBe("Dana");
  });

  test("logging in twice returns the same token, so a second device doesn't log out the first", async () => {
    const { t, seed } = setup();
    await seed();
    const first = await t.mutation(api.fixers.fixerLogin, { passcode: DANA.passcode });
    const second = await t.mutation(api.fixers.fixerLogin, { passcode: DANA.passcode });
    expect(second.token).toBe(first.token);
    const other = await t.mutation(api.fixers.fixerLogin, { passcode: LEE.passcode });
    expect(other.token).not.toBe(first.token);
  });
});

describe("fixerSession", () => {
  test("returns the org for a valid token and null for a bad or empty one", async () => {
    const { t, seed } = setup();
    await seed();
    const { token } = await t.mutation(api.fixers.fixerLogin, { passcode: DANA.passcode });
    expect(await t.query(api.fixers.fixerSession, { fixerToken: token })).toEqual({ org: "Mableton Sanitation" });
    expect(await t.query(api.fixers.fixerSession, { fixerToken: "stale" })).toBeNull();
    expect(await t.query(api.fixers.fixerSession, { fixerToken: "" })).toBeNull();
  });
});

describe("openReportsForFixer", () => {
  test("rejects an invalid or missing token", async () => {
    const { t, seed } = setup();
    await seed();
    await t.run((ctx) => insertReport(ctx));
    await expect(t.query(api.fixers.openReportsForFixer, { fixerToken: "forged" })).rejects.toThrow(
      /Invalid fixer token/,
    );
    await expect(t.query(api.fixers.openReportsForFixer, { fixerToken: "" })).rejects.toThrow(/Missing fixer token/);
  });

  test("returns every owner's open reports, and only open ones, through the public projection", async () => {
    const { t, seed } = setup();
    await seed();
    const { token } = await t.mutation(api.fixers.fixerLogin, { passcode: DANA.passcode });
    await t.run(async (ctx) => {
      for (const owner of ["city", "cobb", "utility", "unknown"] as const) {
        await insertReport(ctx, { owner, title: `open ${owner}` });
      }
      for (const status of ["pending", "held", "fixed"] as const) {
        await insertReport(ctx, { status, title: status });
      }
    });

    const reports = await t.query(api.fixers.openReportsForFixer, { fixerToken: token });
    expect(reports.map((r) => r.title).sort()).toEqual(["open city", "open cobb", "open unknown", "open utility"]);
    for (const report of reports) {
      expect(report.status).toBe("open");
      expect(report.frameUrls).toHaveLength(1);
      expect(report.frameUrls[0]).toEqual(expect.any(String));
      expect(report).not.toHaveProperty("residentId");
      expect(report).not.toHaveProperty("verdict");
      expect(report).not.toHaveProperty("reason");
    }
  });
});

describe("fixerReport", () => {
  test("returns an open report, and keeps returning it once it's fixed", async () => {
    const { t, seed } = setup();
    await seed();
    const { token } = await t.mutation(api.fixers.fixerLogin, { passcode: DANA.passcode });
    const reportId = await t.run((ctx) => insertReport(ctx));

    const open = await t.query(api.fixers.fixerReport, { fixerToken: token, reportId });
    expect(open).toMatchObject({ _id: reportId, status: "open" });
    expect(open).not.toHaveProperty("residentId");

    await t.run((ctx) => ctx.db.patch(reportId, { status: "fixed", fixedAt: 2, fixedByKind: "resident" }));
    expect(await t.query(api.fixers.fixerReport, { fixerToken: token, reportId })).toMatchObject({
      status: "fixed",
      fixedByLabel: "neighbor",
    });
  });

  test("is null for a pending, held, deleted or malformed report ID", async () => {
    const { t, seed } = setup();
    await seed();
    const { token } = await t.mutation(api.fixers.fixerLogin, { passcode: DANA.passcode });
    const [pending, held, deleted] = await t.run(async (ctx) => {
      const ids = [
        await insertReport(ctx, { status: "pending" }),
        await insertReport(ctx, { status: "held" }),
        await insertReport(ctx),
      ];
      await ctx.db.delete(ids[2]);
      return ids;
    });
    for (const reportId of [pending, held, deleted, "not-an-id"]) {
      expect(await t.query(api.fixers.fixerReport, { fixerToken: token, reportId })).toBeNull();
    }
  });

  test("rejects an invalid token", async () => {
    const { t } = setup();
    const reportId = await t.run((ctx) => insertReport(ctx));
    await expect(t.query(api.fixers.fixerReport, { fixerToken: "forged", reportId })).rejects.toThrow(
      /Invalid fixer token/,
    );
  });
});
