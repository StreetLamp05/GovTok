import { beforeEach, describe, expect, test, vi } from "vitest";
import { HEIC_HINT, noPhotosMessage, prepareJpegs, UNREADABLE_PHOTOS } from "../../../lib/media/preparePhotos";

// The resize itself runs in real Chromium (tests/browser/media/photoToJpeg.test.ts). Here each
// "photo" converts to a JPEG named after it, unless its name says it can't be read.
const { toJpeg } = vi.hoisted(() => ({ toJpeg: vi.fn() }));
vi.mock("../../../lib/media/photos", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../../lib/media/photos")>()),
  photoToJpeg: toJpeg,
}));

const file = (name: string, type = "image/jpeg") => new File([name], name, { type });

beforeEach(() => {
  toJpeg.mockReset().mockImplementation(async (f: File) => {
    if (f.name.startsWith("bad")) throw new Error("decode failed");
    return new Blob([`jpeg of ${f.name}`], { type: "image/jpeg" });
  });
});

describe("prepareJpegs", () => {
  test("converts each photo, in order, one at a time", async () => {
    const out = await prepareJpegs([file("a.jpg"), file("b.png", "image/png")]);
    expect(await Promise.all(out.jpegs.map((j) => j.text()))).toEqual(["jpeg of a.jpg", "jpeg of b.png"]);
    expect(out).toMatchObject({ cut: 0, unreadable: 0, heic: false });
  });

  test("keeps the first 10 and counts the rest as cut", async () => {
    const files = Array.from({ length: 13 }, (_, i) => file(`p${i}.jpg`));
    const out = await prepareJpegs(files);
    expect(out.jpegs).toHaveLength(10);
    expect(out.cut).toBe(3);
    expect(toJpeg).toHaveBeenCalledTimes(10);
  });

  test("leaves out photos that can't be read, and notes when one was HEIC", async () => {
    const out = await prepareJpegs([file("a.jpg"), file("bad.heic", "image/heic"), file("bad2.jpg")]);
    expect(out.jpegs).toHaveLength(1);
    expect(out).toMatchObject({ unreadable: 2, heic: true });
  });

  test("the message for nothing readable names HEIC only when that's why", () => {
    expect(noPhotosMessage(true)).toBe(HEIC_HINT);
    expect(noPhotosMessage(false)).toBe(UNREADABLE_PHOTOS);
  });
});
