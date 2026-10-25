// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { ConvexError } from "convex/values";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import type { RecordedClip } from "../../../components/capture/VideoRecorder";
import PostFlow from "../../../components/post/PostFlow";
import type { LocationState } from "../../../lib/hooks/useCurrentLocation";

const state = vi.hoisted(() => ({
  location: { status: "ready", point: { lat: 33.8158, lng: -84.5825 }, accuracy: 8, simulated: false } as LocationState,
  refresh: vi.fn(),
  createReport: vi.fn(),
  myReport: undefined as unknown,
  myReportArgs: [] as unknown[],
  uploads: [] as Blob[],
}));

vi.mock("convex/react", () => ({
  useMutation: () => state.createReport,
  useQuery: (_ref: unknown, args: unknown) => {
    state.myReportArgs.push(args);
    return args === "skip" ? undefined : state.myReport;
  },
}));
vi.mock("../../../lib/hooks/useCurrentLocation", () => ({
  useCurrentLocation: () => ({ ...state.location, refresh: state.refresh }),
}));
vi.mock("../../../lib/hooks/useResidentToken", () => ({
  getResidentToken: () => "token-a",
  useResidentToken: () => "token-a",
}));
vi.mock("../../../lib/upload", () => ({
  uploadFile: vi.fn(async (blob: Blob) => {
    state.uploads.push(blob);
    return `storage-${state.uploads.length}`;
  }),
}));
// The recorder (US7) is tested on its own; here it hands back a clip with 6 frames on a tap.
const recorderProps: { audio?: boolean; autoOpen?: boolean }[] = [];
vi.mock("../../../components/capture/VideoRecorder", () => ({
  default: (props: { audio: boolean; autoOpen?: boolean; onDone: (clip: RecordedClip) => void }) => {
    recorderProps.push(props);
    return <button onClick={() => props.onDone(CLIP)}>fake record</button>;
  },
}));

const CLIP: RecordedClip = {
  blob: new Blob(["clip"], { type: "video/mp4" }),
  mimeType: "video/mp4",
  frames: Array.from({ length: 6 }, (_, i) => new Blob([`frame ${i}`], { type: "image/jpeg" })),
};

beforeEach(() => {
  URL.createObjectURL = vi.fn(() => "blob:preview");
  URL.revokeObjectURL = vi.fn();
  state.location = { status: "ready", point: { lat: 33.8158, lng: -84.5825 }, accuracy: 8, simulated: false };
  state.refresh.mockReset();
  state.createReport.mockReset().mockResolvedValue("report-1");
  state.myReport = undefined;
  state.myReportArgs = [];
  state.uploads = [];
  recorderProps.length = 0;
});
afterEach(cleanup);

async function recordAndSubmit(description?: string) {
  fireEvent.click(screen.getByText("fake record"));
  if (description !== undefined) {
    fireEvent.change(screen.getByRole("textbox"), { target: { value: description } });
  }
  await act(async () => fireEvent.click(screen.getByRole("button", { name: "Submit" })));
}

