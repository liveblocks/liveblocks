import type { ResolveUsersArgs } from "@liveblocks/core";
import { nanoid } from "@liveblocks/core";
import { renderHook, screen, waitFor } from "@testing-library/react";
import { Suspense } from "react";
import { ErrorBoundary } from "react-error-boundary";
import { afterAll, beforeAll, describe, expect, test, vi } from "vitest";

import { act, createContextsForTest } from "./_utils";

// eslint-disable-next-line @typescript-eslint/require-await
async function defaultResolveUsers({ userIds }: ResolveUsersArgs) {
  return userIds.map((userId) => ({ name: userId }));
}

describe("useUser", () => {
  beforeAll(() => {
    vi.useFakeTimers();
  });

  afterAll(() => {
    vi.useRealTimers();
  });

  test("should return an error if resolveUsers is not set", async () => {
    const roomId = nanoid();

    const {
      room: { RoomProvider, useUser },
    } = createContextsForTest({
      resolveUsers: undefined,
    });

    const { result, unmount } = renderHook(
      () => ({
        user: useUser("abc"),
      }),
      {
        wrapper: ({ children }) => (
          <RoomProvider id={roomId}>{children}</RoomProvider>
        ),
      }
    );

    expect(result.current.user).toEqual({ isLoading: true });

    await waitFor(() => expect(result.current.user.isLoading).toBeFalsy());

    expect(result.current.user).toEqual({
      isLoading: false,
      error: new Error("resolveUsers didn't return anything for user 'abc'"),
    });

    unmount();
  });

  test("should return the results from resolveUsers", async () => {
    const roomId = nanoid();

    const {
      room: { RoomProvider, useUser },
    } = createContextsForTest({
      resolveUsers: defaultResolveUsers,
    });

    const { result, unmount } = renderHook(
      () => ({
        user: useUser("abc"),
      }),
      {
        wrapper: ({ children }) => (
          <RoomProvider id={roomId}>{children}</RoomProvider>
        ),
      }
    );

    expect(result.current.user).toEqual({ isLoading: true });

    await waitFor(() => expect(result.current.user.isLoading).toBeFalsy());

    expect(result.current.user).toEqual({
      isLoading: false,
      user: { name: "abc" },
    });

    unmount();
  });

  test("should support changing user ID", async () => {
    const roomId = nanoid();

    const {
      room: { RoomProvider, useUser },
    } = createContextsForTest({
      resolveUsers: defaultResolveUsers,
    });

    const { result, rerender, unmount } = renderHook(
      ({ userId }: { userId: string }) => ({
        user: useUser(userId),
      }),
      {
        wrapper: ({ children }) => (
          <RoomProvider id={roomId}>{children}</RoomProvider>
        ),
        initialProps: { userId: "abc" },
      }
    );

    expect(result.current.user).toEqual({ isLoading: true });

    await waitFor(() => expect(result.current.user.isLoading).toBeFalsy());

    expect(result.current.user).toEqual({
      isLoading: false,
      user: { name: "abc" },
    });

    rerender({ userId: "123" });

    expect(result.current.user).toEqual({ isLoading: true });

    await waitFor(() => expect(result.current.user.isLoading).toBeFalsy());

    expect(result.current.user).toEqual({
      isLoading: false,
      user: { name: "123" },
    });

    unmount();
  });

  test("should cache results based on user ID", async () => {
    const roomId = nanoid();

    const resolveUsers = vi.fn(({ userIds }: ResolveUsersArgs) =>
      userIds.map((userId) => ({ name: userId }))
    );
    const {
      room: { RoomProvider, useUser },
    } = createContextsForTest({
      resolveUsers,
    });

    const { result, rerender, unmount } = renderHook(
      ({ userId }: { userId: string }) => ({
        user: useUser(userId),
      }),
      {
        wrapper: ({ children }) => (
          <RoomProvider id={roomId}>{children}</RoomProvider>
        ),
        initialProps: { userId: "abc" },
      }
    );

    await waitFor(() => expect(result.current.user.isLoading).toBeFalsy());

    rerender({ userId: "123" });

    await waitFor(() => expect(result.current.user.isLoading).toBeFalsy());

    rerender({ userId: "abc" });

    expect(result.current.user).toEqual({
      isLoading: false,
      user: { name: "abc" },
    });

    expect(resolveUsers).toHaveBeenCalledTimes(2);

    expect(resolveUsers).toHaveBeenNthCalledWith(1, { userIds: ["abc"] });

    expect(resolveUsers).toHaveBeenNthCalledWith(2, { userIds: ["123"] });

    unmount();
  });

  test("should revalidate instantly if its cache is invalidated", async () => {
    const roomId = nanoid();

    const resolveUsers = vi.fn(({ userIds }: ResolveUsersArgs) =>
      userIds.map((userId) => ({ name: userId }))
    );
    const {
      client,
      room: { RoomProvider, useUser },
    } = createContextsForTest({
      resolveUsers,
    });

    const { result, rerender, unmount } = renderHook(
      ({ userId }: { userId: string }) => ({
        user: useUser(userId),
      }),
      {
        wrapper: ({ children }) => (
          <RoomProvider id={roomId}>{children}</RoomProvider>
        ),
        initialProps: { userId: "abc" },
      }
    );

    await waitFor(() => expect(result.current.user.isLoading).toBeFalsy());

    rerender({ userId: "123" });

    await waitFor(() => expect(result.current.user.isLoading).toBeFalsy());

    rerender({ userId: "abc" });

    expect(result.current.user).toEqual({
      isLoading: false,
      user: { name: "abc" },
    });

    // Invalidate all user IDs
    act(() => client.resolvers.invalidateUsers());

    await waitFor(() => expect(result.current.user.isLoading).toBeFalsy());

    expect(result.current.user).toEqual({
      isLoading: false,
      user: { name: "abc" },
    });

    expect(resolveUsers).toHaveBeenCalledTimes(3);

    expect(resolveUsers).toHaveBeenNthCalledWith(1, { userIds: ["abc"] });

    expect(resolveUsers).toHaveBeenNthCalledWith(2, { userIds: ["123"] });

    expect(resolveUsers).toHaveBeenNthCalledWith(3, { userIds: ["abc"] });

    unmount();
  });

  test("should batch (and deduplicate) requests for the same user ID", async () => {
    const roomId = nanoid();

    const resolveUsers = vi.fn(({ userIds }: ResolveUsersArgs) =>
      userIds.map((userId) => ({ name: userId }))
    );
    const {
      room: { RoomProvider, useUser },
    } = createContextsForTest({
      resolveUsers,
    });

    const { result, unmount } = renderHook(
      () => ({
        userAbc: useUser("abc"),
        userAbc2: useUser("abc"),
        user123: useUser("123"),
      }),
      {
        wrapper: ({ children }) => (
          <RoomProvider id={roomId}>{children}</RoomProvider>
        ),
      }
    );

    await waitFor(() => {
      expect(result.current.userAbc.isLoading).toBeFalsy();
      expect(result.current.userAbc2.isLoading).toBeFalsy();
      expect(result.current.user123.isLoading).toBeFalsy();
    });

    expect(result.current.userAbc).toEqual({
      isLoading: false,
      user: { name: "abc" },
    });

    expect(result.current.userAbc2).toEqual({
      isLoading: false,
      user: { name: "abc" },
    });

    expect(result.current.user123).toEqual({
      isLoading: false,
      user: { name: "123" },
    });

    expect(resolveUsers).toHaveBeenCalledTimes(1);

    expect(resolveUsers).toHaveBeenCalledWith({ userIds: ["abc", "123"] });

    unmount();
  });

  test("should support resolveUsers throwing an error", async () => {
    const roomId = nanoid();

    const {
      room: { RoomProvider, useUser },
    } = createContextsForTest({
      resolveUsers: () => {
        throw new Error("error");
      },
    });
    const { result, unmount } = renderHook(
      () => ({
        user: useUser("abc"),
      }),
      {
        wrapper: ({ children }) => (
          <RoomProvider id={roomId}>{children}</RoomProvider>
        ),
      }
    );

    expect(result.current.user).toEqual({ isLoading: true });

    await waitFor(() => expect(result.current.user.isLoading).toBeFalsy());

    expect(result.current.user).toEqual({
      isLoading: false,
      error: new Error("error"),
    });

    unmount();
  });

  test("should support resolveUsers returning a rejected promise", async () => {
    const roomId = nanoid();

    const {
      room: { RoomProvider, useUser },
    } = createContextsForTest({
      resolveUsers: () => {
        return Promise.reject("error");
      },
    });
    const { result, unmount } = renderHook(
      () => ({
        user: useUser("abc"),
      }),
      {
        wrapper: ({ children }) => (
          <RoomProvider id={roomId}>{children}</RoomProvider>
        ),
      }
    );

    expect(result.current.user).toEqual({ isLoading: true });

    await waitFor(() => expect(result.current.user.isLoading).toBeFalsy());

    expect(result.current.user).toEqual({
      isLoading: false,
      error: "error",
    });

    unmount();
  });

  test("should return an error if resolveUsers returns undefined", async () => {
    const roomId = nanoid();

    const {
      room: { RoomProvider, useUser },
    } = createContextsForTest({
      resolveUsers: () => {
        return undefined;
      },
    });
    const { result, unmount } = renderHook(
      () => ({
        user: useUser("abc"),
      }),
      {
        wrapper: ({ children }) => (
          <RoomProvider id={roomId}>{children}</RoomProvider>
        ),
      }
    );

    expect(result.current.user).toEqual({ isLoading: true });

    await waitFor(() => expect(result.current.user.isLoading).toBeFalsy());

    expect(result.current.user).toEqual({
      isLoading: false,
      error: new Error("resolveUsers didn't return anything for user 'abc'"),
    });

    unmount();
  });

  test("should return an error if resolveUsers returns undefined for a specifc user ID", async () => {
    const roomId = nanoid();

    const resolveUsers = vi.fn(({ userIds }: ResolveUsersArgs) =>
      userIds.map((userId) => {
        if (userId === "abc") {
          return undefined;
        }

        return { name: userId };
      })
    );
    const {
      room: { RoomProvider, useUser },
    } = createContextsForTest({
      resolveUsers,
    });
    const { result, unmount } = renderHook(
      () => ({
        userAbc: useUser("abc"),
        user123: useUser("123"),
      }),
      {
        wrapper: ({ children }) => (
          <RoomProvider id={roomId}>{children}</RoomProvider>
        ),
      }
    );

    await waitFor(() => {
      expect(result.current.userAbc.isLoading).toBeFalsy();
      expect(result.current.user123.isLoading).toBeFalsy();
    });

    expect(result.current.userAbc).toEqual({
      isLoading: false,
      error: new Error("resolveUsers didn't return anything for user 'abc'"),
    });

    expect(result.current.user123).toEqual({
      isLoading: false,
      user: {
        name: "123",
      },
    });

    unmount();
  });
});

