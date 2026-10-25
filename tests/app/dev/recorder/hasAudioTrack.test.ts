import { expect, test } from "vitest";
import { hasAudioTrack } from "../../../../app/dev/recorder/hasAudioTrack";

const bytes = (...parts: (string | readonly number[])[]) =>
  new Blob(parts.map((p) => (typeof p === "string" ? new TextEncoder().encode(p) : new Uint8Array(p))));
// size, "hdlr", version/flags, pre_defined, handler type
const hdlr = (handler: string) => ["\0\0\0\x21hdlr", [0, 0, 0, 0], [0, 0, 0, 0], handler] as const;

test("finds an MP4 sound handler, and ignores a video-only MP4", async () => {
  expect(await hasAudioTrack(bytes("moov", ...hdlr("vide"), ...hdlr("soun")))).toBe(true);
  expect(await hasAudioTrack(bytes("moov", ...hdlr("vide")))).toBe(false);
});

test("finds a webm audio codec", async () => {
  expect(await hasAudioTrack(bytes("V_VP8....A_OPUS"))).toBe(true);
  expect(await hasAudioTrack(bytes("V_VP8...."))).toBe(false);
});

test("finds a sound handler in a moov at the end of a large file", async () => {
  const filler = new Array(3 << 20).fill(0);
  expect(await hasAudioTrack(bytes(filler, ...hdlr("soun")))).toBe(true);
});
