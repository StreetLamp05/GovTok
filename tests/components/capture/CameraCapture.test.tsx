// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import CameraCapture, { type CaptureMode } from "../../../components/capture/CameraCapture";
import type { RecorderPhase } from "../../../lib/hooks/useClipRecorder";
import { grabFrame } from "../../../lib/media/frames";
import { prepareJpegs } from "../../../lib/media/preparePhotos";
import { useDemoMode } from "../../../lib/hooks/useDemoMode";

// The recording itself is useClipRecorder's (covered through tests/components/capture/
// VideoRecorder.test.tsx); here it's a fake whose phase each test sets.
const hook = vi.hoisted(() => ({
  phase: { kind: "preview" } as RecorderPhase,
  inPage: true,
  canStop: true,
  secondsLeft: 20,
  elapsedMs: 0,
  options: [] as { audio: boolean; autoOpen?: boolean }[],
  openCamera: vi.fn(),
  startRecording: vi.fn(),
  stopRecording: vi.fn(),
  takeFile: vi.fn(),
}));
vi.mock("../../../lib/hooks/useClipRecorder", () => ({
  useClipRecorder: (options: { audio: boolean; autoOpen?: boolean }) => {
    hook.options.push(options);
    const { phase } = hook;
    return {
      ...hook,
      videoRef: { current: document.createElement("video") },
      busy: phase.kind === "converting" || phase.kind === "processing" || phase.kind === "done",
      showCamera: phase.kind === "preview" || phase.kind === "recording",
    };
  },
}));
vi.mock("../../../lib/media/frames", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../../lib/media/frames")>()),
  grabFrame: vi.fn(),
}));
vi.mock("../../../lib/hooks/useDemoMode", () => ({ useDemoMode: vi.fn(() => false) }));
vi.mock("../../../lib/media/preparePhotos", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../../lib/media/preparePhotos")>()),
  prepareJpegs: vi.fn(),
}));

const onVideo = vi.fn();
const onPhotos = vi.fn();
const onClose = vi.fn();
let snapNo = 0;

beforeEach(() => {
  Object.assign(hook, { phase: { kind: "preview" }, inPage: true, canStop: true, secondsLeft: 20, elapsedMs: 0, options: [] });
  for (const fn of [hook.openCamera, hook.startRecording, hook.stopRecording, hook.takeFile, onVideo, onPhotos, onClose]) {
    fn.mockReset();
  }
  snapNo = 0;
  vi.mocked(grabFrame).mockReset().mockImplementation(async () => new Blob([`snap ${snapNo++}`], { type: "image/jpeg" }));
  vi.mocked(prepareJpegs).mockReset();
  vi.mocked(useDemoMode).mockReturnValue(false);
  let n = 0;
  URL.createObjectURL = vi.fn(() => `blob:thumb-${++n}`);
  URL.revokeObjectURL = vi.fn();
});
afterEach(cleanup);

function show(modes: CaptureMode[] = ["video", "photos"], extra: Partial<Parameters<typeof CameraCapture>[0]> = {}) {
  return render(
    <CameraCapture modes={modes} onVideo={onVideo} onPhotos={onPhotos} onClose={onClose} {...extra} />,
  );
}
const button = (name: string | RegExp) => screen.queryByRole("button", { name });
const tab = (name: string) => screen.getByRole("button", { name });
const uploadInput = () => screen.getByLabelText("Upload") as HTMLInputElement;
const rerender = (view: ReturnType<typeof show>) =>
  view.rerender(<CameraCapture modes={["video", "photos"]} onVideo={onVideo} onPhotos={onPhotos} onClose={onClose} />);

