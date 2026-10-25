/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { expect, test } from "vitest";
import { api } from "./_generated/api";
import schema from "./schema";

const modules = import.meta.glob(["./**/*.ts", "./**/*.js", "!./**/*.test.ts", "!./**/*.d.ts"]);

test("bump creates the placeholder row, then increments it", async () => {
  const t = convexTest(schema, modules);

  expect(await t.query(api.placeholder.get, {})).toBeNull();

  expect(await t.mutation(api.placeholder.bump, {})).toBe(1);
  expect(await t.mutation(api.placeholder.bump, {})).toBe(2);

  const row = await t.query(api.placeholder.get, {});
  expect(row?.count).toBe(2);
});
