import { expect, test } from "vitest";
import { MIME_TYPE_PREFERENCE, normalizeMimeType, pickMimeType } from "../../../lib/media/mimeType";

const supports = (...types: string[]) => (type: string) => types.includes(type);

test("prefers mp4 with H.264 and AAC when supported (Safari, recent Chrome)", () => {
  expect(pickMimeType(supports("video/mp4;codecs=avc1,mp4a.40.2", "video/mp4", "video/webm"))).toBe(
    "video/mp4;codecs=avc1,mp4a.40.2",
  );
});

test("falls back to plain mp4, then webm", () => {
  expect(pickMimeType(supports("video/mp4", "video/webm"))).toBe("video/mp4");
  expect(pickMimeType(supports("video/webm"))).toBe("video/webm");
});

test("returns empty so the browser picks its default when nothing matches", () => {
  expect(pickMimeType(() => false)).toBe("");
});

test("normalizes recorder MIME types before sending them as upload headers", () => {
  expect(normalizeMimeType("video/mp4;codecs=avc1,mp4a.40.2")).toBe("video/mp4");
  expect(normalizeMimeType(" Video/WEBM ; codecs=vp9,opus ")).toBe("video/webm");
  expect(normalizeMimeType("")).toBe("");
});

test("asks in preference order and stops at the first match", () => {
  const asked: string[] = [];
  pickMimeType((type) => {
    asked.push(type);
    return type === "video/mp4";
  });
  expect(asked).toEqual(["video/mp4;codecs=avc1,mp4a.40.2", "video/mp4"]);
  expect(MIME_TYPE_PREFERENCE.at(-1)).toBe("video/webm");
});
