"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

// Sound unlock (§5.1.1): phone browsers only autoplay muted, so the first tap or key press
// anywhere turns sound on for the rest of the session. Consumers decide whether to honor it
// (reports with `audioMuted` never do). The update comes from a discrete event, so React
// renders it synchronously; unmute in a layout effect to stay inside the user gesture.
const SoundContext = createContext(false);

const UNLOCK_EVENTS = ["pointerup", "touchend", "keydown"] as const;

export function SoundProvider({ children }: { children: ReactNode }) {
  const [unlocked, setUnlocked] = useState(false);

  useEffect(() => {
    if (unlocked) return;
    const unlock = () => setUnlocked(true);
    for (const type of UNLOCK_EVENTS) window.addEventListener(type, unlock, { capture: true });
    return () => {
      for (const type of UNLOCK_EVENTS) window.removeEventListener(type, unlock, { capture: true });
    };
  }, [unlocked]);

  return <SoundContext.Provider value={unlocked}>{children}</SoundContext.Provider>;
}

/** True once the user has tapped anywhere this session. */
export function useSoundUnlocked(): boolean {
  return useContext(SoundContext);
}
