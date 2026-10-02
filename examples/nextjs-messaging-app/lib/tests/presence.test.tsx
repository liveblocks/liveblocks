import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useUserPresence } from "@/lib/presence";
import { EMPTY_STATUS } from "@/lib/status";
import { resetMockState } from "@/tests/helpers/liveblocks-mock";

vi.mock(
  "@liveblocks/react/suspense",
  () => import("@/tests/helpers/liveblocks-mock")
);
vi.mock("@liveblocks/react", () => import("@/tests/helpers/liveblocks-mock"));

const SELF = "charlie.layne@example.com";
const MISLAV = "mislav.abha@example.com";

describe("useUserPresence", () => {
  beforeEach(() => {
    resetMockState({ selfId: SELF, selfPresence: { typingIn: null } });
  });

  it("marks self as online when not away", () => {
    const { result } = renderHook(() => useUserPresence());
    expect(result.current.get(SELF)).toEqual({
      online: true,
      status: undefined,
    });
  });

  it("marks self as offline when away", () => {
    resetMockState({
      selfId: SELF,
      selfPresence: {
        typingIn: null,
        status: { ...EMPTY_STATUS, away: true },
      },
    });
    const { result } = renderHook(() => useUserPresence());
    expect(result.current.get(SELF)).toEqual({
      online: false,
      status: { emoji: null, text: "", away: true },
    });
  });

  it("includes connected others as online with their status", () => {
    const status = { emoji: "🎉", text: "busy", away: false };
    resetMockState({
      selfId: SELF,
      others: [
        {
          connectionId: 1,
          id: MISLAV,
          presence: { typingIn: null, status },
        },
      ],
    });
    const { result } = renderHook(() => useUserPresence());
    expect(result.current.get(MISLAV)).toEqual({ online: true, status });
  });

  it("keeps away users offline but retains status", () => {
    const status = { emoji: "🌴", text: "vacation", away: true };
    resetMockState({
      selfId: SELF,
      others: [
        {
          connectionId: 1,
          id: MISLAV,
          presence: { typingIn: null, status },
        },
      ],
    });
    const { result } = renderHook(() => useUserPresence());
    expect(result.current.get(MISLAV)).toEqual({ online: false, status });
  });

  it("treats a user as online when any connection is active", () => {
    const awayStatus = { emoji: null, text: "", away: true };
    const activeStatus = { emoji: "💻", text: "working", away: false };
    resetMockState({
      selfId: SELF,
      others: [
        {
          connectionId: 1,
          id: MISLAV,
          presence: { typingIn: null, status: awayStatus },
        },
        {
          connectionId: 2,
          id: MISLAV,
          presence: { typingIn: null, status: activeStatus },
        },
      ],
    });
    const { result } = renderHook(() => useUserPresence());
    expect(result.current.get(MISLAV)).toEqual({
      online: true,
      status: activeStatus,
    });
  });

  it("omits users who are not connected", () => {
    const { result } = renderHook(() => useUserPresence());
    expect(result.current.has(MISLAV)).toBe(false);
    expect(result.current.size).toBe(1);
  });
});
