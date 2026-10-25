// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import VideoRecorder from "../../../components/capture/VideoRecorder";
import { framesFromFile, grabFrame } from "../../../lib/media/frames";
import { useDemoMode } from "../../../lib/hooks/useDemoMode";

// jsdom has no canvas or media decoding; the real frame code is covered by tests/lib/media and
// the headless browser test in tests/browser/media.
vi.mock("../../../lib/media/frames", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../../lib/media/frames")>()),
  grabFrame: vi.fn(),
  framesFromFile: vi.fn(),
}));
vi.mock("../../../lib/hooks/useDemoMode", () => ({ useDemoMode: vi.fn(() => false) }));

class FakeRecorder {
  static supported = ["video/mp4", "video/webm"];
  static isTypeSupported = vi.fn((type: string) => FakeRecorder.supported.includes(type));
  static instances: FakeRecorder[] = [];
  static data = "clip-bytes";
  static startError: Error | null = null;
  state: RecordingState = "inactive";
  mimeType: string;
  ondataavailable: ((e: { data: Blob }) => void) | null = null;
  onstop: (() => void) | null = null;
  onerror: (() => void) | null = null;
  start = vi.fn(() => {
    if (FakeRecorder.startError) throw FakeRecorder.startError;
    this.state = "recording";
  });
  stop = vi.fn(() => {
    this.state = "inactive";
    this.ondataavailable?.({ data: new Blob([FakeRecorder.data], { type: this.mimeType }) });
    this.onstop?.();
  });
  constructor(
    public stream: MediaStream,
    public options: MediaRecorderOptions,
  ) {
    this.mimeType = options.mimeType ?? "";
    FakeRecorder.instances.push(this);
  }
}

function fakeStream() {
  const tracks = [{ stop: vi.fn() }, { stop: vi.fn() }];
  return { tracks, stream: { getTracks: () => tracks } as unknown as MediaStream };
}

const getUserMedia = vi.fn();
const onDone = vi.fn();
let frameNo = 0;

beforeEach(() => {
  Object.defineProperty(navigator, "mediaDevices", { configurable: true, value: { getUserMedia } });
  Object.defineProperty(window, "isSecureContext", { configurable: true, value: true });
  vi.stubGlobal("MediaRecorder", FakeRecorder);
  vi.spyOn(HTMLMediaElement.prototype, "play").mockResolvedValue(undefined);
  frameNo = 0;
  vi.mocked(grabFrame).mockImplementation(async () => new Blob([`frame-${frameNo++}`], { type: "image/jpeg" }));
  vi.mocked(framesFromFile).mockResolvedValue(Array.from({ length: 6 }, () => new Blob(["f"], { type: "image/jpeg" })));
  vi.mocked(useDemoMode).mockReturnValue(false);
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  getUserMedia.mockReset();
  onDone.mockReset();
  FakeRecorder.instances = [];
  FakeRecorder.supported = ["video/mp4", "video/webm"];
  FakeRecorder.data = "clip-bytes";
  FakeRecorder.startError = null;
});

async function openCamera(audio = true) {
  const fake = fakeStream();
  getUserMedia.mockResolvedValue(fake.stream);
  const view = render(<VideoRecorder audio={audio} onDone={onDone} />);
  fireEvent.click(screen.getByRole("button", { name: "Open camera" }));
  await screen.findByRole("button", { name: "Record" });
  return { ...fake, ...view };
}

const flush = () => act(async () => {});
const frameText = (blob: Blob) => blob.text();

test("asks for the rear camera at 720p, with audio only when asked", async () => {
  await openCamera(true);
  expect(getUserMedia).toHaveBeenCalledWith({
    video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } },
    audio: true,
  });
  cleanup();

  await openCamera(false);
  expect(getUserMedia).toHaveBeenLastCalledWith(expect.objectContaining({ audio: false }));
});

test("records at 1.5 Mbps with the preferred mime type", async () => {
  await openCamera(true);
  fireEvent.click(screen.getByRole("button", { name: "Record" }));

  const [recorder] = FakeRecorder.instances;
  expect(recorder.options).toEqual({ mimeType: "video/mp4", videoBitsPerSecond: 1_500_000, audioBitsPerSecond: 64_000 });
  expect(recorder.start).toHaveBeenCalled();
});

