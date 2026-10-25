import { describe, expect, test } from "vitest";
import { convertedSize, needsConversion } from "../../../lib/media/convertClip";

const clip = (type: string, size = 4_000_000) => {
  const blob = new Blob(["x"], { type });
  Object.defineProperty(blob, "size", { value: size });
  return blob;
};

describe("needsConversion", () => {
  test.each([
    ["an iPhone .mov", "video/quicktime", 4_000_000, true],
    ["a file with no type", "", 4_000_000, true],
    ["a 3GP clip", "video/3gpp", 4_000_000, true],
    ["an MP4 under 25 MB", "video/mp4", 25_000_000, false],
    ["a WebM with codecs", "video/webm;codecs=vp9", 4_000_000, false],
    ["an MP4 over 25 MB", "video/mp4", 25_000_001, true],
  ])("%s → %s", (_, type, size, expected) => {
    expect(needsConversion(clip(type, size))).toBe(expected);
  });
});

describe("convertedSize", () => {
  test("a 4K portrait iPhone clip comes out 720×1280", () => {
    expect(convertedSize(2160, 3840)).toEqual({ width: 720, height: 1280 });
  });

  test("never scales up, and keeps both sides even for the encoder", () => {
    expect(convertedSize(640, 360)).toEqual({ width: 640, height: 360 });
    expect(convertedSize(1921, 1081)).toEqual({ width: 1280, height: 720 });
    expect(convertedSize(333, 501)).toEqual({ width: 332, height: 500 });
  });
});
