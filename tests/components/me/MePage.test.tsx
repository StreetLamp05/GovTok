// @vitest-environment jsdom
import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import MePage from "@/components/me/MePage";
import type { OwnerReport, PublicReport } from "@/convex/lib/publicReport";

const state = vi.hoisted(() => ({ summary: undefined as unknown }));

vi.mock("convex/react", () => ({
  useQuery: () => state.summary,
}));
vi.mock("@/lib/hooks/useResidentToken", () => ({ useResidentToken: () => "resident-token" }));
vi.mock("@/components/post/CheckingScreen", () => ({
  Retake: () => "Retake action",
  ScreeningFailed: () => "Retry action",
}));

function ownerReport(fields: Partial<OwnerReport>): OwnerReport {
  return {
    _id: "mine" as OwnerReport["_id"],
    _creationTime: 1,
    mediaType: "video",
    lat: 37.7694,
    lng: -122.4862,
    status: "open",
    audioMuted: false,
    isSample: false,
    meTooCount: 0,
    lastActivityAt: 10,
    revealViews: 0,
    createdAt: 10,
    clipUrl: null,
    frameUrls: [],
    fixUrl: null,
    verdict: "pass",
    reason: undefined,
    screeningError: undefined,
    screeningRetries: undefined,
    ...fields,
  };
}

function publicReport(fields: Partial<PublicReport>): PublicReport {
  return {
    _id: "supported" as PublicReport["_id"],
    _creationTime: 2,
    mediaType: "video",
    lat: 37.7694,
    lng: -122.4862,
    status: "fixed",
    audioMuted: false,
    isSample: false,
    meTooCount: 2,
    lastActivityAt: 20,
    revealViews: 0,
    createdAt: 20,
    clipUrl: null,
    frameUrls: [],
    fixUrl: null,
    ...fields,
  };
}

beforeEach(() => {
  state.summary = undefined;
});
afterEach(cleanup);

describe("MePage", () => {
  test("shows a private anonymous profile, activity totals, and recent activity", () => {
    state.summary = {
      reports: [ownerReport({ title: "Broken streetlight", street: "W 17th St" })],
      meToos: [publicReport({ title: "Pothole by the park" })],
      stats: { reports: 1, meToos: 1, resolved: 0 },
    };

    render(<MePage />);

    expect(screen.getByRole("heading", { name: "Your profile" })).toBeTruthy();
    expect(screen.getByText("Private to this device")).toBeTruthy();
    expect(screen.getByText("Helping make the neighborhood better.")).toBeTruthy();
    expect(screen.queryByText("Alex Kim")).toBeNull();
    expect(screen.getByText("Broken streetlight")).toBeTruthy();
    expect(screen.getByText("Pothole by the park")).toBeTruthy();
    expect(within(screen.getByRole("region", { name: "Your impact" })).getAllByText("1")).toHaveLength(2);
    expect(screen.getByRole("link", { name: "Watch the fix" }).getAttribute("href")).toBe("/?report=supported");
  });

  test("offers a post action when the resident has no activity", () => {
    state.summary = { reports: [], meToos: [], stats: { reports: 0, meToos: 0, resolved: 0 } };

    render(<MePage />);

    expect(screen.getByText("Your first report starts here")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Post a problem" }).getAttribute("href")).toBe("/post");
    expect(screen.getByText("No me-toos yet")).toBeTruthy();
  });

  test("shows the available follow-up actions for held posts", () => {
    state.summary = {
      reports: [
        ownerReport({ _id: "retake" as OwnerReport["_id"], status: "held", verdict: "retake", reason: "Record again." }),
        ownerReport({
          _id: "failed" as OwnerReport["_id"],
          status: "held",
          verdict: undefined,
          reason: "screening failed",
          screeningError: "Network error",
        }),
      ],
      meToos: [],
      stats: { reports: 2, meToos: 0, resolved: 0 },
    };

    render(<MePage />);

    expect(screen.getByText("Retake action")).toBeTruthy();
    expect(screen.getByText("Retry action")).toBeTruthy();
  });
});
