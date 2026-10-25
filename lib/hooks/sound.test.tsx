// @vitest-environment jsdom
import { act, fireEvent, renderHook } from "@testing-library/react";
import { expect, test } from "vitest";
import { SoundProvider, useSoundUnlocked } from "./sound";

test("starts muted, unlocks on the first tap anywhere and stays unlocked", () => {
  const { result } = renderHook(() => useSoundUnlocked(), { wrapper: SoundProvider });
  expect(result.current).toBe(false);

  act(() => {
    fireEvent.touchEnd(document.body);
  });
  expect(result.current).toBe(true);

  act(() => {
    fireEvent.keyDown(document.body);
  });
  expect(result.current).toBe(true);
});
