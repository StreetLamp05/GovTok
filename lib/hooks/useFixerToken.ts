"use client";

import { useSyncExternalStore } from "react";

// Fixer token (§3.1.2), kept in localStorage under its own key so it never mixes with the
// resident token (§3.1.1). If storage throws (blocked, quota), it lives in memory for this
// page session, so the passcode is asked again on the next load.
export const FIXER_TOKEN_KEY = "govtok.fixerToken";

let memory: string | null = null;
const listeners = new Set<() => void>();

function notify() {
  for (const listener of listeners) listener();
}

export function getFixerToken(): string | null {
  try {
    return window.localStorage.getItem(FIXER_TOKEN_KEY) ?? memory;
  } catch {
    return memory;
  }
}

// Memory holds the token only when storage refuses it; otherwise it would outlive a sign-out
// in another tab.
export function setFixerToken(token: string): void {
  try {
    window.localStorage.setItem(FIXER_TOKEN_KEY, token);
    memory = null;
  } catch {
    memory = token;
  }
  notify();
}

export function clearFixerToken(): void {
  memory = null;
  try {
    window.localStorage.removeItem(FIXER_TOKEN_KEY);
  } catch {}
  notify();
}

// The storage event covers other tabs, so signing out in one signs out all of them.
function subscribe(listener: () => void) {
  listeners.add(listener);
  window.addEventListener("storage", listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", listener);
  };
}

/** The stored fixer token, null when logged out, or undefined during server render and hydration. */
export function useFixerToken(): string | null | undefined {
  return useSyncExternalStore(subscribe, getFixerToken, () => undefined);
}
