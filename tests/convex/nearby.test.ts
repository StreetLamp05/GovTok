import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import type { MutationCtx } from "../../convex/_generated/server";
import schema from "../../convex/schema";
import { modules } from "./setup";

const CENTER = { lat: 33.8187, lng: -84.5824 };
const METERS_PER_DEGREE_LAT = 111_195;
const north = (meters: number) => ({ lat: CENTER.lat + meters / METERS_PER_DEGREE_LAT, lng: CENTER.lng });

async function insertReport(
  ctx: MutationCtx,
  residentId: Id<"residents">,
  title: string,
  point: { lat: number; lng: number },
  status: "open" | "fixed" | "held" = "open",
) {
  const image = await ctx.storage.store(new Blob(["frame"], { type: "image/jpeg" }));
  return await ctx.db.insert("reports", {
    residentId,
    mediaType: "video",
    frameStorageIds: [image],
    lat: point.lat,
    lng: point.lng,
    title,
    status,
    audioMuted: false,
    isSample: false,
    meTooCount: 0,
    lastActivityAt: 1,
    revealViews: 0,
    createdAt: 1,
  });
}

describe("nearbyOpen", () => {
  test("includes a report 40 m away, excludes one 60 m away and non-open reports", async () => {
    const t = convexTest(schema, modules);
    const ids = await t.run(async (ctx) => {
      const poster = await ctx.db.insert("residents", { token: "poster", createdAt: 1 });
      return {
        near: await insertReport(ctx, poster, "40 m away", north(40)),
        far: await insertReport(ctx, poster, "60 m away", north(60)),
        fixed: await insertReport(ctx, poster, "Fixed", north(10), "fixed"),
        held: await insertReport(ctx, poster, "Held", north(20), "held"),
      };
    });

    const result = await t.query(api.nearby.nearbyOpen, { ...CENTER, token: "resident" });
    expect(result.map(({ report }) => report._id)).toEqual([ids.near]);
    expect(result[0].distanceMeters).toBeCloseTo(40, 0);
  });

  test("returns only the three nearest reports and marks this token's own report", async () => {
    const t = convexTest(schema, modules);
    const seeded = await t.run(async (ctx) => {
      const own = await ctx.db.insert("residents", { token: "owner", createdAt: 1 });
      const other = await ctx.db.insert("residents", { token: "other", createdAt: 1 });
      return [
        await insertReport(ctx, other, "30 m", north(30)),
        await insertReport(ctx, own, "10 m", north(10)),
        await insertReport(ctx, other, "40 m", north(40)),
        await insertReport(ctx, other, "20 m", north(20)),
      ];
    });

    const result = await t.query(api.nearby.nearbyOpen, { ...CENTER, token: "owner" });
    expect(result.map(({ report }) => report._id)).toEqual([seeded[1], seeded[3], seeded[0]]);
    expect(result.map(({ report }) => report.title)).toEqual(["10 m", "20 m", "30 m"]);
    expect(result[0].isMine).toBe(true);
    expect(result.slice(1).every(({ isMine }) => !isMine)).toBe(true);
    expect(result[0].report).not.toHaveProperty("residentId");
  });

  test("returns an empty list when there are no nearby open reports", async () => {
    const t = convexTest(schema, modules);
    expect(await t.query(api.nearby.nearbyOpen, { ...CENTER, token: "unknown" })).toEqual([]);
  });

  test("finds nearby reports across the international date line", async () => {
    const t = convexTest(schema, modules);
    const id = await t.run(async (ctx) => {
      const resident = await ctx.db.insert("residents", { token: "poster", createdAt: 1 });
      return await insertReport(ctx, resident, "Across the date line", { lat: 0, lng: -179.9999 });
    });

    const result = await t.query(api.nearby.nearbyOpen, { lat: 0, lng: 179.9999, token: "resident" });
    expect(result.map(({ report }) => report._id)).toEqual([id]);
    expect(result[0].distanceMeters).toBeLessThan(50);
  });
});
