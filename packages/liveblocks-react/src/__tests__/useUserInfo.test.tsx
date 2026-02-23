import "@testing-library/jest-dom";

import type { ResolveUsersArgs } from "@liveblocks/core";
import { nanoid } from "@liveblocks/core";
import { renderHook, waitFor } from "@testing-library/react";

import { useUserInfo } from "../use-user-info";
import { createContextsForTest } from "./_utils";

// eslint-disable-next-line @typescript-eslint/require-await
async function defaultResolveUsers({ userIds }: ResolveUsersArgs) {
  return userIds.map((userId) => ({ name: userId }));
}

describe("useUserInfo", () => {
  beforeAll(() => {
    jest.useFakeTimers();
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  describe("outside a room", () => {
    test("should return results from resolveUsers", async () => {
      const {
        liveblocks: { LiveblocksProvider },
      } = createContextsForTest({
        resolveUsers: defaultResolveUsers,
      });

      const { result, unmount } = renderHook(() => useUserInfo("abc"), {
        wrapper: ({ children }) => (
          <LiveblocksProvider>{children}</LiveblocksProvider>
        ),
      });

      expect(result.current).toEqual({ isLoading: true });

      await waitFor(() => expect(result.current.isLoading).toBeFalsy());

      expect(result.current).toEqual({
        isLoading: false,
        user: { name: "abc" },
      });

      unmount();
    });

    test("should return an error if resolveUsers is not set", async () => {
      const {
        liveblocks: { LiveblocksProvider },
      } = createContextsForTest({
        resolveUsers: undefined,
      });

      const { result, unmount } = renderHook(() => useUserInfo("abc"), {
        wrapper: ({ children }) => (
          <LiveblocksProvider>{children}</LiveblocksProvider>
        ),
      });

      expect(result.current).toEqual({ isLoading: true });

      await waitFor(() => expect(result.current.isLoading).toBeFalsy());

      expect(result.current).toEqual({
        isLoading: false,
        error: new Error("resolveUsers didn't return anything for user 'abc'"),
      });

      unmount();
    });

    test("should support changing user ID", async () => {
      const {
        liveblocks: { LiveblocksProvider },
      } = createContextsForTest({
        resolveUsers: defaultResolveUsers,
      });

      const { result, rerender, unmount } = renderHook(
        ({ userId }: { userId: string }) => useUserInfo(userId),
        {
          wrapper: ({ children }) => (
            <LiveblocksProvider>{children}</LiveblocksProvider>
          ),
          initialProps: { userId: "abc" },
        }
      );

      expect(result.current).toEqual({ isLoading: true });

      await waitFor(() => expect(result.current.isLoading).toBeFalsy());

      expect(result.current).toEqual({
        isLoading: false,
        user: { name: "abc" },
      });

      rerender({ userId: "123" });

      expect(result.current).toEqual({ isLoading: true });

      await waitFor(() => expect(result.current.isLoading).toBeFalsy());

      expect(result.current).toEqual({
        isLoading: false,
        user: { name: "123" },
      });

      unmount();
    });

    test("should support resolveUsers throwing an error", async () => {
      const {
        liveblocks: { LiveblocksProvider },
      } = createContextsForTest({
        resolveUsers: () => {
          throw new Error("error");
        },
      });

      const { result, unmount } = renderHook(() => useUserInfo("abc"), {
        wrapper: ({ children }) => (
          <LiveblocksProvider>{children}</LiveblocksProvider>
        ),
      });

      expect(result.current).toEqual({ isLoading: true });

      await waitFor(() => expect(result.current.isLoading).toBeFalsy());

      expect(result.current).toEqual({
        isLoading: false,
        error: new Error("error"),
      });

      unmount();
    });

    test("should support resolveUsers returning a rejected promise", async () => {
      const {
        liveblocks: { LiveblocksProvider },
      } = createContextsForTest({
        resolveUsers: () => {
          return Promise.reject("error");
        },
      });

      const { result, unmount } = renderHook(() => useUserInfo("abc"), {
        wrapper: ({ children }) => (
          <LiveblocksProvider>{children}</LiveblocksProvider>
        ),
      });

      expect(result.current).toEqual({ isLoading: true });

      await waitFor(() => expect(result.current.isLoading).toBeFalsy());

      expect(result.current).toEqual({
        isLoading: false,
        error: "error",
      });

      unmount();
    });

    test("should return an error if resolveUsers returns undefined", async () => {
      const {
        liveblocks: { LiveblocksProvider },
      } = createContextsForTest({
        resolveUsers: () => {
          return undefined;
        },
      });

      const { result, unmount } = renderHook(() => useUserInfo("abc"), {
        wrapper: ({ children }) => (
          <LiveblocksProvider>{children}</LiveblocksProvider>
        ),
      });

      expect(result.current).toEqual({ isLoading: true });

      await waitFor(() => expect(result.current.isLoading).toBeFalsy());

      expect(result.current).toEqual({
        isLoading: false,
        error: new Error("resolveUsers didn't return anything for user 'abc'"),
      });

      unmount();
    });
  });

  describe("inside a room", () => {
    test("should fall back to resolveUsers when user is not in presence", async () => {
      const roomId = nanoid();

      const {
        room: { RoomProvider },
      } = createContextsForTest({
        resolveUsers: defaultResolveUsers,
      });

      const { result, unmount } = renderHook(
        () => useUserInfo("unknown-user"),
        {
          wrapper: ({ children }) => (
            <RoomProvider id={roomId}>{children}</RoomProvider>
          ),
        }
      );

      expect(result.current).toEqual({ isLoading: true });

      await waitFor(() => expect(result.current.isLoading).toBeFalsy());

      expect(result.current).toEqual({
        isLoading: false,
        user: { name: "unknown-user" },
      });

      unmount();
    });

    test("should return an error if resolveUsers is not set and user is not in presence", async () => {
      const roomId = nanoid();

      const {
        room: { RoomProvider },
      } = createContextsForTest({
        resolveUsers: undefined,
      });

      const { result, unmount } = renderHook(
        () => useUserInfo("unknown-user"),
        {
          wrapper: ({ children }) => (
            <RoomProvider id={roomId}>{children}</RoomProvider>
          ),
        }
      );

      expect(result.current).toEqual({ isLoading: true });

      await waitFor(() => expect(result.current.isLoading).toBeFalsy());

      expect(result.current).toEqual({
        isLoading: false,
        error: new Error(
          "resolveUsers didn't return anything for user 'unknown-user'"
        ),
      });

      unmount();
    });

    test("should support changing user ID", async () => {
      const roomId = nanoid();

      const {
        room: { RoomProvider },
      } = createContextsForTest({
        resolveUsers: defaultResolveUsers,
      });

      const { result, rerender, unmount } = renderHook(
        ({ userId }: { userId: string }) => useUserInfo(userId),
        {
          wrapper: ({ children }) => (
            <RoomProvider id={roomId}>{children}</RoomProvider>
          ),
          initialProps: { userId: "abc" },
        }
      );

      expect(result.current).toEqual({ isLoading: true });

      await waitFor(() => expect(result.current.isLoading).toBeFalsy());

      expect(result.current).toEqual({
        isLoading: false,
        user: { name: "abc" },
      });

      rerender({ userId: "123" });

      expect(result.current).toEqual({ isLoading: true });

      await waitFor(() => expect(result.current.isLoading).toBeFalsy());

      expect(result.current).toEqual({
        isLoading: false,
        user: { name: "123" },
      });

      unmount();
    });
  });
});
