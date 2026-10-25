import { expect, test } from "vitest";
import { evenTimes, frameSize, pickEvenly } from "../../../lib/media/frames";

const range = (n: number) => Array.from({ length: n }, (_, i) => i);

test("keeps 6 evenly spaced frames from a full 20 s recording, first and last included", () => {
  // One grab at start, one every 500 ms after it, and one at stop: 41 for a full 20 s clip.
  expect(pickEvenly(range(41))).toEqual([0, 8, 16, 24, 32, 40]);
});

test("keeps 6 from any longer list, spread across it", () => {
  for (const n of [7, 10, 13, 25, 100]) {
    const kept = pickEvenly(range(n));
    expect(kept).toHaveLength(6);
    expect(kept[0]).toBe(0);
    expect(kept[5]).toBe(n - 1);
    expect(new Set(kept).size).toBe(6);
    const gaps = kept.slice(1).map((v, i) => v - kept[i]);
    expect(Math.max(...gaps) - Math.min(...gaps)).toBeLessThanOrEqual(1);
  }
});

test("returns short lists unchanged (a clip shorter than 6 grabs)", () => {
  expect(pickEvenly(range(6))).toEqual(range(6));
  expect(pickEvenly(range(3))).toEqual(range(3));
  expect(pickEvenly([])).toEqual([]);
});

test("returns a copy, not the input array", () => {
  const input = range(4);
  expect(pickEvenly(input)).not.toBe(input);
});

test("seek times run from 0 to just before the end", () => {
  const times = evenTimes(10.1);
  expect(times).toHaveLength(6);
  expect(times[0]).toBe(0);
  expect(times[5]).toBeCloseTo(10);
  expect(times.map((t) => Number(t.toFixed(6)))).toEqual([0, 2, 4, 6, 8, 10]);
});

test("seek times for a clip shorter than the end margin stay at 0", () => {
  expect(evenTimes(0.05)).toEqual([0, 0, 0, 0, 0, 0]);
});

test("frames are capped at 1280 px on the long edge, portrait or landscape, and never scaled up", () => {
  expect(frameSize(1080, 1920)).toEqual({ width: 720, height: 1280 });
  expect(frameSize(1920, 1080)).toEqual({ width: 1280, height: 720 });
  expect(frameSize(720, 1280)).toEqual({ width: 720, height: 1280 });
  expect(frameSize(480, 640)).toEqual({ width: 480, height: 640 });
});
