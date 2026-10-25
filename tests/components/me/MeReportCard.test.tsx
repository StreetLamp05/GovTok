// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, test } from "vitest";
import type { OwnerReport } from "../../../convex/lib/publicReport";
import MeReportCard, { reportStatusText } from "../../../components/me/MeReportCard";

const NOW = 10 * 86_400_000;

function report(overrides: Partial<OwnerReport> = {}): OwnerReport {
  return {
    _id: "report-1" as OwnerReport["_id"],
    _creationTime: 1,
    mediaType: "video",
    lat: 33.8,
    lng: -84.5,
    title: "Pothole on Main",
    status: "open",
    audioMuted: false,
    isSample: false,
    meTooCount: 2,
    lastActivityAt: 1,
    revealViews: 0,
    createdAt: NOW - 2 * 86_400_000,
    fixedAt: undefined,
    fixedByKind: undefined,
    clipUrl: null,
    frameUrls: [],
    fixUrl: null,
    verdict: undefined,
    reason: undefined,
    ...overrides,
  };
}

afterEach(cleanup);

describe("reportStatusText", () => {
  test.each([
    [report({ status: "pending" }), "Checking…"],
    [report({ status: "held", verdict: "retake", reason: "Cover the plate" }), "Retake needed"],
    [report({ status: "held", verdict: "reject", reason: "Not a public-space problem" }), "Not posted"],
    [report({ status: "held", verdict: "emergency" }), "Emergency"],
    [report({ status: "held", reason: "screening failed" }), "Screening failed"],
    [report({ status: "open" }), "Open · 2 days"],
    [report({ status: "fixed", fixedAt: NOW - 86_400_000 }), "Fixed in 1 day"],
  ])("labels %s as %s", (fixture, expected) => {
    expect(reportStatusText(fixture, NOW)).toBe(expected);
  });
});

test("renders held status reasons and an emergency call link", () => {
  const { rerender } = render(
    <MeReportCard report={report({ status: "held", verdict: "retake", reason: "Cover the plate" })} now={NOW} />,
  );
  expect(screen.getByText("Cover the plate")).toBeTruthy();
  expect(screen.getByRole("button", { name: "Retake" }).hasAttribute("disabled")).toBe(true);

  rerender(<MeReportCard report={report({ status: "held", reason: "screening failed" })} now={NOW} />);
  expect(screen.getByRole("button", { name: "Try again" }).hasAttribute("disabled")).toBe(true);

  rerender(<MeReportCard report={report({ status: "held", verdict: "emergency" })} now={NOW} />);
  expect(screen.getByRole("link", { name: "Call 911" }).getAttribute("href")).toBe("tel:911");
});

test("highlights fixed reports and shows open counts without revealing muted speech", () => {
  const { rerender } = render(<MeReportCard report={report({ status: "fixed" })} now={NOW} />);
  expect(screen.getByText("This report has been fixed.")).toBeTruthy();
  expect(document.querySelector('[data-status="fixed"]')?.className).toContain("ring-2");

  rerender(<MeReportCard report={report({ audioMuted: true })} now={NOW} />);
  expect(screen.getByText("Audio muted for privacy · 2 me-toos")).toBeTruthy();
  expect(screen.queryByText(/transcript/i)).toBeNull();
});