describe("PostFlow", () => {
  test("waits for a location before showing the recorder, and offers Try again when it's denied", () => {
    state.location = { status: "denied" };
    render(<PostFlow />);
    expect(screen.queryByText("fake record")).toBeNull();
    expect(screen.getByRole("alert").textContent).toMatch(/Location is turned off/);
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(state.refresh).toHaveBeenCalled();
  });

  test("records with audio, opening the camera without a tap", () => {
    render(<PostFlow />);
    expect(recorderProps.at(-1)).toMatchObject({ audio: true, autoOpen: true });
  });

  test("the description has a live counter and stops at 280 characters", () => {
    render(<PostFlow />);
    fireEvent.click(screen.getByText("fake record"));
    const box = screen.getByRole("textbox") as HTMLTextAreaElement;
    expect(box.maxLength).toBe(280);
    expect(screen.getByText("0/280")).toBeTruthy();
    fireEvent.change(box, { target: { value: "Pothole" } });
    expect(screen.getByText("7/280")).toBeTruthy();
  });

  test("Submit uploads the clip and 6 frames, then creates the report at the phone's location", async () => {
    render(<PostFlow />);
    await recordAndSubmit("  Deep pothole  ");

    expect(state.uploads).toHaveLength(7);
    expect(state.uploads).toContain(CLIP.blob);
    expect(state.createReport).toHaveBeenCalledTimes(1);
    const args = state.createReport.mock.calls[0][0];
    expect(args).toMatchObject({
      token: "token-a",
      mediaType: "video",
      description: "Deep pothole",
      lat: 33.8158,
      lng: -84.5825,
    });
    expect([args.clipStorageId, ...args.frameStorageIds].sort()).toEqual(
      ["storage-1", "storage-2", "storage-3", "storage-4", "storage-5", "storage-6", "storage-7"],
    );
    expect(args.frameStorageIds).toHaveLength(6);
    expect(screen.getByRole("heading").textContent).toBe("Checking…");
    expect(state.myReportArgs.at(-1)).toEqual({ token: "token-a", reportId: "report-1" });
  });

  test("an empty description is sent as none", async () => {
    render(<PostFlow />);
    await recordAndSubmit("   ");
    expect(state.createReport.mock.calls[0][0].description).toBeUndefined();
  });

  test("keeps the fix from filming when the refresh after recording fails", async () => {
    const view = render(<PostFlow />);
    fireEvent.click(screen.getByText("fake record"));
    expect(state.refresh).toHaveBeenCalledTimes(1);
    state.location = { status: "timeout" };
    view.rerender(<PostFlow />);

    const submit = screen.getByRole("button", { name: "Submit" }) as HTMLButtonElement;
    expect(submit.disabled).toBe(false);
    await act(async () => fireEvent.click(submit));
    expect(state.createReport.mock.calls[0][0]).toMatchObject({ lat: 33.8158, lng: -84.5825 });
  });

  test("uses the newer fix when the refresh succeeds", async () => {
    const view = render(<PostFlow />);
    fireEvent.click(screen.getByText("fake record"));
    state.location = { status: "ready", point: { lat: 33.8161, lng: -84.5829 }, accuracy: 4, simulated: false };
    view.rerender(<PostFlow />);
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Submit" })));
    expect(state.createReport.mock.calls[0][0]).toMatchObject({ lat: 33.8161, lng: -84.5829 });
  });

  test("a clip over 25 MB is refused before anything uploads", async () => {
    const big = new Blob(["clip"], { type: "video/mp4" });
    Object.defineProperty(big, "size", { value: 25_000_001 });
    const original = CLIP.blob;
    CLIP.blob = big;
    try {
      render(<PostFlow />);
      await recordAndSubmit();
    } finally {
      CLIP.blob = original;
    }
    expect(screen.getByRole("alert").textContent).toBe("That clip is over 25 MB. Try a shorter one.");
    expect(state.uploads).toHaveLength(0);
    expect(state.createReport).not.toHaveBeenCalled();
  });

  test("a server error shows its message and keeps the clip, so Submit works again", async () => {
    state.createReport.mockRejectedValueOnce(new ConvexError("An uploaded file is missing. Try posting again."));
    render(<PostFlow />);
    await recordAndSubmit();
    expect(screen.getByRole("alert").textContent).toBe("An uploaded file is missing. Try posting again.");

    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Submit" })));
    expect(state.createReport).toHaveBeenCalledTimes(2);
    expect(screen.getByRole("heading").textContent).toBe("Checking…");
  });

  test("a failed upload shows a generic error and doesn't create a report", async () => {
    const { uploadFile } = await import("../../../lib/upload");
    vi.mocked(uploadFile).mockRejectedValueOnce(new Error("Upload failed (500)"));
    render(<PostFlow />);
    await recordAndSubmit();
    expect(screen.getByRole("alert").textContent).toMatch(/couldn't send your post/);
    expect(state.createReport).not.toHaveBeenCalled();
  });

  test("Record again drops the clip and goes back to the recorder, keeping the description", () => {
    render(<PostFlow />);
    fireEvent.click(screen.getByText("fake record"));
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "Streetlight out" } });
    fireEvent.click(screen.getByRole("button", { name: "Record again" }));
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:preview");

    fireEvent.click(screen.getByText("fake record"));
    expect((screen.getByRole("textbox") as HTMLTextAreaElement).value).toBe("Streetlight out");
  });
});

describe("Checking… screen", () => {
  async function submitted() {
    const view = render(<PostFlow />);
    await recordAndSubmit();
    return view;
  }

  test("stays on Checking… while the report is pending", async () => {
    state.myReport = { _id: "report-1", status: "pending" };
    await submitted();
    expect(screen.getByRole("heading").textContent).toBe("Checking…");
  });

  test("shows the live state with a feed link once the report is open", async () => {
    const view = await submitted();
    state.myReport = { _id: "report-1", status: "open", title: "Pothole on Floyd Rd", agency: "Cobb DOT" };
    view.rerender(<PostFlow />);
    expect(screen.getByRole("heading").textContent).toBe("Your post is live");
    expect(screen.getByText(/Pothole on Floyd Rd · Cobb DOT/)).toBeTruthy();
    expect(screen.getByRole("link", { name: "See it in the feed" }).getAttribute("href")).toBe("/?report=report-1");
  });

  test("shows the held state with the reason, and Post another starts over", async () => {
    const view = await submitted();
    state.myReport = { _id: "report-1", status: "held", verdict: "retake", reason: "A face is visible" };
    view.rerender(<PostFlow />);
    expect(screen.getByRole("heading").textContent).toBe("We held this post");
    expect(screen.getByText("A face is visible")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Post another" }));
    expect(screen.getByText("fake record")).toBeTruthy();
  });
});