describe("CameraCapture", () => {
  test("is a full-screen camera that opens on its own, with sound for video", () => {
    show();
    expect(screen.getByRole("dialog", { name: "Camera" }).className).toMatch(/fixed inset-0/);
    expect(hook.options.at(-1)).toMatchObject({ audio: true, autoOpen: true });
  });

  test("a photos-only camera doesn't ask for the microphone", () => {
    show(["photos"]);
    expect(hook.options.at(-1)).toMatchObject({ audio: false });
  });

  test("Photo mode needs no microphone: after a failed (mic-denied) open, switching to Photo reopens without it", () => {
    hook.phase = { kind: "error", message: "Camera or microphone permission was denied." };
    show();
    expect(hook.options.at(-1)).toMatchObject({ audio: true });
    fireEvent.click(tab("Photo"));
    expect(hook.options.at(-1)).toMatchObject({ audio: false });
    expect(hook.openCamera).toHaveBeenCalledTimes(1);
  });

  test("a working camera isn't reopened for Photo, but a silent one is reopened for Video", () => {
    const view = show(["video", "photos"], { initialMode: "photos" });
    expect(hook.options.at(-1)).toMatchObject({ audio: false });
    fireEvent.click(tab("Video"));
    expect(hook.openCamera).toHaveBeenCalledTimes(1);
    expect(hook.options.at(-1)).toMatchObject({ audio: true });
    fireEvent.click(tab("Photo"));
    fireEvent.click(tab("Video"));
    // Already open with sound.
    expect(hook.openCamera).toHaveBeenCalledTimes(1);
    view.unmount();
  });

  test("in demo mode the camera still shows the 'location simulated' banner (§6.1.1)", () => {
    vi.mocked(useDemoMode).mockReturnValue(true);
    show();
    expect(screen.getByRole("dialog", { name: "Camera" }).textContent).toContain("Demo mode: location simulated");
  });

  test("Video is first: tapping the shutter records, and the tabs switch to Photo", () => {
    show();
    expect(tab("Video").getAttribute("aria-pressed")).toBe("true");
    fireEvent.click(button("Record")!);
    expect(hook.startRecording).toHaveBeenCalled();

    fireEvent.click(tab("Photo"));
    expect(tab("Photo").getAttribute("aria-pressed")).toBe("true");
    expect(button("Take photo")).toBeTruthy();
    expect(screen.getByText("0/10")).toBeTruthy();
  });

  test("starts in initialMode", () => {
    show(["video", "photos"], { initialMode: "photos" });
    expect(tab("Photo").getAttribute("aria-pressed")).toBe("true");
  });

  test("while recording: Stop, a countdown, and no tabs, Upload or Close", () => {
    hook.phase = { kind: "recording", startedAt: 0, endsAt: 20_000 };
    hook.secondsLeft = 14;
    hook.elapsedMs = 6000;
    show();
    expect(screen.getByText("14s left")).toBeTruthy();
    expect(button("Video")).toBeNull();
    expect(screen.queryByLabelText("Upload")).toBeNull();
    expect((button("Close") as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(button("Stop")!);
    expect(hook.stopRecording).toHaveBeenCalled();
  });

  test("Stop stays disabled for the first second", () => {
    hook.phase = { kind: "recording", startedAt: 0, endsAt: 20_000 };
    hook.canStop = false;
    show();
    expect((button("Stop") as HTMLButtonElement).disabled).toBe(true);
  });

  test("one mode hides the tabs", () => {
    show(["photos"]);
    expect(button("Video")).toBeNull();
    expect(button("Photo")).toBeNull();
    expect(button("Take photo")).toBeTruthy();
  });

  test("shows each mode's hint", () => {
    show(["video", "photos"], { hints: { video: "Film it", photos: "Snap it" } });
    expect(screen.getByText("Film it")).toBeTruthy();
    fireEvent.click(tab("Photo"));
    expect(screen.getByText("Snap it")).toBeTruthy();
  });

  test("✕ closes", () => {
    show();
    fireEvent.click(button("Close")!);
    expect(onClose).toHaveBeenCalled();
  });

  describe("Photo mode", () => {
    test("the shutter snaps stills from the live camera; Next hands them over in order", async () => {
      show(["photos"]);
      expect(button("Next")).toBeNull();
      await act(async () => fireEvent.click(button("Take photo")!));
      await act(async () => fireEvent.click(button("Take photo")!));

      expect(grabFrame).toHaveBeenCalledTimes(2);
      expect(screen.getByText("2/10")).toBeTruthy();
      expect(screen.getAllByRole("img").map((img) => img.getAttribute("alt"))).toContain("Photo 2");
      fireEvent.click(button("Next")!);
      const photos = onPhotos.mock.calls[0][0] as Blob[];
      expect(await Promise.all(photos.map((p) => p.text()))).toEqual(["snap 0", "snap 1"]);
    });

    test("a photo can be removed from the strip", async () => {
      show(["photos"]);
      await act(async () => fireEvent.click(button("Take photo")!));
      await act(async () => fireEvent.click(button("Take photo")!));
      fireEvent.click(button("Remove photo 1")!);
      expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:thumb-1");
      fireEvent.click(button("Next")!);
      expect(await (onPhotos.mock.calls[0][0] as Blob[])[0].text()).toBe("snap 1");
    });

    test("two quick snaps with room for one keep it at 10", async () => {
      show(["photos"]);
      for (let i = 0; i < 9; i++) await act(async () => fireEvent.click(button("Take photo")!));
      const pending: ((b: Blob) => void)[] = [];
      vi.mocked(grabFrame).mockImplementation(() => new Promise((resolve) => pending.push(resolve)));
      fireEvent.click(button("Take photo")!);
      fireEvent.click(button("Take photo")!);
      await act(async () => pending.forEach((resolve, i) => resolve(new Blob([`late ${i}`]))));
      expect(screen.getByText("10/10")).toBeTruthy();
      fireEvent.click(button("Next")!);
      expect(onPhotos.mock.calls[0][0]).toHaveLength(10);
    });

    test("stops at 10 photos", async () => {
      show(["photos"]);
      for (let i = 0; i < 10; i++) await act(async () => fireEvent.click(button("Take photo")!));
      expect(screen.getByText("10/10")).toBeTruthy();
      expect((button("Take photo") as HTMLButtonElement).disabled).toBe(true);
    });

    test("a failed snap says so", async () => {
      vi.mocked(grabFrame).mockRejectedValueOnce(new Error("no frame"));
      show(["photos"]);
      await act(async () => fireEvent.click(button("Take photo")!));
      expect(screen.getByRole("status").textContent).toBe("We couldn't take that photo. Try again.");
    });

    test("Upload adds photos from the phone, up to 10 in all, with a note for any left out", async () => {
      vi.mocked(prepareJpegs).mockResolvedValue({
        jpegs: Array.from({ length: 10 }, (_, i) => new Blob([`picked ${i}`], { type: "image/jpeg" })),
        cut: 2,
        unreadable: 1,
        heic: false,
      });
      show(["photos"]);
      await act(async () => fireEvent.click(button("Take photo")!));
      const input = uploadInput();
      expect(input.accept).toBe("image/*");
      expect(input.multiple).toBe(true);
      const files = [new File(["a"], "a.jpg", { type: "image/jpeg" })];
      await act(async () => fireEvent.change(input, { target: { files } }));

      expect(prepareJpegs).toHaveBeenCalledWith(files);
      expect(screen.getByText("10/10")).toBeTruthy();
      expect(screen.getByRole("status").textContent).toBe(
        "A post can have up to 10 photos, so 3 were left out. 1 photo couldn't be read.",
      );
    });

    test("Upload with nothing readable explains, naming HEIC when that's why", async () => {
      vi.mocked(prepareJpegs).mockResolvedValue({ jpegs: [], cut: 0, unreadable: 1, heic: true });
      show(["photos"]);
      await act(async () =>
        fireEvent.change(uploadInput(), { target: { files: [new File(["h"], "a.heic", { type: "image/heic" })] } }),
      );
      expect(screen.getByRole("status").textContent).toBe("This browser can't open HEIC photos. Try JPEGs.");
      expect(button("Next")).toBeNull();
    });

    test("switching to Video and back keeps the photos", async () => {
      show();
      fireEvent.click(tab("Photo"));
      await act(async () => fireEvent.click(button("Take photo")!));
      fireEvent.click(tab("Video"));
      fireEvent.click(tab("Photo"));
      expect(screen.getByText("1/10")).toBeTruthy();
    });
  });

  describe("Video upload", () => {
    test("Upload in Video mode takes any video, straight from the change handler (always shown, not just in demo mode)", () => {
      show();
      const input = uploadInput();
      expect(input.accept).toBe("video/*");
      expect(input.multiple).toBe(false);
      const file = new File(["mov"], "IMG_0001.MOV", { type: "video/quicktime" });
      fireEvent.change(input, { target: { files: [file] } });
      expect(hook.takeFile).toHaveBeenCalledWith(file);
    });

    test("shows conversion progress, with the tabs and Upload put away", () => {
      hook.phase = { kind: "converting", progress: 0.42 };
      const view = show();
      expect(screen.getByText("Converting your video… 42%")).toBeTruthy();
      expect(button("Photo")).toBeNull();
      hook.phase = { kind: "processing" };
      rerender(view);
      expect(screen.getByText("Preparing your clip…")).toBeTruthy();
    });
  });

  describe("when the camera can't open", () => {
    test("a camera error shows, and the shutter tries the camera again", () => {
      hook.phase = { kind: "error", message: "Camera permission was denied. Allow it in the browser's site settings." };
      show();
      expect(screen.getByRole("alert").textContent).toMatch(/permission was denied/);
      fireEvent.click(button("Open camera")!);
      expect(hook.openCamera).toHaveBeenCalled();
      expect(screen.getByLabelText("Upload")).toBeTruthy();
    });

    test("a browser without in-page recording offers Upload and the phone's camera app", () => {
      hook.inPage = false;
      hook.phase = { kind: "idle" };
      show();
      expect(screen.getByText(/can't open the camera here/)).toBeTruthy();
      const cameraApp = screen.getByLabelText("Camera app") as HTMLInputElement;
      expect(cameraApp.getAttribute("capture")).toBe("environment");
      const file = new File(["v"], "v.mp4", { type: "video/mp4" });
      fireEvent.change(cameraApp, { target: { files: [file] } });
      expect(hook.takeFile).toHaveBeenCalledWith(file);
    });
  });
});
