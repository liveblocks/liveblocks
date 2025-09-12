import type { ResolveRoomsInfoArgs } from "@liveblocks/core";
import { nanoid } from "@liveblocks/core";
import { renderHook, screen, waitFor } from "@testing-library/react";
import { Suspense } from "react";
import { ErrorBoundary } from "react-error-boundary";
import { afterAll, beforeAll, describe, expect, test, vi } from "vitest";

import { act, createContextsForTest } from "./_utils";

// eslint-disable-next-line @typescript-eslint/require-await
async function defaultResolveRoomsInfo({ roomIds }: ResolveRoomsInfoArgs) {
  return roomIds.map((roomId) => ({
    name: roomId,
  }));
}

describe("useRoomInfo", () => {
  beforeAll(() => {
    vi.useFakeTimers();
  });

  afterAll(() => {
    vi.useRealTimers();
  });

  test("should return an error if resolveRoomsInfo is not set", async () => {
    const roomId = nanoid();

    const {
      room: { RoomProvider, useRoomInfo },
    } = createContextsForTest({
      resolveRoomsInfo: undefined,
    });

    const { result, unmount } = renderHook(
      () => ({
        roomInfo: useRoomInfo("abc"),
      }),
      {
        wrapper: ({ children }) => (
          <RoomProvider id={roomId}>{children}</RoomProvider>
        ),
      }
    );

    expect(result.current.roomInfo).toEqual({ isLoading: true });

    await waitFor(() => expect(result.current.roomInfo.isLoading).toBeFalsy());

    expect(result.current.roomInfo).toEqual({
      isLoading: false,
      error: new Error(
        "resolveRoomsInfo didn't return anything for room 'abc'"
      ),
    });

    unmount();
  });

  test("should return the results from resolveRoomsInfo", async () => {
    const roomId = nanoid();

    const {
      room: { RoomProvider, useRoomInfo },
    } = createContextsForTest({
      resolveRoomsInfo: defaultResolveRoomsInfo,
    });

    const { result, unmount } = renderHook(
      () => ({
        roomInfo: useRoomInfo("abc"),
      }),
      {
        wrapper: ({ children }) => (
          <RoomProvider id={roomId}>{children}</RoomProvider>
        ),
      }
    );

    expect(result.current.roomInfo).toEqual({ isLoading: true });

    await waitFor(() => expect(result.current.roomInfo.isLoading).toBeFalsy());

    expect(result.current.roomInfo).toEqual({
      isLoading: false,
      info: { name: "abc" },
    });

    unmount();
  });

  test("should support changing room ID", async () => {
    const roomId = nanoid();

    const {
      room: { RoomProvider, useRoomInfo },
    } = createContextsForTest({
      resolveRoomsInfo: defaultResolveRoomsInfo,
    });

    const { result, rerender, unmount } = renderHook(
      ({ roomId }: { roomId: string }) => ({
        roomInfo: useRoomInfo(roomId),
      }),
      {
        wrapper: ({ children }) => (
          <RoomProvider id={roomId}>{children}</RoomProvider>
        ),
        initialProps: { roomId: "abc" },
      }
    );

    expect(result.current.roomInfo).toEqual({ isLoading: true });

    await waitFor(() => expect(result.current.roomInfo.isLoading).toBeFalsy());

    expect(result.current.roomInfo).toEqual({
      isLoading: false,
      info: { name: "abc" },
    });

    rerender({ roomId: "123" });

    expect(result.current.roomInfo).toEqual({ isLoading: true });

    await waitFor(() => expect(result.current.roomInfo.isLoading).toBeFalsy());

    expect(result.current.roomInfo).toEqual({
      isLoading: false,
      info: { name: "123" },
    });

    unmount();
  });

  test("should cache results based on room ID", async () => {
    const roomId = nanoid();

    const resolveRoomsInfo = vi.fn(({ roomIds }: ResolveRoomsInfoArgs) =>
      roomIds.map((roomId) => ({ name: roomId }))
    );
    const {
      room: { RoomProvider, useRoomInfo },
    } = createContextsForTest({
      resolveRoomsInfo,
    });

    const { result, rerender, unmount } = renderHook(
      ({ roomId }: { roomId: string }) => ({
        roomInfo: useRoomInfo(roomId),
      }),
      {
        wrapper: ({ children }) => (
          <RoomProvider id={roomId}>{children}</RoomProvider>
        ),
        initialProps: { roomId: "abc" },
      }
    );

    await waitFor(() => expect(result.current.roomInfo.isLoading).toBeFalsy());

    rerender({ roomId: "123" });

    await waitFor(() => expect(result.current.roomInfo.isLoading).toBeFalsy());

    rerender({ roomId: "abc" });

    expect(result.current.roomInfo).toEqual({
      isLoading: false,
      info: { name: "abc" },
    });

    expect(resolveRoomsInfo).toHaveBeenCalledTimes(2);

    expect(resolveRoomsInfo).toHaveBeenNthCalledWith(1, { roomIds: ["abc"] });

    expect(resolveRoomsInfo).toHaveBeenNthCalledWith(2, { roomIds: ["123"] });

    unmount();
  });

  test("should revalidate instantly if its cache is invalidated", async () => {
    const roomId = nanoid();

    const resolveRoomsInfo = vi.fn(({ roomIds }: ResolveRoomsInfoArgs) =>
      roomIds.map((roomId) => ({ name: roomId }))
    );
    const {
      client,
      room: { RoomProvider, useRoomInfo },
    } = createContextsForTest({
      resolveRoomsInfo,
    });

    const { result, rerender, unmount } = renderHook(
      ({ roomId }: { roomId: string }) => ({
        roomInfo: useRoomInfo(roomId),
      }),
      {
        wrapper: ({ children }) => (
          <RoomProvider id={roomId}>{children}</RoomProvider>
        ),
        initialProps: { roomId: "abc" },
      }
    );

    await waitFor(() => expect(result.current.roomInfo.isLoading).toBeFalsy());

    rerender({ roomId: "123" });

    await waitFor(() => expect(result.current.roomInfo.isLoading).toBeFalsy());

    rerender({ roomId: "abc" });

    expect(result.current.roomInfo).toEqual({
      isLoading: false,
      info: { name: "abc" },
    });

    // Invalidate all room IDs
    act(() => client.resolvers.invalidateRoomsInfo());

    await waitFor(() => expect(result.current.roomInfo.isLoading).toBeFalsy());

    expect(result.current.roomInfo).toEqual({
      isLoading: false,
      info: { name: "abc" },
    });

    expect(resolveRoomsInfo).toHaveBeenCalledTimes(3);

    expect(resolveRoomsInfo).toHaveBeenNthCalledWith(1, { roomIds: ["abc"] });

    expect(resolveRoomsInfo).toHaveBeenNthCalledWith(2, { roomIds: ["123"] });

    expect(resolveRoomsInfo).toHaveBeenNthCalledWith(3, { roomIds: ["abc"] });

    unmount();
  });

  test("should batch (and deduplicate) requests for the same room ID", async () => {
    const roomId = nanoid();

    const resolveRoomsInfo = vi.fn(({ roomIds }: ResolveRoomsInfoArgs) =>
      roomIds.map((roomId) => ({ name: roomId }))
    );
    const {
      room: { RoomProvider, useRoomInfo },
    } = createContextsForTest({
      resolveRoomsInfo,
    });

    const { result, unmount } = renderHook(
      () => ({
        roomInfoAbc: useRoomInfo("abc"),
        roomInfoAbc2: useRoomInfo("abc"),
        roomInfo123: useRoomInfo("123"),
      }),
      {
        wrapper: ({ children }) => (
          <RoomProvider id={roomId}>{children}</RoomProvider>
        ),
      }
    );

    await waitFor(() => {
      expect(result.current.roomInfoAbc.isLoading).toBeFalsy();
      expect(result.current.roomInfoAbc2.isLoading).toBeFalsy();
      expect(result.current.roomInfo123.isLoading).toBeFalsy();
    });

    expect(result.current.roomInfoAbc).toEqual({
      isLoading: false,
      info: { name: "abc" },
    });

    expect(result.current.roomInfoAbc2).toEqual({
      isLoading: false,
      info: { name: "abc" },
    });

    expect(result.current.roomInfo123).toEqual({
      isLoading: false,
      info: { name: "123" },
    });

    expect(resolveRoomsInfo).toHaveBeenCalledTimes(1);

    expect(resolveRoomsInfo).toHaveBeenCalledWith({ roomIds: ["abc", "123"] });

    unmount();
  });

  test("should support resolveRoomsInfo throwing an error", async () => {
    const roomId = nanoid();

    const {
      room: { RoomProvider, useRoomInfo },
    } = createContextsForTest({
      resolveRoomsInfo: () => {
        throw new Error("error");
      },
    });
    const { result, unmount } = renderHook(
      () => ({
        roomInfo: useRoomInfo("abc"),
      }),
      {
        wrapper: ({ children }) => (
          <RoomProvider id={roomId}>{children}</RoomProvider>
        ),
      }
    );

    expect(result.current.roomInfo).toEqual({ isLoading: true });

    await waitFor(() => expect(result.current.roomInfo.isLoading).toBeFalsy());

    expect(result.current.roomInfo).toEqual({
      isLoading: false,
      error: new Error("error"),
    });

    unmount();
  });

  test("should support resolveRoomsInfo returning a rejected promise", async () => {
    const roomId = nanoid();

    const {
      room: { RoomProvider, useRoomInfo },
    } = createContextsForTest({
      resolveRoomsInfo: () => {
        return Promise.reject("error");
      },
    });
    const { result, unmount } = renderHook(
      () => ({
        roomInfo: useRoomInfo("abc"),
      }),
      {
        wrapper: ({ children }) => (
          <RoomProvider id={roomId}>{children}</RoomProvider>
        ),
      }
    );

    expect(result.current.roomInfo).toEqual({ isLoading: true });

    await waitFor(() => expect(result.current.roomInfo.isLoading).toBeFalsy());

    expect(result.current.roomInfo).toEqual({
      isLoading: false,
      error: "error",
    });

    unmount();
  });

  test("should return an error if resolveRoomsInfo returns undefined", async () => {
    const roomId = nanoid();

    const {
      room: { RoomProvider, useRoomInfo },
    } = createContextsForTest({
      resolveRoomsInfo: () => {
        return undefined;
      },
    });
    const { result, unmount } = renderHook(
      () => ({
        roomInfo: useRoomInfo("abc"),
      }),
      {
        wrapper: ({ children }) => (
          <RoomProvider id={roomId}>{children}</RoomProvider>
        ),
      }
    );

    expect(result.current.roomInfo).toEqual({ isLoading: true });

    await waitFor(() => expect(result.current.roomInfo.isLoading).toBeFalsy());

    expect(result.current.roomInfo).toEqual({
      isLoading: false,
      error: new Error(
        "resolveRoomsInfo didn't return anything for room 'abc'"
      ),
    });

    unmount();
  });

  test("should return an error if resolveRoomsInfo returns undefined for a specifc room ID", async () => {
    const roomId = nanoid();

    const resolveRoomsInfo = vi.fn(({ roomIds }: ResolveRoomsInfoArgs) =>
      roomIds.map((roomId) => {
        if (roomId === "abc") {
          return undefined;
        }

        return { name: roomId };
      })
    );
    const {
      room: { RoomProvider, useRoomInfo },
    } = createContextsForTest({
      resolveRoomsInfo,
    });
    const { result, unmount } = renderHook(
      () => ({
        roomInfoAbc: useRoomInfo("abc"),
        roomInfo123: useRoomInfo("123"),
      }),
      {
        wrapper: ({ children }) => (
          <RoomProvider id={roomId}>{children}</RoomProvider>
        ),
      }
    );

    await waitFor(() => {
      expect(result.current.roomInfoAbc.isLoading).toBeFalsy();
      expect(result.current.roomInfo123.isLoading).toBeFalsy();
    });

    expect(result.current.roomInfoAbc).toEqual({
      isLoading: false,
      error: new Error(
        "resolveRoomsInfo didn't return anything for room 'abc'"
      ),
    });

    expect(result.current.roomInfo123).toEqual({
      isLoading: false,
      info: {
        name: "123",
      },
    });

    unmount();
  });
});

