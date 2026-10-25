import { convexTest } from "convex-test";
import { afterEach, describe, expect, test, vi } from "vitest";
import { api, internal } from "./_generated/api";
import schema from "./schema";
import { modules } from "../tests/convex/setup";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("video intake admin access", () => {
  test("admin login issues a random session for the configured passcode", async () => {
    vi.stubEnv("ADMIN_PASSCODE", "test-admin-passcode");
    const t = convexTest(schema, modules);

    const session = await t.action(api.videoIntakeAuth.login, { passcode: "test-admin-passcode" });

    expect(session.token).toMatch(/^[a-f0-9]{64}$/);
    expect(session.expiresAt).toBeGreaterThan(Date.now());
    await expect(
      t.action(api.videoIntakeAuth.login, { passcode: "wrong-passcode" }),
    ).rejects.toThrow(/Invalid admin passcode/);
  });

  test("rejects requests without a valid admin session", async () => {
    const t = convexTest(schema, modules);

    await expect(t.mutation(api.videoIntake.generateUploadUrl, { sessionToken: "" })).rejects.toThrow(
      /Admin login required/,
    );
    await expect(t.query(api.videoIntake.listRecent, { sessionToken: "invalid" })).rejects.toThrow(
      /Admin session expired/,
    );
  });

  test("allows an active session to request an upload URL", async () => {
    const t = convexTest(schema, modules);
    await t.mutation(internal.videoIntakeDb.createAdminSession, {
      token: "admin-session",
      expiresAt: Date.now() + 60_000,
    });

    await expect(
      t.mutation(api.videoIntake.generateUploadUrl, { sessionToken: "admin-session" }),
    ).resolves.toEqual(expect.any(String));
  });

  test("checks stored file size instead of trusting client metadata", async () => {
    const t = convexTest(schema, modules);
    await t.mutation(internal.videoIntakeDb.createAdminSession, {
      token: "admin-session",
      expiresAt: Date.now() + 60_000,
    });
    const storageId = await t.run((ctx) => ctx.storage.store(new Blob(["clip"])));

    await expect(
      t.mutation(api.videoIntake.saveUpload, {
        sessionToken: "admin-session",
        storageId,
        fileName: "clip.mp4",
        contentType: "video/mp4",
        fileSize: 999,
      }),
    ).rejects.toThrow(/size does not match/);
  });

  test("purges expired intake records and their stored video", async () => {
    const t = convexTest(schema, modules);
    const storageId = await t.run((ctx) => ctx.storage.store(new Blob(["expired clip"])));
    const id = await t.run((ctx) =>
      ctx.db.insert("videoIntake", {
        storageId,
        fileName: "expired.mp4",
        contentType: "video/mp4",
        fileSize: 12,
        status: "complete",
        transcript: "expired transcript",
        createdAt: Date.now() - 8 * 24 * 60 * 60 * 1000,
        updatedAt: Date.now(),
      }),
    );

    await t.mutation(internal.videoIntake.purgeExpired, { id });

    await t.run(async (ctx) => {
      expect(await ctx.db.get(id)).toBeNull();
      expect(await ctx.db.system.get(storageId)).toBeNull();
    });
  });

  test("rejects expired sessions", async () => {
    const t = convexTest(schema, modules);
    await t.mutation(internal.videoIntakeDb.createAdminSession, {
      token: "expired-session",
      expiresAt: Date.now() - 1,
    });

    await expect(
      t.query(api.videoIntake.listRecent, { sessionToken: "expired-session" }),
    ).rejects.toThrow(/Admin session expired/);
  });
});
