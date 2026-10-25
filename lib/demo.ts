// Demo location mode (§6.1.1): `?demo=mableton` swaps the phone's GPS for DEMO_POINT.
export const DEMO_PARAM = "demo";
export const DEMO_VALUE = "mableton";

export type LatLng = { lat: number; lng: number };

// Downtown Mableton, GA (the town's published center point, 33°48′57″N 84°34′57″W).
// US25 seeds the sample reports around it.
export const DEMO_POINT: LatLng = { lat: 33.8158, lng: -84.5825 };
