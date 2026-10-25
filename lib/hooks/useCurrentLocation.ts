"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { DEMO_POINT, type LatLng } from "../demo";
import { useDemoMode } from "./useDemoMode";

export type LocationState =
  | { status: "loading" }
  | { status: "ready"; point: LatLng; accuracy: number | null; simulated: boolean }
  | { status: "denied" }
  | { status: "unavailable" }
  | { status: "timeout" };

const GEO_OPTIONS: PositionOptions = { enableHighAccuracy: true, timeout: 15_000, maximumAge: 0 };

const DEMO_STATE: LocationState = { status: "ready", point: DEMO_POINT, accuracy: null, simulated: true };
const UNAVAILABLE: LocationState = { status: "unavailable" };

const subscribe = () => () => {};
const hasGeolocation = () => "geolocation" in navigator;

function requestPosition(setState: (state: LocationState) => void) {
  navigator.geolocation.getCurrentPosition(
    (pos) =>
      setState({
        status: "ready",
        point: { lat: pos.coords.latitude, lng: pos.coords.longitude },
        accuracy: pos.coords.accuracy,
        simulated: false,
      }),
    (err) => {
      if (err.code === err.PERMISSION_DENIED) setState({ status: "denied" });
      else if (err.code === err.TIMEOUT) setState({ status: "timeout" });
      else setState(UNAVAILABLE);
    },
    GEO_OPTIONS,
  );
}

/**
 * The phone's current position (high accuracy). In demo mode it is DEMO_POINT (§6.1.1).
 * `refresh()` asks for a new fix, e.g. right before posting or recording a fix.
 */
export function useCurrentLocation(): LocationState & { refresh: () => void } {
  const demo = useDemoMode();
  const supported = useSyncExternalStore(subscribe, hasGeolocation, () => true);
  const [state, setState] = useState<LocationState>({ status: "loading" });

  useEffect(() => {
    if (!demo && supported) requestPosition(setState);
  }, [demo, supported]);

  const refresh = useCallback(() => {
    if (demo || !supported) return;
    setState((s) => (s.status === "ready" ? s : { status: "loading" }));
    requestPosition(setState);
  }, [demo, supported]);

  return { ...(demo ? DEMO_STATE : supported ? state : UNAVAILABLE), refresh };
}
