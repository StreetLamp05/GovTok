import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";
import { api } from "../../../convex/_generated/api";
import schema from "../../../convex/schema";
import { findResident, getOrCreateResident, requireFixer } from "../../../convex/lib/auth";
import { modules } from "../setup";

describe("getOrCreateResident / findResident", () => {
  test("is idempotent: the same token always resolves to one resident", async () => {
    const t = convexTest(schema, modules);
    const [a, b] = await t.run(async (ctx) => [
      await getOrCreateResident(ctx, "device-1"),
      await getOrCreateResident(ctx, "device-1"),
    ]);
    expect(a).toBe(b);
    const residents = await t.run((ctx) => ctx.db.query("residents").collect());
    expect(residents).toHaveLength(1);
    expect(residents[0].token).toBe("device-1");
  });

  test("different tokens get different residents", async () => {
    const t = convexTest(schema, modules);
    const [a, b] = await t.run(async (ctx) => [
      await getOrCreateResident(ctx, "device-1"),
      await getOrCreateResident(ctx, "device-2"),
    ]);
    expect(a).not.toBe(b);
  });

  test("rejects an empty or blank token", async () => {
    const t = convexTest(schema, modules);
    await expect(t.run((ctx) => getOrCreateResident(ctx, ""))).rejects.toThrow(/device token/);
    await expect(t.run((ctx) => getOrCreateResident(ctx, "   "))).rejects.toThrow(/device token/);
  });

  test("findResident returns the resident for a known token and null otherwise", async () => {
    const t = convexTest(schema, modules);
    const id = await t.run((ctx) => getOrCreateResident(ctx, "device-1"));
    expect(await t.run((ctx) => findResident(ctx, "device-1"))).toBe(id);
    expect(await t.run((ctx) => findResident(ctx, "never-seen"))).toBeNull();
    expect(await t.run((ctx) => findResident(ctx, ""))).toBeNull();
    const residents = await t.run((ctx) => ctx.db.query("residents").collect());
    expect(residents).toHaveLength(1);
  });
});

describe("requireFixer", () => {
  test("returns the fixer for a valid token and rejects bad or empty ones", async () => {
    const t = convexTest(schema, modules);
    await t.run((ctx) =>
      ctx.db.insert("fixers", { name: "Dana", org: "Mableton Sanitation", passcode: "4821", token: "fixer-token" }),
    );
    const fixer = await t.run((ctx) => requireFixer(ctx, "fixer-token"));
    expect(fixer.org).toBe("Mableton Sanitation");
    await expect(t.run((ctx) => requireFixer(ctx, "wrong"))).rejects.toThrow(/Invalid fixer token/);
    await expect(t.run((ctx) => requireFixer(ctx, ""))).rejects.toThrow(/Missing fixer token/);
  });
});

describe("generateUploadUrl", () => {
  test("works for a never-seen device token and creates its resident", async () => {
    const t = convexTest(schema, modules);
    const url = await t.mutation(api.files.generateUploadUrl, { token: "brand-new-device" });
    expect(url).toEqual(expect.any(String));
    const residents = await t.run((ctx) => ctx.db.query("residents").collect());
    expect(residents.map((r) => r.token)).toEqual(["brand-new-device"]);
  });

  test("reuses the resident on later uploads", async () => {
    const t = convexTest(schema, modules);
    await t.mutation(api.files.generateUploadUrl, { token: "device-1" });
    await t.mutation(api.files.generateUploadUrl, { token: "device-1" });
    expect(await t.run((ctx) => ctx.db.query("residents").collect())).toHaveLength(1);
  });

  test("rejects an empty token or no token, and creates nothing", async () => {
    const t = convexTest(schema, modules);
    await expect(t.mutation(api.files.generateUploadUrl, { token: "" })).rejects.toThrow(/device token/);
    await expect(t.mutation(api.files.generateUploadUrl, {})).rejects.toThrow(/device token/);
    expect(await t.run((ctx) => ctx.db.query("residents").collect())).toHaveLength(0);
  });

  test("accepts a valid fixer token and rejects an invalid one", async () => {
    const t = convexTest(schema, modules);
    await t.run((ctx) =>
      ctx.db.insert("fixers", { name: "Dana", org: "Mableton Sanitation", passcode: "4821", token: "fixer-token" }),
    );
    expect(await t.mutation(api.files.generateUploadUrl, { fixerToken: "fixer-token" })).toEqual(expect.any(String));
    await expect(t.mutation(api.files.generateUploadUrl, { fixerToken: "nope" })).rejects.toThrow(/Invalid fixer token/);
    expect(await t.run((ctx) => ctx.db.query("residents").collect())).toHaveLength(0);
  });
});
