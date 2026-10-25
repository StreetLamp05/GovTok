import { expect, test } from "vitest";
import { daysLabel, daysOpen } from "../../lib/days";

const DAY_MS = 86_400_000;

test("daysOpen counts whole days and never goes negative", () => {
  expect(daysOpen(0, 23 * DAY_MS + 5)).toBe(23);
  expect(daysOpen(0, DAY_MS - 1)).toBe(0);
  expect(daysOpen(10, 0)).toBe(0);
});

test("daysLabel", () => {
  expect(daysLabel(0)).toBe("0 days");
  expect(daysLabel(1)).toBe("1 day");
  expect(daysLabel(23)).toBe("23 days");
});
