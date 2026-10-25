"use client";

import { useCurrentLocation } from "@/lib/hooks/useCurrentLocation";

// Post stub (US6): shows the location state so denying permission can be checked on a phone.
// The capture card replaces the rest.
export default function PostPage() {
  const location = useCurrentLocation();

  return (
    <main className="flex flex-col gap-4 p-6">
      <h1 className="text-2xl font-extrabold">Post a problem</h1>
      {location.status === "loading" && <p className="text-[#4A5A6E]">Finding your location…</p>}
      {location.status === "ready" && (
        <p className="text-[#4A5A6E]">
          {location.simulated ? "Demo location" : "Your location"}: {location.point.lat.toFixed(5)},{" "}
          {location.point.lng.toFixed(5)}
          {location.accuracy !== null && ` (±${Math.round(location.accuracy)} m)`}
        </p>
      )}
      {location.status !== "loading" && location.status !== "ready" && (
        <div role="alert" className="rounded-lg border border-[#F5C2C0] bg-[#FDECEC] p-4 text-[#8A1C1C]">
          <p className="font-bold">
            {location.status === "denied" ? "Location is turned off for GovTok" : "We couldn't find your location"}
          </p>
          <p className="mt-1 text-sm">
            {location.status === "denied"
              ? "Reports are pinned to where they were filmed. Allow location for this site in your browser settings, then try again."
              : "Make sure location services are on and you have a clear view of the sky, then try again."}
          </p>
          <button
            onClick={location.refresh}
            className="mt-3 rounded-lg bg-[#157A47] px-4 py-2 text-sm font-semibold text-white"
          >
            Try again
          </button>
        </div>
      )}
    </main>
  );
}
