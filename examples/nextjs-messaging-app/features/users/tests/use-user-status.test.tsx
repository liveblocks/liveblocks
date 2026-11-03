import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useUserStatus } from "@/features/users";
import {
  EMPTY_STATUS,
  getStatusKey,
  parseStatus,
  STATUS_TEXT_MAX_LENGTH,
} from "@/lib/status";
import {
  getMockState,
  liveblocksMocks,
  resetMockState,
} from "@/tests/helpers/liveblocks-mock";

vi.mock(
  "@liveblocks/react/suspense",
  () => import("@/tests/helpers/liveblocks-mock")
);
vi.mock("@liveblocks/react", () => import("@/tests/helpers/liveblocks-mock"));

const CHARLIE = "charlie.layne@example.com";

describe("useUserStatus", () => {
  beforeEach(() => {
    localStorage.clear();
    resetMockState({
      selfId: CHARLIE,
      selfPresence: { typingIn: null },
    });
  });

  it("starts from EMPTY_STATUS when presence has no status", () => {
    const { result } = renderHook(() => useUserStatus());
    expect(result.current.status).toEqual(EMPTY_STATUS);
  });

  it("setStatus normalizes, updates presence, and persists", () => {
    const { result } = renderHook(() => useUserStatus());

    act(() => {
      result.current.setStatus({ text: "  heads down  ", emoji: "" });
    });

    const expected = { emoji: null, text: "heads down", away: false };
    expect(liveblocksMocks.updateMyPresence).toHaveBeenCalledWith({
      status: expected,
    });
    expect(getMockState().selfPresence.status).toEqual(expected);
    expect(parseStatus(localStorage.getItem(getStatusKey(CHARLIE)))).toEqual(
      expected
    );
    expect(result.current.status).toEqual(expected);
  });

  it("setAway updates only the away flag", () => {
    const { result } = renderHook(() => useUserStatus());

    act(() => {
      result.current.setStatus({ text: "busy" });
    });
    liveblocksMocks.updateMyPresence.mockClear();

    act(() => {
      result.current.setAway(true);
    });

    expect(liveblocksMocks.updateMyPresence).toHaveBeenCalledWith({
      status: { emoji: null, text: "busy", away: true },
    });
  });

  it("clearStatus removes emoji and text but keeps away", () => {
    const { result } = renderHook(() => useUserStatus());

    act(() => {
      result.current.setStatus({
        emoji: "🎉",
        text: "party",
        away: true,
      });
    });
    liveblocksMocks.updateMyPresence.mockClear();

    act(() => {
      result.current.clearStatus();
    });

    expect(liveblocksMocks.updateMyPresence).toHaveBeenCalledWith({
      status: { emoji: null, text: "", away: true },
    });
  });

  it("truncates long text through normalizeStatus", () => {
    const { result } = renderHook(() => useUserStatus());
    const long = "x".repeat(STATUS_TEXT_MAX_LENGTH + 5);

    act(() => {
      result.current.setStatus({ text: long });
    });

    expect(result.current.status.text.length).toBe(STATUS_TEXT_MAX_LENGTH);
  });
});
