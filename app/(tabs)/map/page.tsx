import { Suspense } from "react";
import MapScreen from "@/components/map/MapScreen";

// MapScreen reads ?report=<id> with useSearchParams, which needs a Suspense boundary.
export default function MapPage() {
  return (
    <Suspense>
      <MapScreen />
    </Suspense>
  );
}
