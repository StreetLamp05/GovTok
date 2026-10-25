import { beforeEach, describe, expect, test, vi } from "vitest";
import { convertClip } from "../../../lib/media/convertClip";
import { clipDurationS } from "../../../lib/media/frames";
import { normalizeClip } from "../../../lib/media/normalizeClip";

// The decoding is covered in real Chromium (tests/browser/media/convertClip.test.ts).
vi.mock("../../../lib/media/convertClip", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../../lib/media/convertClip")>()),
  convertClip: vi.fn(),
}));
vi.mock("../../../lib/media/frames", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../../lib/media/frames")>()),
  clipDurationS: vi.fn(),
}));

const converted = new Blob(["converted"], { type: "video/mp4" });
const clip = (type: string) => new Blob(["x"], { type });

beforeEach(() => {
  vi.mocked(convertClip).mockReset().mockResolvedValue(converted);
  vi.mocked(clipDurationS).mockReset().mockResolvedValue(12);
});

describe("normalizeClip", () => {
  test("converts an iPhone .mov, passing the options through, and starts it before any await", () => {
    const options = { onProgress: vi.fn(), audio: false };
    const file = clip("video/quicktime");
    void normalizeClip(file, options);
    // Synchronously, inside the caller's tap.
    expect(convertClip).toHaveBeenCalledWith(file, options);
    expect(clipDurationS).not.toHaveBeenCalled();
  });

  test("converts an MP4 that runs over 20 s", async () => {
    vi.mocked(clipDurationS).mockResolvedValue(45);
    expect(await normalizeClip(clip("video/mp4"))).toBe(converted);
  });

  test("passes a short MP4 through", async () => {
    const file = clip("video/mp4");
    expect(await normalizeClip(file)).toBe(file);
    expect(convertClip).not.toHaveBeenCalled();
  });

  test("passes a clip whose length can't be read through", async () => {
    vi.mocked(clipDurationS).mockRejectedValue(new Error("no metadata"));
    const file = clip("video/webm");
    expect(await normalizeClip(file)).toBe(file);
  });
});
