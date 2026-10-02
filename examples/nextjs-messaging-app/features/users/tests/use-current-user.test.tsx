import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getUsers } from "@/lib/database";

const { useSessionMock, signInDemoMock, signOutMock } = vi.hoisted(() => ({
  useSessionMock: vi.fn(),
  signInDemoMock: vi.fn(),
  signOutMock: vi.fn(),
}));

vi.mock("@/features/users/auth-client", () => ({
  authClient: {
    useSession: useSessionMock,
    signIn: { demo: signInDemoMock },
    signOut: signOutMock,
  },
}));

import {
  type CurrentUser,
  getPreviewUserId,
  useCurrentUser,
} from "@/features/users";

function signedIn(current: CurrentUser) {
  if (current.status !== "signed-in") {
    throw new Error("expected signed-in state");
  }
  return current;
}

function signedOut(current: CurrentUser) {
  if (current.status !== "signed-out") {
    throw new Error("expected signed-out state");
  }
  return current;
}

const users = getUsers();

describe("getPreviewUserId", () => {
  it("maps indices to demo users with wrap-around", () => {
    expect(getPreviewUserId(0)).toBe(users[0].id);
    expect(getPreviewUserId(users.length)).toBe(users[0].id);
    expect(getPreviewUserId(-1)).toBe(users[1].id);
  });
});

describe("useCurrentUser", () => {
  beforeEach(() => {
    useSessionMock.mockReset();
    signInDemoMock.mockReset();
    signOutMock.mockReset();
    signInDemoMock.mockResolvedValue({});
    signOutMock.mockResolvedValue(undefined);
  });

  it("returns preview signed-in state without auth calls", () => {
    useSessionMock.mockReturnValue({ isPending: false, data: null });
    const { result } = renderHook(() => useCurrentUser(0));

    expect(result.current).toMatchObject({
      status: "signed-in",
      userId: getPreviewUserId(0),
      preview: true,
      signOut: null,
    });
  });

  it("returns loading while the session is pending", () => {
    useSessionMock.mockReturnValue({ isPending: true });
    const { result } = renderHook(() => useCurrentUser(null));

    expect(result.current).toEqual({ status: "loading" });
  });

  it("returns signed-out when there is no session user", () => {
    useSessionMock.mockReturnValue({ isPending: false, data: null });
    const { result } = renderHook(() => useCurrentUser(null));

    expect(result.current.status).toBe("signed-out");
  });

  it("returns signed-out when the session user is unknown", () => {
    useSessionMock.mockReturnValue({
      isPending: false,
      data: { user: { id: "nobody@example.com" } },
    });
    const { result } = renderHook(() => useCurrentUser(null));

    expect(result.current.status).toBe("signed-out");
  });

  it("signIn calls demo sign-in and throws on error", async () => {
    useSessionMock.mockReturnValue({ isPending: false, data: null });
    signInDemoMock.mockResolvedValueOnce({
      error: { message: "Could not sign in" },
    });
    const { result } = renderHook(() => useCurrentUser(null));

    await expect(signedOut(result.current).signIn(users[0].id)).rejects.toThrow(
      "Could not sign in"
    );
    expect(signInDemoMock).toHaveBeenCalledWith({ userId: users[0].id });

    signInDemoMock.mockResolvedValueOnce({});
    await act(async () => {
      await signedOut(result.current).signIn(users[1].id);
    });
    expect(signInDemoMock).toHaveBeenCalledWith({ userId: users[1].id });
  });

  it("returns signed-in for a known session user with sign-out", async () => {
    useSessionMock.mockReturnValue({
      isPending: false,
      data: { user: { id: users[0].id } },
    });
    const { result } = renderHook(() => useCurrentUser(null));

    expect(result.current).toMatchObject({
      status: "signed-in",
      userId: users[0].id,
      preview: false,
    });

    await act(async () => {
      await signedIn(result.current).signOut?.();
    });
    expect(signOutMock).toHaveBeenCalled();
  });
});
