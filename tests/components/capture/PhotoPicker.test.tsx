// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import PhotoPicker from "../../../components/capture/PhotoPicker";

// The resize itself runs in real Chromium (tests/browser/media/photoToJpeg.test.ts). Here each
// file comes back as a JPEG named after it.
const toJpeg = vi.hoisted(() => vi.fn());
vi.mock("../../../lib/media/photos", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../../lib/media/photos")>()),
  photoToJpeg: toJpeg,
}));

const files = (n: number) => Array.from({ length: n }, (_, i) => new File([`photo ${i}`], `IMG_${i}.HEIC`, { type: "image/heic" }));

async function choose(picked: File[]) {
  const input = document.querySelector('input[type="file"]') as HTMLInputElement;
  Object.defineProperty(input, "files", { value: picked, configurable: true });
  await act(async () => fireEvent.change(input));
}

const useButton = () => screen.getByRole("button", { name: /^Use / }) as HTMLButtonElement;

beforeEach(() => {
  URL.createObjectURL = vi.fn((blob: Blob) => `blob:${(blob as File).name}`);
  URL.revokeObjectURL = vi.fn();
  toJpeg.mockReset().mockImplementation(async (file: File) => new File([file], `${file.name}.jpg`, { type: "image/jpeg" }));
});
afterEach(cleanup);

describe("PhotoPicker", () => {
  test("picks from the camera or the gallery, several at once", () => {
    render(<PhotoPicker onDone={vi.fn()} />);
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    expect(input.accept).toBe("image/*");
    expect(input.multiple).toBe(true);
    expect(input.hasAttribute("capture")).toBe(false);
  });

  test("picking 12 keeps the first 10, says 2 were left out, and hands back their JPEGs", async () => {
    const onDone = vi.fn();
    const picked = files(12);
    render(<PhotoPicker onDone={onDone} />);
    await choose(picked);

    expect(toJpeg.mock.calls.map(([file]) => file)).toEqual(picked.slice(0, 10));
    expect(screen.getAllByRole("img")).toHaveLength(10);
    expect(screen.getByRole("status").textContent).toMatch(/kept the first 10 and left out 2/);

    fireEvent.click(useButton());
    const jpegs = onDone.mock.calls[0][0] as File[];
    expect(jpegs.map((j) => j.name)).toEqual(picked.slice(0, 10).map((f) => `${f.name}.jpg`));
    expect(jpegs.every((j) => j.type === "image/jpeg")).toBe(true);
  });

  test("10 or fewer shows no cut notice", async () => {
    render(<PhotoPicker onDone={vi.fn()} />);
    await choose(files(3));
    expect(screen.getAllByRole("img")).toHaveLength(3);
    expect(screen.queryByRole("status")).toBeNull();
  });

  test("with 0 photos you can't continue", async () => {
    const onDone = vi.fn();
    render(<PhotoPicker onDone={onDone} />);
    expect(useButton().disabled).toBe(true);
    await choose([]);
    expect(useButton().disabled).toBe(true);
    fireEvent.click(useButton());
    expect(onDone).not.toHaveBeenCalled();
    expect(toJpeg).not.toHaveBeenCalled();
  });

  test("a photo that can't be read is left out, and the rest can still be used", async () => {
    const onDone = vi.fn();
    const picked = [new File(["a"], "a.jpg", { type: "image/jpeg" }), new File(["b"], "b.png", { type: "image/png" }), new File(["c"], "c.jpg", { type: "image/jpeg" })];
    toJpeg.mockImplementation(async (file: File) => {
      if (file.name === "b.png") throw new Error("decode failed");
      return new File([file], `${file.name}.jpg`, { type: "image/jpeg" });
    });
    render(<PhotoPicker onDone={onDone} />);
    await choose(picked);

    expect(screen.getAllByRole("img")).toHaveLength(2);
    expect(screen.getByRole("status").textContent).toBe("1 photo couldn't be read and was left out.");
    fireEvent.click(useButton());
    expect((onDone.mock.calls[0][0] as File[]).map((j) => j.name)).toEqual(["a.jpg.jpg", "c.jpg.jpg"]);
  });

  test("an unreadable HEIC says the browser can't open HEIC", async () => {
    toJpeg.mockImplementation(async (file: File) => {
      if (file.name.endsWith(".HEIC")) throw new Error("decode failed");
      return new File([file], `${file.name}.jpg`, { type: "image/jpeg" });
    });
    render(<PhotoPicker onDone={vi.fn()} />);
    await choose([...files(2), new File(["x"], "ok.jpg", { type: "image/jpeg" })]);
    expect(screen.getByRole("status").textContent).toBe(
      "2 photos couldn't be read and were left out. This browser can't open HEIC photos. Try JPEGs.",
    );
  });

  test("when no photo can be read there's an error and nothing to continue with", async () => {
    toJpeg.mockRejectedValue(new Error("decode failed"));
    render(<PhotoPicker onDone={vi.fn()} />);
    await choose([new File(["x"], "scan.tiff", { type: "image/tiff" })]);
    expect(screen.getByRole("alert").textContent).toBe("We couldn't read those photos. Try different ones.");
    expect(useButton().disabled).toBe(true);
  });

  test("when every photo is an unreadable HEIC, the error names HEIC", async () => {
    toJpeg.mockRejectedValue(new Error("decode failed"));
    render(<PhotoPicker onDone={vi.fn()} />);
    await choose(files(2));
    expect(screen.getByRole("alert").textContent).toBe("This browser can't open HEIC photos. Try JPEGs.");
    expect(useButton().disabled).toBe(true);
  });

  test("Choose again replaces the pick and revokes the old thumbnails", async () => {
    const onDone = vi.fn();
    render(<PhotoPicker onDone={onDone} />);
    await choose(files(2));
    await choose([new File(["x"], "NEW.HEIC", { type: "image/heic" })]);

    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:IMG_0.HEIC.jpg");
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:IMG_1.HEIC.jpg");
    fireEvent.click(screen.getByRole("button", { name: "Use this photo" }));
    expect((onDone.mock.calls[0][0] as File[]).map((j) => j.name)).toEqual(["NEW.HEIC.jpg"]);
  });

  test("a conversion that finishes after the picker has closed does nothing", async () => {
    let finishFirst!: () => void;
    toJpeg.mockImplementationOnce(
      (file: File) => new Promise((resolve) => (finishFirst = () => resolve(new File([file], "STALE.jpg", { type: "image/jpeg" })))),
    );
    const onDone = vi.fn();
    render(<PhotoPicker onDone={onDone} />);
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    Object.defineProperty(input, "files", { value: files(1), configurable: true });
    fireEvent.change(input);
    expect(screen.getByText("Preparing your photos…")).toBeTruthy();
    // While preparing there's no picker on screen, so a newer pick can only come after unmounting.
    expect(document.querySelector('input[type="file"]')).toBeNull();
    cleanup();
    await act(async () => finishFirst());
    expect(onDone).not.toHaveBeenCalled();
    expect(URL.createObjectURL).not.toHaveBeenCalled();
  });
});
