import { expect, test } from "vitest";
import { SCREENING_FAILED_REASON } from "../../../convex/lib/screening";

test("the screening-failed reason is the §4.2.1 string", () => {
  expect(SCREENING_FAILED_REASON).toBe("screening failed");
});
