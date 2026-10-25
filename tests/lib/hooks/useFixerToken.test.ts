// @vitest-environment jsdom
import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";

// Fresh module per test, like a fresh page load (the store keeps a memory fallback).
async function load() {
  vi.resetModules();
  return await import("../../../lib/hooks/useFixerToken");
}

beforeEach(() => localStorage.clear());
afterEach(() => vi.restoreAllMocks());

test("is null until set, then persists across page loads under its own key", async () => {
  let mod = await load();
  const { result } = renderHook(() => mod.useFixerToken());
  expect(result.current).toBeNull();

  act(() => mod.setFixerToken("fixer-abc"));
  expect(result.current).toBe("fixer-abc");
  expect(localStorage.getItem("govtok.fixerToken")).toBe("fixer-abc");

  mod = await load();
  expect(renderHook(() => mod.useFixerToken()).result.current).toBe("fixer-abc");
});

test("is separate from the resident token", async () => {
  const mod = await load();
  const { getResidentToken } = await import("../../../lib/hooks/useResidentToken");
  const resident = getResidentToken();
  mod.setFixerToken("fixer-abc");

  expect(mod.FIXER_TOKEN_KEY).not.toBe("govtok.residentToken");
  expect(localStorage.getItem("govtok.residentToken")).toBe(resident);
  mod.clearFixerToken();
  expect(localStorage.getItem("govtok.residentToken")).toBe(resident);
});

test("sign out clears it and re-renders", async () => {
  const mod = await load();
  mod.setFixerToken("fixer-abc");
  const { result } = renderHook(() => mod.useFixerToken());
  act(() => mod.clearFixerToken());
  expect(result.current).toBeNull();
  expect(localStorage.getItem("govtok.fixerToken")).toBeNull();
});

test("signing out in another tab signs this tab out too", async () => {
  const mod = await load();
  mod.setFixerToken("fixer-abc");
  const { result } = renderHook(() => mod.useFixerToken());
  expect(result.current).toBe("fixer-abc");

  // What the other tab's sign-out looks like from here.
  act(() => {
    localStorage.removeItem("govtok.fixerToken");
    window.dispatchEvent(new StorageEvent("storage", { key: "govtok.fixerToken", newValue: null }));
  });
  expect(result.current).toBeNull();
});

test("falls back to memory for this page session when localStorage throws", async () => {
  for (const method of ["getItem", "setItem", "removeItem"] as const) {
    vi.spyOn(Storage.prototype, method).mockImplementation(() => {
      throw new DOMException("blocked", "SecurityError");
    });
  }
  const mod = await load();
  const { result } = renderHook(() => mod.useFixerToken());
  act(() => mod.setFixerToken("fixer-abc"));
  expect(result.current).toBe("fixer-abc");
  act(() => mod.clearFixerToken());
  expect(result.current).toBeNull();
});