test("without audio, no audio bitrate is set", async () => {
  await openCamera(false);
  fireEvent.click(screen.getByRole("button", { name: "Record" }));

  expect(FakeRecorder.instances[0].options).toEqual({ mimeType: "video/mp4", videoBitsPerSecond: 1_500_000 });
});

test("stops by itself at 20 s with a visible countdown, then hands back the clip and 6 frames", async () => {
  const { tracks } = await openCamera();
  vi.useFakeTimers();
  fireEvent.click(screen.getByRole("button", { name: "Record" }));
  const [recorder] = FakeRecorder.instances;
  expect(screen.getByText("20s left")).toBeTruthy();

  act(() => vi.advanceTimersByTime(5_000));
  expect(screen.getByText("15s left")).toBeTruthy();

  act(() => vi.advanceTimersByTime(14_999));
  expect(recorder.stop).not.toHaveBeenCalled();

  act(() => vi.advanceTimersByTime(1));
  expect(recorder.stop).toHaveBeenCalledTimes(1);
  await flush();

  expect(onDone).toHaveBeenCalledTimes(1);
  const clip = onDone.mock.calls[0][0];
  expect(clip.mimeType).toBe("video/mp4");
  expect(await clip.blob.text()).toBe("clip-bytes");
  // Grabs at 0, every 500 ms and at stop: frame-0 … frame-40. The first and last are kept.
  expect(clip.frames).toHaveLength(6);
  expect(await Promise.all(clip.frames.map(frameText))).toEqual([
    "frame-0",
    "frame-8",
    "frame-16",
    "frame-24",
    "frame-32",
    "frame-40",
  ]);
  expect(tracks.every((t) => t.stop.mock.calls.length > 0)).toBe(true);

  // Nothing fires again once the clip is done.
  act(() => vi.advanceTimersByTime(30_000));
  expect(onDone).toHaveBeenCalledTimes(1);
});

test("Stop ends the clip early and releases the camera", async () => {
  const { tracks } = await openCamera();
  vi.useFakeTimers();
  fireEvent.click(screen.getByRole("button", { name: "Record" }));
  act(() => vi.advanceTimersByTime(1_000));

  fireEvent.click(screen.getByRole("button", { name: "Stop" }));
  await flush();

  expect(FakeRecorder.instances[0].stop).toHaveBeenCalled();
  expect(onDone).toHaveBeenCalledTimes(1);
  // Grabs at 0, 500 ms, 1 s and at stop.
  expect(onDone.mock.calls[0][0].frames).toHaveLength(4);
  expect(tracks.every((t) => t.stop.mock.calls.length > 0)).toBe(true);
});

test("a double tap on Record doesn't stop the clip it just started", async () => {
  await openCamera();
  vi.useFakeTimers();
  fireEvent.click(screen.getByRole("button", { name: "Record" }));
  const stop = screen.getByRole("button", { name: "Stop" }) as HTMLButtonElement;

  fireEvent.click(stop);
  act(() => vi.advanceTimersByTime(750));
  fireEvent.click(stop);

  expect(stop.disabled).toBe(true);
  expect(FakeRecorder.instances[0].stop).not.toHaveBeenCalled();
  expect(onDone).not.toHaveBeenCalled();

  act(() => vi.advanceTimersByTime(250));
  expect(stop.disabled).toBe(false);
});

test("an empty recording is reported, not handed back, and Record works after reopening the camera", async () => {
  FakeRecorder.data = "";
  await openCamera();
  vi.useFakeTimers();
  fireEvent.click(screen.getByRole("button", { name: "Record" }));
  act(() => vi.advanceTimersByTime(1_000));

  fireEvent.click(screen.getByRole("button", { name: "Stop" }));
  await flush();

  expect(onDone).not.toHaveBeenCalled();
  expect(screen.getByRole("alert").textContent).toMatch(/came out empty/);
  vi.useRealTimers();
  fireEvent.click(screen.getByRole("button", { name: "Try the camera again" }));
  fireEvent.click(await screen.findByRole("button", { name: "Record" }));
  expect(FakeRecorder.instances).toHaveLength(2);
});

test("a recorder that fails to start shows an error, and Record works after reopening the camera", async () => {
  FakeRecorder.startError = new DOMException("bad state", "InvalidStateError");
  const { tracks } = await openCamera();

  fireEvent.click(screen.getByRole("button", { name: "Record" }));

  expect(screen.getByRole("alert").textContent).toMatch(/InvalidStateError/);
  expect(tracks.every((t) => t.stop.mock.calls.length > 0)).toBe(true);
  FakeRecorder.startError = null;
  fireEvent.click(screen.getByRole("button", { name: "Try the camera again" }));
  fireEvent.click(await screen.findByRole("button", { name: "Record" }));
  expect(FakeRecorder.instances[1].start).toHaveBeenCalled();
});

