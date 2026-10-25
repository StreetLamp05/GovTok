// @vitest-environment jsdom
import { renderHook } from "@testing-library/react";
import { beforeEach, expect, test, vi } from "vitest";

// Fresh module per test, like a fresh page load (the hook keeps an in-memory flag).
async function load() {
  vi.resetModules();
  return (await import("./useDemoMode")).useDemoMode;
}

beforeEach(() => {
  sessionStorage.clear();
  window.history.replaceState(null, "", "/");
});

test("is off without the query param", async () => {
  const useDemoMode = await load();
  expect(renderHook(() => useDemoMode()).result.current).toBe(false);
});

test("ignores other demo values", async () => {
  window.history.replaceState(null, "", "/?demo=berkeley");
  const useDemoMode = await load();
  expect(renderHook(() => useDemoMode()).result.current).toBe(false);
});

test("stays on after the query param is gone", async () => {
  window.history.replaceState(null, "", "/?demo=mableton");
  let useDemoMode = await load();
  expect(renderHook(() => useDemoMode()).result.current).toBe(true);

  window.history.replaceState(null, "", "/map");
  expect(renderHook(() => useDemoMode()).result.current).toBe(true);

  // A full reload in the same tab: only sessionStorage remembers it.
  useDemoMode = await load();
  expect(renderHook(() => useDemoMode()).result.current).toBe(true);
});
