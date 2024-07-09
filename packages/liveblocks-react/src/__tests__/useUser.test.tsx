import "@testing-library/jest-dom";

import type {
  BaseMetadata,
  BaseUserMeta,
  ClientOptions,
  JsonObject,
  ResolveUsersArgs,
} from "@liveblocks/core";
import { createClient } from "@liveblocks/core";
import { renderHook, screen, waitFor } from "@testing-library/react";
import { nanoid } from "nanoid";
import React, { Suspense } from "react";
import { ErrorBoundary } from "react-error-boundary";

import { createRoomContext } from "../room";
import { generateFakeJwt } from "./_utils";

// TODO: Dry up and create utils that wrap renderHook
function createRoomContextForTest<M extends BaseMetadata>(
  options?: Omit<ClientOptions<BaseUserMeta>, "authEndpoint" | "publicApiKey">
) {
  const client = createClient({
    async authEndpoint() {
      return {
        token: await generateFakeJwt({ userId: "userId" }),
      };
    },
    // eslint-disable-next-line @typescript-eslint/require-await
    resolveUsers: async ({ userIds }) => {
      return userIds.map((userId) => ({ name: userId }));
    },
    ...options,
  });

  return createRoomContext<JsonObject, never, never, never, M>(client);
}

describe("useUser", () => {
  beforeAll(() => {
    jest.useFakeTimers();
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  test("should return an error if resolveUsers is not set", async () => {
    const roomId = nanoid();

    const { RoomProvider, useUser } = createRoomContextForTest({
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

    const { RoomProvider, useUser } = createRoomContextForTest();

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

    const { RoomProvider, useUser } = createRoomContextForTest();

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

    const resolveUsers = jest.fn(({ userIds }: ResolveUsersArgs) =>
      userIds.map((userId) => ({ name: userId }))
    );
    const { RoomProvider, useUser } = createRoomContextForTest({
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

  test("should batch (and deduplicate) requests for the same user ID", async () => {
    const roomId = nanoid();

    const resolveUsers = jest.fn(({ userIds }: ResolveUsersArgs) =>
      userIds.map((userId) => ({ name: userId }))
    );
    const { RoomProvider, useUser } = createRoomContextForTest({
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

    const { RoomProvider, useUser } = createRoomContextForTest({
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

    const { RoomProvider, useUser } = createRoomContextForTest({
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

    const { RoomProvider, useUser } = createRoomContextForTest({
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

    const resolveUsers = jest.fn(({ userIds }: ResolveUsersArgs) =>
      userIds.map((userId) => {
        if (userId === "abc") {
          return undefined;
        }

        return { name: userId };
      })
    );
    const { RoomProvider, useUser } = createRoomContextForTest({
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
    jest.useFakeTimers();
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  test("should suspend with Suspense", async () => {
    const roomId = nanoid();

    const {
      RoomProvider,
      suspense: { useUser },
    } = createRoomContextForTest();

    const { result, unmount } = renderHook(
      () => ({
        user: useUser("abc"),
      }),
      {
        wrapper: ({ children }) => (
          <RoomProvider id={roomId}>
            <Suspense fallback={<div>Loading</div>}>{children}</Suspense>
          </RoomProvider>
        ),
      }
    );

    expect(result.current).toEqual(null);

    await waitFor(() => expect(result.current.user.isLoading).toBeFalsy());

    expect(result.current.user).toEqual({
      isLoading: false,
      user: { name: "abc" },
    });

    unmount();
  });

  test("should trigger error boundaries with Suspense", async () => {
    const roomId = nanoid();

    const {
      RoomProvider,
      suspense: { useUser },
    } = createRoomContextForTest({
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
      // Check if the error boundary's fallback is displayed
      expect(
        screen.getByText("There was an error while getting user.")
      ).toBeInTheDocument();
    });

    unmount();
  });
});
