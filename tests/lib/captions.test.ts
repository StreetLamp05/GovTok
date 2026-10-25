import { describe, expect, test } from "vitest";
import { captionAt } from "../../lib/captions";

const segments = [
  { start: 0, end: 2.5, text: " This pothole has been here a month. " },
  { start: 2.5, end: 5, text: "Cars swerve into the bike lane." },
  // A gap from 5 to 6.
  { start: 6, end: 9, text: "Right by the school." },
];

describe("captionAt", () => {
  test("picks the segment containing currentTime", () => {
    expect(captionAt(segments, 0)).toBe("This pothole has been here a month.");
    expect(captionAt(segments, 1.2)).toBe("This pothole has been here a month.");
    expect(captionAt(segments, 3.9)).toBe("Cars swerve into the bike lane.");
    expect(captionAt(segments, 8.99)).toBe("Right by the school.");
  });

  test("a boundary belongs to the segment that starts there", () => {
    expect(captionAt(segments, 2.5)).toBe("Cars swerve into the bike lane.");
    expect(captionAt(segments, 6)).toBe("Right by the school.");
  });

  test("nothing in a gap, before the first segment or after the last", () => {
    expect(captionAt(segments, 5)).toBeNull();
    expect(captionAt(segments, 5.5)).toBeNull();
    expect(captionAt(segments, -1)).toBeNull();
    expect(captionAt(segments, 9)).toBeNull();
    expect(captionAt(segments, 120)).toBeNull();
  });

  test("overlapping segments show the later one", () => {
    const overlap = [
      { start: 0, end: 4, text: "first" },
      { start: 3, end: 6, text: "second" },
    ];
    expect(captionAt(overlap, 2)).toBe("first");
    expect(captionAt(overlap, 3.5)).toBe("second");
  });

  test("no segments or blank text shows nothing", () => {
    expect(captionAt(undefined, 1)).toBeNull();
    expect(captionAt([], 1)).toBeNull();
    expect(captionAt([{ start: 0, end: 4, text: "   " }], 1)).toBeNull();
  });
});