test("a recorder error mid-clip shows an error and hands nothing back", async () => {
  const { tracks } = await openCamera();
  fireEvent.click(screen.getByRole("button", { name: "Record" }));

  act(() => FakeRecorder.instances[0].onerror?.());
  FakeRecorder.instances[0].stop();
  await flush();

  expect(screen.getByRole("alert").textContent).toMatch(/stopped unexpectedly/);
  expect(onDone).not.toHaveBeenCalled();
  expect(tracks.every((t) => t.stop.mock.calls.length > 0)).toBe(true);
});

test("decodes frames from the clip if every live grab failed", async () => {
  vi.mocked(grabFrame).mockRejectedValue(new Error("no frame"));
  await openCamera();
  vi.useFakeTimers();
  fireEvent.click(screen.getByRole("button", { name: "Record" }));
  act(() => vi.advanceTimersByTime(1_000));

  fireEvent.click(screen.getByRole("button", { name: "Stop" }));
  await flush();

  expect(framesFromFile).toHaveBeenCalled();
  expect(onDone.mock.calls[0][0].frames).toHaveLength(6);
});

test("unmounting mid-recording stops the camera and drops the clip", async () => {
  const { tracks, unmount } = await openCamera();
  fireEvent.click(screen.getByRole("button", { name: "Record" }));

  unmount();
  await flush();

  expect(FakeRecorder.instances[0].stop).toHaveBeenCalled();
  expect(tracks.every((t) => t.stop.mock.calls.length > 0)).toBe(true);
  expect(onDone).not.toHaveBeenCalled();
});

test("unmounting with the preview open stops the camera", async () => {
  const { tracks, unmount } = await openCamera();

  unmount();

  expect(tracks.every((t) => t.stop.mock.calls.length > 0)).toBe(true);
});

test("a stream granted after unmount is stopped right away", async () => {
  const { tracks, stream } = fakeStream();
  let grant!: (s: MediaStream) => void;
  getUserMedia.mockReturnValue(new Promise((resolve) => (grant = resolve)));
  const { unmount } = render(<VideoRecorder audio onDone={onDone} />);
  fireEvent.click(screen.getByRole("button", { name: "Open camera" }));

  unmount();
  await act(async () => grant(stream));

  expect(tracks.every((t) => t.stop.mock.calls.length > 0)).toBe(true);
});

test("without getUserMedia, offers the phone's camera app and takes frames from the file", async () => {
  Object.defineProperty(navigator, "mediaDevices", { configurable: true, value: undefined });
  render(<VideoRecorder audio onDone={onDone} />);

  expect(screen.queryByRole("button", { name: "Open camera" })).toBeNull();
  const input = screen.getByLabelText("Record with the camera app") as HTMLInputElement;
  expect(input.accept).toBe("video/*");
  expect(input.getAttribute("capture")).toBe("environment");

  const file = new File(["native"], "clip.mov", { type: "video/quicktime" });
  fireEvent.change(input, { target: { files: [file] } });
  await flush();

  expect(framesFromFile).toHaveBeenCalledWith(file);
  expect(onDone).toHaveBeenCalledWith({ blob: file, mimeType: "video/quicktime", frames: expect.any(Array) });
  expect(onDone.mock.calls[0][0].frames).toHaveLength(6);
});

test("a file picked while the camera is still opening closes the camera when it arrives", async () => {
  vi.mocked(useDemoMode).mockReturnValue(true);
  const { tracks, stream } = fakeStream();
  let grant!: (s: MediaStream) => void;
  getUserMedia.mockReturnValue(new Promise((resolve) => (grant = resolve)));
  render(<VideoRecorder audio onDone={onDone} />);
  fireEvent.click(screen.getByRole("button", { name: "Open camera" }));

  const file = new File(["sample"], "pothole.mp4", { type: "video/mp4" });
  fireEvent.change(screen.getByLabelText("Upload clip"), { target: { files: [file] } });
  await act(async () => grant(stream));

  expect(tracks.every((t) => t.stop.mock.calls.length > 0)).toBe(true);
  expect(onDone).toHaveBeenCalledWith(expect.objectContaining({ blob: file }));
  expect(screen.queryByRole("button", { name: "Record" })).toBeNull();
});

