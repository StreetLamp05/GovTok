"use client";

import { AdvancedMarker, APIProvider, Map as GoogleMap } from "@vis.gl/react-google-maps";
import { useState } from "react";
import type { LatLng } from "@/lib/demo";

type Props = {
  initialPoint: LatLng;
  onConfirm: (point: LatLng) => void;
  onCancel: () => void;
};

export default function LocationPicker({ initialPoint, onConfirm, onCancel }: Props) {
  const [point, setPoint] = useState(initialPoint);
  const [hasPlacedPin, setHasPlacedPin] = useState(false);
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY;
  const mapId = process.env.NEXT_PUBLIC_GOOGLE_MAP_ID;

  return (
    <main className="flex h-[calc(100dvh-4rem)] flex-col gap-3 p-4">
      <header>
        <h1 className="text-[23px] font-semibold tracking-[-0.03em] text-[#18382F]">Choose the problem&apos;s location</h1>
        <p className="mt-1 text-sm text-[#68756F]">Tap the map to place the pin where the problem is.</p>
      </header>
      {apiKey && mapId ? (
        <div className="min-h-0 flex-1 overflow-hidden rounded-xl">
          <APIProvider apiKey={apiKey}>
            <GoogleMap
              mapId={mapId}
              defaultCenter={initialPoint}
              defaultZoom={16}
              gestureHandling="greedy"
              disableDefaultUI
              clickableIcons={false}
              className="h-full w-full"
              onClick={(event) => {
                const { latLng } = event.detail;
                if (latLng) {
                  setPoint({ lat: latLng.lat, lng: latLng.lng });
                  setHasPlacedPin(true);
                }
              }}
            >
              <AdvancedMarker position={point} title="Selected problem location">
                <div
                  aria-label="Selected location pin"
                  className="h-7 w-7 rounded-full border-[4px] border-white bg-[#B42318] shadow-[0_2px_8px_rgba(0,0,0,.35)]"
                />
              </AdvancedMarker>
            </GoogleMap>
          </APIProvider>
        </div>
      ) : (
        <p role="alert" className="rounded-lg border border-[#F5C2C0] bg-[#FDECEC] p-4 text-sm text-[#8A1C1C]">
          The map isn&apos;t configured. Add NEXT_PUBLIC_GOOGLE_MAPS_KEY and NEXT_PUBLIC_GOOGLE_MAP_ID to enable pin
          selection.
        </p>
      )}
      <p className="text-center text-xs text-[#68756F]" aria-live="polite">
        Selected pin: {point.lat.toFixed(5)}, {point.lng.toFixed(5)}
      </p>
      <div className="flex gap-3">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 rounded-lg border px-4 py-3 font-semibold"
        >
          Back
        </button>
        <button
          type="button"
          onClick={() => onConfirm(point)}
          disabled={!apiKey || !mapId || !hasPlacedPin}
          className="flex-1 rounded-xl bg-[#173F35] px-4 py-3 font-semibold text-white transition-colors hover:bg-[#245446] disabled:opacity-40"
        >
          Use this pin
        </button>
      </div>
    </main>
  );
}
