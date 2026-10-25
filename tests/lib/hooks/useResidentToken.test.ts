// @vitest-environment jsdom
import { renderHook } from "@testing-library/react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

// Fresh module per test, like a fresh page load (the hook caches the token in memory).
async function load() {
  vi.resetModules();
  return (await import("../../../lib/hooks/useResidentToken")).useResidentToken;
}

beforeEach(() => localStorage.clear());
afterEach(() => vi.restoreAllMocks());

test("returns the same token across calls and page loads", async () => {
  let useResidentToken = await load();
  const first = renderHook(() => useResidentToken()).result.current;
  const second = renderHook(() => useResidentToken()).result.current;

  expect(first).toMatch(UUID);
  expect(second).toBe(first);
  expect(localStorage.getItem("govtok.residentToken")).toBe(first);

  useResidentToken = await load();
  expect(renderHook(() => useResidentToken()).result.current).toBe(first);
});

test("falls back to a stable per-session token when localStorage throws", async () => {
  vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
    throw new DOMException("blocked", "SecurityError");
  });
  vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
    throw new DOMException("blocked", "SecurityError");
  });

  const useResidentToken = await load();
  const first = renderHook(() => useResidentToken()).result.current;
  const second = renderHook(() => useResidentToken()).result.current;

  expect(first).toMatch(UUID);
  expect(second).toBe(first);
});
