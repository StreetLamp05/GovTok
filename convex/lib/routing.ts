import { v } from "convex/values";

// §2.1.2: Claude picks the category; this fixed table picks the owner. Claude never
// chooses the owner. ⚠️ Streetlight and water rows are unverified (§8 "Before ship", US28).

export const CATEGORIES = [
  "pothole",
  "signal_sign",
  "drainage",
  "water_leak",
  "streetlight",
  "trash_missed",
  "code_violation",
  "other",
] as const;
export type Category = (typeof CATEGORIES)[number];

export const OWNERS = ["city", "cobb", "utility", "unknown"] as const;
export type Owner = (typeof OWNERS)[number];

export const categoryValidator = v.union(...CATEGORIES.map((c) => v.literal(c)));
export const ownerValidator = v.union(...OWNERS.map((o) => v.literal(o)));

export const ROUTING: Record<Category, { owner: Owner; agency: string }> = {
  pothole: { owner: "cobb", agency: "Cobb DOT" },
  signal_sign: { owner: "cobb", agency: "Cobb DOT" },
  drainage: { owner: "cobb", agency: "Cobb Water System (stormwater)" },
  water_leak: { owner: "cobb", agency: "Cobb Water System" },
  streetlight: { owner: "utility", agency: "Georgia Power" },
  trash_missed: { owner: "city", agency: "Mableton Sanitation" },
  code_violation: { owner: "city", agency: "Mableton Code Enforcement" },
  other: { owner: "unknown", agency: "Routing unclear" },
};

export function isCategory(value: string): value is Category {
  return (CATEGORIES as readonly string[]).includes(value);
}

// Any category string Claude returns that isn't in the table falls back to `other`.
export function routeCategory(category: string): { category: Category; owner: Owner; agency: string } {
  const known = isCategory(category) ? category : "other";
  return { category: known, ...ROUTING[known] };
}

// Owner chip colors, from the UI prototype's ownerMeta (spec/UI_mockups).
export const OWNER_CHIP: Record<Owner, { label: string; dot: string; bg: string; fg: string }> = {
  city: { label: "City of Mableton", dot: "#2DD4BF", bg: "#E3F5F2", fg: "#0F5E56" },
  cobb: { label: "Cobb County", dot: "#60A5FA", bg: "#E7EFFD", fg: "#1E429F" },
  utility: { label: "Utility", dot: "#FBBF24", bg: "#FDF3DC", fg: "#7A4306" },
  unknown: { label: "Not routed", dot: "#CBD5E1", bg: "#EDF0F3", fg: "#46505C" },
};
