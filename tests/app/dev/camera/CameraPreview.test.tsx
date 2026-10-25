// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import CameraPreview from "../../../../app/dev/camera/CameraPreview";

type FakeTrack = { stop: ReturnType<typeof vi.fn>; label: string; getSettings: () => MediaTrackSettings };

function fakeStream() {
  const track: FakeTrack = { stop: vi.fn(), label: "Back Camera", getSettings: () => ({ facingMode: "environment" }) };
  return { track, stream: { getTracks: () => [track], getVideoTracks: () => [track] } as unknown as MediaStream };
}

const getUserMedia = vi.fn();
const play = vi.fn();

beforeEach(() => {
  Object.defineProperty(navigator, "mediaDevices", { configurable: true, value: { getUserMedia } });
  Object.defineProperty(window, "isSecureContext", { configurable: true, value: true });
  vi.spyOn(HTMLMediaElement.prototype, "play").mockImplementation(play);
  play.mockResolvedValue(undefined);
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  getUserMedia.mockReset();
  play.mockReset();
});

const video = () => document.querySelector("video")!;
const open = () => fireEvent.click(screen.getByRole("button", { name: "Open rear camera" }));

test("hides the preview and asks for nothing until the tap", () => {
  render(<CameraPreview />);

  expect(video().className).toContain("hidden");
  expect(getUserMedia).not.toHaveBeenCalled();
});

test("asks for the rear camera without audio, then shows the live preview", async () => {
  const { stream } = fakeStream();
  getUserMedia.mockResolvedValue(stream);
  render(<CameraPreview />);

  open();

  expect(await screen.findByText(/Live: Back Camera \(environment facing\)/)).toBeTruthy();
  expect(getUserMedia).toHaveBeenCalledWith({ video: { facingMode: { ideal: "environment" } }, audio: false });
  expect(video().srcObject).toBe(stream);
  expect(video().className).not.toContain("hidden");
  expect(video().playsInline).toBe(true);
  expect(video().muted).toBe(true);
});

test("explains a denied permission and keeps the preview hidden", async () => {
  getUserMedia.mockRejectedValue(new DOMException("denied", "NotAllowedError"));
  render(<CameraPreview />);

  open();

  expect(await screen.findByText(/Camera permission was denied/)).toBeTruthy();
  expect(screen.getByRole("button", { name: "Try again" })).toBeTruthy();
  expect(video().className).toContain("hidden");
});

test("explains that the camera needs HTTPS", async () => {
  Object.defineProperty(window, "isSecureContext", { configurable: true, value: false });
  getUserMedia.mockRejectedValue(new DOMException("insecure", "NotAllowedError"));
  render(<CameraPreview />);

  open();

  expect(await screen.findByText(/isn't on HTTPS/)).toBeTruthy();
});

test("a double tap opens one stream", async () => {
  getUserMedia.mockResolvedValue(fakeStream().stream);
  render(<CameraPreview />);
  const button = screen.getByRole("button", { name: "Open rear camera" });

  fireEvent.click(button);
  fireEvent.click(button);

  await screen.findByText(/Live:/);
  expect(getUserMedia).toHaveBeenCalledTimes(1);
});

test("releases the camera when the preview fails to play, and doesn't blame permission", async () => {
  const { stream, track } = fakeStream();
  getUserMedia.mockResolvedValue(stream);
  play.mockRejectedValue(new DOMException("blocked", "NotAllowedError"));
  render(<CameraPreview />);

  open();

  expect(await screen.findByText(/preview didn't start \(NotAllowedError\)/)).toBeTruthy();
  expect(track.stop).toHaveBeenCalled();
});

test("stops the stream when the page unmounts", async () => {
  const { stream, track } = fakeStream();
  getUserMedia.mockResolvedValue(stream);
  const { unmount } = render(<CameraPreview />);
  open();
  await screen.findByText(/Live:/);

  unmount();

  expect(track.stop).toHaveBeenCalled();
});

test("stops a stream that arrives after the page unmounted", async () => {
  const { stream, track } = fakeStream();
  let grant!: (s: MediaStream) => void;
  getUserMedia.mockReturnValue(new Promise((resolve) => (grant = resolve)));
  const { unmount } = render(<CameraPreview />);
  open();

  unmount();
  await act(async () => grant(stream));

  expect(track.stop).toHaveBeenCalled();
});
