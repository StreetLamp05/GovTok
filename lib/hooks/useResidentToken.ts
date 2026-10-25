"use client";

import { useSyncExternalStore } from "react";

// Resident identity (§3.1.1): a random UUID kept in localStorage. If storage throws
// (blocked, quota), fall back to a token that lives for this page session only.
const STORAGE_KEY = "govtok.residentToken";

let cached: string | null = null;

export function getResidentToken(): string {
  if (cached) return cached;
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored) return (cached = stored);
    const fresh = crypto.randomUUID();
    window.localStorage.setItem(STORAGE_KEY, fresh);
    return (cached = fresh);
  } catch {
    return (cached = crypto.randomUUID());
  }
}

const subscribe = () => () => {};

/** The device's resident token, or null during server render and hydration. */
export function useResidentToken(): string | null {
  return useSyncExternalStore(subscribe, getResidentToken, () => null);
}