describe("useUserSuspense", () => {
  beforeAll(() => {
    vi.useFakeTimers();
  });

  afterAll(() => {
    vi.useRealTimers();
  });

  test("should suspend with Suspense", async () => {
    const roomId = nanoid();

    const {
      room: {
        RoomProvider,
        suspense: { useUser },
      },
    } = createContextsForTest({
      resolveUsers: defaultResolveUsers,
    });

    const { result, unmount } = renderHook(
      () => ({
        user: useUser("abc"),
      }),
      {
        wrapper: ({ children }) => (
          <RoomProvider id={roomId}>
            <Suspense fallback={<div>Loading</div>}>
              <div>Loaded</div>
              {children}
            </Suspense>
          </RoomProvider>
        ),
      }
    );

    await waitFor(() => {
      // Check if the Suspense fallback is displayed
      expect(screen.getByText("Loading")).toBeInTheDocument();
    });

    await waitFor(() => expect(result.current.user.isLoading).toBeFalsy());

    await waitFor(() => {
      // Check if the Suspense fallback is no longer displayed
      expect(screen.getByText("Loaded")).toBeInTheDocument();
    });

    unmount();
  });

  test("should suspend with Suspense again if its cache is invalidated", async () => {
    const roomId = nanoid();

    const {
      client,
      room: {
        RoomProvider,
        suspense: { useUser },
      },
    } = createContextsForTest({
      resolveUsers: defaultResolveUsers,
    });

    const { result, unmount } = renderHook(
      () => ({
        user: useUser("abc"),
      }),
      {
        wrapper: ({ children }) => (
          <RoomProvider id={roomId}>
            <Suspense fallback={<div>Loading</div>}>
              <div>Loaded</div>
              {children}
            </Suspense>
          </RoomProvider>
        ),
      }
    );

    await waitFor(() => {
      // Check if the Suspense fallback is displayed
      expect(screen.getByText("Loading")).toBeInTheDocument();
    });

    await waitFor(() => expect(result.current.user.isLoading).toBeFalsy());

    await waitFor(() => {
      // Check if the Suspense fallback is no longer displayed
      expect(screen.getByText("Loaded")).toBeInTheDocument();
    });

    act(() => client.resolvers.invalidateUsers());

    await waitFor(() => {
      // Check if the Suspense fallback is displayed again
      expect(screen.getByText("Loading")).toBeInTheDocument();
    });

    await waitFor(() => expect(result.current.user.isLoading).toBeFalsy());

    await waitFor(() => {
      // Check if the Suspense fallback is no longer displayed again
      expect(screen.getByText("Loaded")).toBeInTheDocument();
    });

    unmount();
  });

  test("should trigger error boundaries with Suspense", async () => {
    const roomId = nanoid();

    const {
      room: {
        RoomProvider,
        suspense: { useUser },
      },
    } = createContextsForTest({
      resolveUsers: () => {
        throw new Error("error");
      },
    });

    const { result, unmount } = renderHook(
      () => ({
        user: useUser("abc"),
      }),
      {
        wrapper: ({ children }) => (
          <RoomProvider id={roomId}>
            <ErrorBoundary
              fallback={<div>There was an error while getting user.</div>}
            >
              <Suspense fallback={<div>Loading</div>}>{children}</Suspense>
            </ErrorBoundary>
          </RoomProvider>
        ),
      }
    );

    expect(result.current).toEqual(null);

    await waitFor(() => {
      // Check if the error boundary fallback is displayed
      expect(
        screen.getByText("There was an error while getting user.")
      ).toBeInTheDocument();
    });

    unmount();
  });
});
