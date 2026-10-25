import { describe, expect, test } from "vitest";
import { CATEGORIES, OWNER_CHIP, OWNERS, routeCategory } from "../../../convex/lib/routing";

// The §2.1.2 table, restated by hand so a typo in ROUTING fails here.
const SPEC_TABLE = {
  pothole: ["cobb", "Cobb DOT"],
  signal_sign: ["cobb", "Cobb DOT"],
  drainage: ["cobb", "Cobb Water System (stormwater)"],
  water_leak: ["cobb", "Cobb Water System"],
  streetlight: ["utility", "Georgia Power"],
  trash_missed: ["city", "Mableton Sanitation"],
  code_violation: ["city", "Mableton Code Enforcement"],
  other: ["unknown", "Routing unclear"],
} as const;

describe("routeCategory", () => {
  test("the category list is exactly the §2.1.2 table", () => {
    expect([...CATEGORIES].sort()).toEqual(Object.keys(SPEC_TABLE).sort());
  });

  test.each(Object.entries(SPEC_TABLE))("%s routes to its §2.1.2 owner and agency", (category, [owner, agency]) => {
    expect(routeCategory(category)).toEqual({ category, owner, agency });
  });

  test.each(["", "graffiti", "POTHOLE", "toString"])("unknown category %j routes to other", (category) => {
    expect(routeCategory(category)).toEqual({ category: "other", owner: "unknown", agency: "Routing unclear" });
  });

  test("every owner has a chip color", () => {
    for (const owner of OWNERS) expect(OWNER_CHIP[owner].bg).toMatch(/^#[0-9A-F]{6}$/i);
  });
});
