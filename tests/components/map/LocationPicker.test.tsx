// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import LocationPicker from "../../../components/map/LocationPicker";

const TAPPED_POINT = { lat: 37.78, lng: -122.42 };
type MockMapProps = {
  children: ReactNode;
  onClick?: (event: { detail: { latLng: typeof TAPPED_POINT | null } }) => void;
};

vi.mock("@vis.gl/react-google-maps", () => ({
  APIProvider: ({ children }: { children: ReactNode }) => <>{children}</>,
  Map: ({ children, onClick }: MockMapProps) => (
    <div>
      <button onClick={() => onClick?.({ detail: { latLng: TAPPED_POINT } })}>Tap map</button>
      {children}
    </div>
  ),
  AdvancedMarker: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

const INITIAL_POINT = { lat: 37.7793, lng: -122.4193 };

beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_GOOGLE_MAPS_KEY", "test-key");
  vi.stubEnv("NEXT_PUBLIC_GOOGLE_MAP_ID", "test-map-id");
});
afterEach(() => {
  cleanup();
  vi.unstubAllEnvs();
});

describe("LocationPicker", () => {
  test("requires placing a pin, then confirms the tapped coordinates", () => {
    const onConfirm = vi.fn();
    render(<LocationPicker initialPoint={INITIAL_POINT} onConfirm={onConfirm} onCancel={vi.fn()} />);

    expect(screen.getByText(/Selected pin: 37\.77930, -122\.41930/)).toBeTruthy();
    const confirm = screen.getByRole("button", { name: "Use this pin" }) as HTMLButtonElement;
    expect(confirm.disabled).toBe(true);

    fireEvent.click(screen.getByRole("button", { name: "Tap map" }));
    expect(screen.getByText(/Selected pin: 37\.78000, -122\.42000/)).toBeTruthy();
    expect(confirm.disabled).toBe(false);
    fireEvent.click(confirm);
    expect(onConfirm).toHaveBeenCalledWith(TAPPED_POINT);
  });

  test("returns to the previous location choice when canceled", () => {
    const onCancel = vi.fn();
    render(<LocationPicker initialPoint={INITIAL_POINT} onConfirm={vi.fn()} onCancel={onCancel} />);
    fireEvent.click(screen.getByRole("button", { name: "Back" }));
    expect(onCancel).toHaveBeenCalledOnce();
  });

  test("surfaces missing map configuration and disables confirmation", () => {
    vi.stubEnv("NEXT_PUBLIC_GOOGLE_MAPS_KEY", "");
    render(<LocationPicker initialPoint={INITIAL_POINT} onConfirm={vi.fn()} onCancel={vi.fn()} />);
    expect(screen.getByRole("alert").textContent).toMatch(/map isn't configured/i);
    expect((screen.getByRole("button", { name: "Use this pin" }) as HTMLButtonElement).disabled).toBe(true);
  });
});
