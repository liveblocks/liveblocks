import "@testing-library/jest-dom";

import type {
  BaseMetadata,
  ClientOptions,
  JsonObject,
  ResolveRoomsInfoArgs,
} from "@liveblocks/core";
import { createClient } from "@liveblocks/core";
import { renderHook, screen, waitFor } from "@testing-library/react";
import React, { Suspense } from "react";
import { ErrorBoundary } from "react-error-boundary";

import { createRoomContext } from "../room";
import { generateFakeJwt } from "./_utils";

// TODO: Dry up and create utils that wrap renderHook
function createRoomContextForTest<
  M extends BaseMetadata = BaseMetadata,
>(options?: Omit<ClientOptions, "authEndpoint" | "publicApiKey">) {
  const client = createClient({
    async authEndpoint() {
      return {
        token: await generateFakeJwt({ userId: "userId" }),
      };
    },
    // eslint-disable-next-line @typescript-eslint/require-await
    resolveRoomsInfo: async ({ roomIds }) => {
      return roomIds.map((roomId) => ({
        name: roomId,
      }));
    },
    ...options,
  });

  return createRoomContext<JsonObject, never, never, never, M>(
    client
  );
}

describe("useRoomInfo", () => {
  beforeAll(() => {
    jest.useFakeTimers();
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  test("should return an error if resolveRoomsInfo is not set", async () => {
    const { RoomProvider, useRoomInfo } = createRoomContextForTest({
      resolveRoomsInfo: undefined,
    });

    const { result, unmount } = renderHook(
      () => ({
        roomInfo: useRoomInfo("abc"),
      }),
      {
        wrapper: ({ children }) => (
          <RoomProvider id="room-id" initialPresence={{}}>
            {children}
          </RoomProvider>
        ),
      }
    );

    expect(result.current.roomInfo).toEqual({ isLoading: true });

    await waitFor(() => expect(result.current.roomInfo.isLoading).toBeFalsy());

    expect(result.current.roomInfo).toEqual({
      isLoading: false,
      error: new Error(
        "resolveRoomsInfo didn't return anything for this room ID."
      ),
    });

    unmount();
  });

  test("should return the results from resolveRoomsInfo", async () => {
    const { RoomProvider, useRoomInfo } = createRoomContextForTest();

    const { result, unmount } = renderHook(
      () => ({
        roomInfo: useRoomInfo("abc"),
      }),
      {
        wrapper: ({ children }) => (
          <RoomProvider id="room-id" initialPresence={{}}>
            {children}
          </RoomProvider>
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
    const { RoomProvider, useRoomInfo } = createRoomContextForTest();

    const { result, rerender, unmount } = renderHook(
      ({ roomId }: { roomId: string }) => ({
        roomInfo: useRoomInfo(roomId),
      }),
      {
        wrapper: ({ children }) => (
          <RoomProvider id="room-id" initialPresence={{}}>
            {children}
          </RoomProvider>
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
    const resolveRoomsInfo = jest.fn(({ roomIds }: ResolveRoomsInfoArgs) =>
      roomIds.map((roomId) => ({ name: roomId }))
    );
    const { RoomProvider, useRoomInfo } = createRoomContextForTest({
      resolveRoomsInfo,
    });

    const { result, rerender, unmount } = renderHook(
      ({ roomId }: { roomId: string }) => ({
        roomInfo: useRoomInfo(roomId),
      }),
      {
        wrapper: ({ children }) => (
          <RoomProvider id="room-id" initialPresence={{}}>
            {children}
          </RoomProvider>
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

  test("should batch (and deduplicate) requests for the same room ID", async () => {
    const resolveRoomsInfo = jest.fn(({ roomIds }: ResolveRoomsInfoArgs) =>
      roomIds.map((roomId) => ({ name: roomId }))
    );
    const { RoomProvider, useRoomInfo } = createRoomContextForTest({
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
          <RoomProvider id="room-id" initialPresence={{}}>
            {children}
          </RoomProvider>
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
    const { RoomProvider, useRoomInfo } = createRoomContextForTest({
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
          <RoomProvider id="room-id" initialPresence={{}}>
            {children}
          </RoomProvider>
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
    const { RoomProvider, useRoomInfo } = createRoomContextForTest({
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
          <RoomProvider id="room-id" initialPresence={{}}>
            {children}
          </RoomProvider>
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
    const { RoomProvider, useRoomInfo } = createRoomContextForTest({
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
          <RoomProvider id="room-id" initialPresence={{}}>
            {children}
          </RoomProvider>
        ),
      }
    );

    expect(result.current.roomInfo).toEqual({ isLoading: true });

    await waitFor(() => expect(result.current.roomInfo.isLoading).toBeFalsy());

    expect(result.current.roomInfo).toEqual({
      isLoading: false,
      error: new Error(
        "resolveRoomsInfo didn't return anything for this room ID."
      ),
    });

    unmount();
  });

  test("should return an error if resolveRoomsInfo returns undefined for a specifc room ID", async () => {
    const resolveRoomsInfo = jest.fn(({ roomIds }: ResolveRoomsInfoArgs) =>
      roomIds.map((roomId) => {
        if (roomId === "abc") {
          return undefined;
        }

        return { name: roomId };
      })
    );
    const { RoomProvider, useRoomInfo } = createRoomContextForTest({
      resolveRoomsInfo,
    });
    const { result, unmount } = renderHook(
      () => ({
        roomInfoAbc: useRoomInfo("abc"),
        roomInfo123: useRoomInfo("123"),
      }),
      {
        wrapper: ({ children }) => (
          <RoomProvider id="room-id" initialPresence={{}}>
            {children}
          </RoomProvider>
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
        "resolveRoomsInfo didn't return anything for this room ID."
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
    jest.useFakeTimers();
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  test("should suspend with Suspense", async () => {
    const {
      RoomProvider,
      suspense: { useRoomInfo },
    } = createRoomContextForTest();

    const { result, unmount } = renderHook(
      () => ({
        roomInfo: useRoomInfo("abc"),
      }),
      {
        wrapper: ({ children }) => (
          <RoomProvider id="room-id" initialPresence={{}}>
            <Suspense fallback={<div>Loading</div>}>{children}</Suspense>
          </RoomProvider>
        ),
      }
    );

    expect(result.current).toEqual(null);

    await waitFor(() => expect(result.current.roomInfo.isLoading).toBeFalsy());

    expect(result.current.roomInfo).toEqual({
      isLoading: false,
      info: { name: "abc" },
    });

    unmount();
  });

  test("should trigger error boundaries with Suspense", async () => {
    const {
      RoomProvider,
      suspense: { useRoomInfo },
    } = createRoomContextForTest({
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
          <RoomProvider id="room-id" initialPresence={{}}>
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
      // Check if the error boundary's fallback is displayed
      expect(
        screen.getByText("There was an error while getting room info.")
      ).toBeInTheDocument();
    });

    unmount();
  });
});
