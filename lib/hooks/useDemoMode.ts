"use client";

import { useSyncExternalStore } from "react";
import { DEMO_PARAM, DEMO_VALUE } from "../demo";

// Demo mode (§6.1.1): on once `?demo=<DEMO_VALUE>` (e.g. `?demo=sf`) appears, then kept in sessionStorage so it
// survives navigation until the tab closes. In-memory fallback when storage throws.
const STORAGE_KEY = "govtok.demoMode";

let memoryFlag = false;

export function isDemoMode(): boolean {
  if (new URLSearchParams(window.location.search).get(DEMO_PARAM) === DEMO_VALUE) {
    memoryFlag = true;
    try {
      window.sessionStorage.setItem(STORAGE_KEY, "1");
    } catch {}
    return true;
  }
  if (memoryFlag) return true;
  try {
    return window.sessionStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

const subscribe = () => () => {};

/** True when the location is simulated. Always false during server render and hydration. */
export function useDemoMode(): boolean {
  return useSyncExternalStore(subscribe, isDemoMode, () => false);
}
