// @vitest-environment jsdom
import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { DEMO_POINT } from "../../../lib/demo";

const ERROR_CODES = { PERMISSION_DENIED: 1, POSITION_UNAVAILABLE: 2, TIMEOUT: 3 };

function mockGeolocation(getCurrentPosition: Geolocation["getCurrentPosition"] | undefined) {
  if (getCurrentPosition) {
    Object.defineProperty(navigator, "geolocation", {
      configurable: true,
      value: { getCurrentPosition: vi.fn(getCurrentPosition) },
    });
  } else {
    // @ts-expect-error removing a browser API for the test
    delete navigator.geolocation;
  }
}

async function load() {
  vi.resetModules();
  return (await import("../../../lib/hooks/useCurrentLocation")).useCurrentLocation;
}

beforeEach(() => {
  sessionStorage.clear();
  window.history.replaceState(null, "", "/post");
});

afterEach(() => mockGeolocation(undefined));

test("returns DEMO_POINT in demo mode without asking for GPS", async () => {
  mockGeolocation(() => {});
  window.history.replaceState(null, "", "/post?demo=mableton");
  const useCurrentLocation = await load();

  const { result } = renderHook(() => useCurrentLocation());

  expect(result.current).toMatchObject({ status: "ready", point: DEMO_POINT, simulated: true });
  expect(navigator.geolocation.getCurrentPosition).not.toHaveBeenCalled();
});

test("reports a denied state when the user blocks location", async () => {
  mockGeolocation((_ok, fail) =>
    fail?.({ code: 1, message: "User denied Geolocation", ...ERROR_CODES } as GeolocationPositionError),
  );
  const useCurrentLocation = await load();

  const { result } = renderHook(() => useCurrentLocation());

  await waitFor(() => expect(result.current.status).toBe("denied"));
});

test("reports a timeout separately from denial", async () => {
  mockGeolocation((_ok, fail) => fail?.({ code: 3, message: "Timeout", ...ERROR_CODES } as GeolocationPositionError));
  const useCurrentLocation = await load();

  const { result } = renderHook(() => useCurrentLocation());

  await waitFor(() => expect(result.current.status).toBe("timeout"));
});

test("asks for a high-accuracy fix with a timeout and returns it", async () => {
  mockGeolocation((ok) =>
    ok({ coords: { latitude: 37.87, longitude: -122.26, accuracy: 8 } } as GeolocationPosition),
  );
  const useCurrentLocation = await load();

  const { result } = renderHook(() => useCurrentLocation());

  await waitFor(() =>
    expect(result.current).toMatchObject({
      status: "ready",
      point: { lat: 37.87, lng: -122.26 },
      accuracy: 8,
      simulated: false,
    }),
  );
  const options = vi.mocked(navigator.geolocation.getCurrentPosition).mock.calls[0][2];
  expect(options).toMatchObject({ enableHighAccuracy: true });
  expect(options?.timeout).toBeGreaterThan(0);
});

test("is unavailable when the browser has no geolocation", async () => {
  mockGeolocation(undefined);
  const useCurrentLocation = await load();

  const { result } = renderHook(() => useCurrentLocation());

  await waitFor(() => expect(result.current.status).toBe("unavailable"));
});