test("a file that can't be read says so, not that the camera failed", async () => {
  Object.defineProperty(navigator, "mediaDevices", { configurable: true, value: undefined });
  Object.defineProperty(window, "isSecureContext", { configurable: true, value: false });
  vi.mocked(framesFromFile).mockRejectedValue(new Error("decode failed"));
  render(<VideoRecorder audio onDone={onDone} />);

  fireEvent.change(screen.getByLabelText("Record with the camera app"), {
    target: { files: [new File(["x"], "clip.mov", { type: "video/quicktime" })] },
  });
  await flush();

  expect(screen.getByRole("alert").textContent).toBe("We couldn't read that video. Try a different clip.");
  expect(onDone).not.toHaveBeenCalled();
});

test("a denied camera explains why and offers the camera app", async () => {
  getUserMedia.mockRejectedValue(new DOMException("denied", "NotAllowedError"));
  render(<VideoRecorder audio onDone={onDone} />);

  fireEvent.click(screen.getByRole("button", { name: "Open camera" }));

  expect(await screen.findByText(/Camera or microphone permission was denied/)).toBeTruthy();
  expect(screen.getByLabelText("Record with the camera app")).toBeTruthy();
});

test("demo mode adds Upload clip, which goes through framesFromFile", async () => {
  expect(render(<VideoRecorder audio onDone={onDone} />).queryByLabelText("Upload clip")).toBeNull();
  cleanup();

  vi.mocked(useDemoMode).mockReturnValue(true);
  const { tracks } = await openCamera();
  const input = screen.getByLabelText("Upload clip") as HTMLInputElement;
  expect(input.getAttribute("capture")).toBeNull();

  const file = new File(["sample"], "pothole.mp4", { type: "video/mp4" });
  fireEvent.change(input, { target: { files: [file] } });
  await flush();

  expect(framesFromFile).toHaveBeenCalledWith(file);
  expect(onDone).toHaveBeenCalledWith(expect.objectContaining({ blob: file, mimeType: "video/mp4" }));
  // The preview's camera is released once a file is used instead.
  expect(tracks.every((t) => t.stop.mock.calls.length > 0)).toBe(true);
});

test("falls back to webm when mp4 isn't supported", async () => {
  FakeRecorder.supported = ["video/webm"];
  await openCamera();
  fireEvent.click(screen.getByRole("button", { name: "Record" }));

  expect(FakeRecorder.instances[0].options.mimeType).toBe("video/webm");
});

test("a denied camera without audio doesn't mention the microphone", async () => {
  getUserMedia.mockRejectedValue(new DOMException("denied", "NotAllowedError"));
  render(<VideoRecorder audio={false} onDone={onDone} />);

  fireEvent.click(screen.getByRole("button", { name: "Open camera" }));

  expect(await screen.findByText(/^Camera permission was denied/)).toBeTruthy();
});

test("asks for nothing until the tap by default", () => {
  render(<VideoRecorder audio onDone={onDone} />);

  expect(getUserMedia).not.toHaveBeenCalled();
  expect(screen.getByRole("button", { name: "Open camera" })).toBeTruthy();
});

test("autoOpen opens the camera straight away, once", async () => {
  getUserMedia.mockResolvedValue(fakeStream().stream);
  render(<VideoRecorder audio autoOpen onDone={onDone} />);

  expect(await screen.findByRole("button", { name: "Record" })).toBeTruthy();
  expect(getUserMedia).toHaveBeenCalledTimes(1);
});

test("autoOpen that the browser refuses falls back to the button and the camera app", async () => {
  getUserMedia.mockRejectedValue(new DOMException("needs a gesture", "NotAllowedError"));
  render(<VideoRecorder audio autoOpen onDone={onDone} />);

  expect(await screen.findByRole("button", { name: "Try the camera again" })).toBeTruthy();
  expect(screen.getByLabelText("Record with the camera app")).toBeTruthy();
});

test("autoOpen without getUserMedia just shows the camera-app fallback", () => {
  Object.defineProperty(navigator, "mediaDevices", { configurable: true, value: undefined });
  render(<VideoRecorder audio autoOpen onDone={onDone} />);

  expect(screen.getByLabelText("Record with the camera app")).toBeTruthy();
  expect(screen.queryByRole("alert")).toBeNull();
});