describe("useRoomInfoSuspense", () => {
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
        suspense: { useRoomInfo },
      },
    } = createContextsForTest({
      resolveRoomsInfo: defaultResolveRoomsInfo,
    });

    const { result, unmount } = renderHook(
      () => ({
        roomInfo: useRoomInfo("abc"),
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

    await waitFor(() => expect(result.current.roomInfo.isLoading).toBeFalsy());

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
        suspense: { useRoomInfo },
      },
    } = createContextsForTest({
      resolveRoomsInfo: defaultResolveRoomsInfo,
    });

    const { result, unmount } = renderHook(
      () => ({
        roomInfo: useRoomInfo("abc"),
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

    await waitFor(() => expect(result.current.roomInfo.isLoading).toBeFalsy());

    await waitFor(() => {
      // Check if the Suspense fallback is no longer displayed
      expect(screen.getByText("Loaded")).toBeInTheDocument();
    });

    act(() => client.resolvers.invalidateRoomsInfo());

    await waitFor(() => {
      // Check if the Suspense fallback is displayed again
      expect(screen.getByText("Loading")).toBeInTheDocument();
    });

    await waitFor(() => expect(result.current.roomInfo.isLoading).toBeFalsy());

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
        suspense: { useRoomInfo },
      },
    } = createContextsForTest({
      resolveRoomsInfo: () => {
        throw new Error("error");
      },
    });

    const { result, unmount } = renderHook(
      () => ({
        roomInfo: useRoomInfo("abc"),
      }),
      {
        wrapper: ({ children }) => (
          <RoomProvider id={roomId}>
            <ErrorBoundary
              fallback={<div>There was an error while getting room info.</div>}
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
        screen.getByText("There was an error while getting room info.")
      ).toBeInTheDocument();
    });

    unmount();
  });
});
