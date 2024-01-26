import type { BaseMetadata, JsonObject } from "@liveblocks/core";
import { createClient } from "@liveblocks/core";
import { renderHook, waitFor } from "@testing-library/react";
import { setupServer } from "msw/node";
import React from "react";

import { createRoomContext } from "../room";
import { dummyInboxNoficationData, dummyThreadData } from "./_dummies";
import MockWebSocket from "./_MockWebSocket";
import { mockGetThreads } from "./_restMocks";

const server = setupServer();

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));

beforeEach(() => {
  MockWebSocket.instances = [];
});

afterEach(() => {
  MockWebSocket.instances = [];
  server.resetHandlers();
});

afterAll(() => server.close());

// TODO: Dry up and create utils that wrap renderHook
function createRoomContextForTest<
  TThreadMetadata extends BaseMetadata = BaseMetadata,
>() {
  const client = createClient({
    publicApiKey: "pk_xxx",
    polyfills: {
      WebSocket: MockWebSocket as any,
    },
  });

  return createRoomContext<JsonObject, never, never, never, TThreadMetadata>(
    client
  );
}

describe("useThreadUnreadSince", () => {
  test("should return `null` if the associated inbox notification hasn't been read at all", async () => {
    const threads = [dummyThreadData()];
    const inboxNotifications = [dummyInboxNoficationData()];
    inboxNotifications[0].threadId = threads[0].id;

    server.use(
      mockGetThreads(async (_req, res, ctx) => {
        return res(
          ctx.json({
            data: threads,
            inboxNotifications,
          })
        );
      })
    );

    const { RoomProvider, useThreads, useThreadUnreadSince } =
      createRoomContextForTest();

    const { result, unmount } = renderHook(
      () => ({
        threads: useThreads(),
        unreadSince: useThreadUnreadSince(threads[0].id),
      }),
      {
        wrapper: ({ children }) => (
          <RoomProvider id="room-id" initialPresence={{}}>
            {children}
          </RoomProvider>
        ),
      }
    );

    expect(result.current.threads).toEqual({ isLoading: true });
    expect(result.current.unreadSince).toEqual(undefined);

    await waitFor(() =>
      expect(result.current.threads).toEqual({
        isLoading: false,
        threads,
      })
    );

    expect(result.current.unreadSince).toEqual(null);

    unmount();
  });

  test("should return the inbox notification's `readAt` date if it has been read", async () => {
    const threads = [dummyThreadData()];
    const inboxNotifications = [dummyInboxNoficationData()];
    inboxNotifications[0].threadId = threads[0].id;
    inboxNotifications[0].readAt = new Date();

    server.use(
      mockGetThreads(async (_req, res, ctx) => {
        return res(
          ctx.json({
            data: threads,
            inboxNotifications,
          })
        );
      })
    );

    const { RoomProvider, useThreads, useThreadUnreadSince } =
      createRoomContextForTest();

    const { result, unmount } = renderHook(
      () => ({
        threads: useThreads(),
        unreadSince: useThreadUnreadSince(threads[0].id),
      }),
      {
        wrapper: ({ children }) => (
          <RoomProvider id="room-id" initialPresence={{}}>
            {children}
          </RoomProvider>
        ),
      }
    );

    expect(result.current.threads).toEqual({ isLoading: true });
    expect(result.current.unreadSince).toEqual(undefined);

    await waitFor(() =>
      expect(result.current.threads).toEqual({
        isLoading: false,
        threads,
      })
    );

    expect(result.current.unreadSince).toEqual(inboxNotifications[0].readAt);

    unmount();
  });

  test("should return `undefined` if the thread doesn't have any inbox notification associated with it", async () => {
    const threads = [dummyThreadData()];

    server.use(
      mockGetThreads(async (_req, res, ctx) => {
        return res(
          ctx.json({
            data: threads,
            inboxNotifications: [],
          })
        );
      })
    );

    const { RoomProvider, useThreads, useThreadUnreadSince } =
      createRoomContextForTest();

    const { result, unmount } = renderHook(
      () => ({
        threads: useThreads(),
        unreadSince: useThreadUnreadSince(threads[0].id),
      }),
      {
        wrapper: ({ children }) => (
          <RoomProvider id="room-id" initialPresence={{}}>
            {children}
          </RoomProvider>
        ),
      }
    );

    expect(result.current.threads).toEqual({ isLoading: true });
    expect(result.current.unreadSince).toEqual(undefined);

    await waitFor(() =>
      expect(result.current.threads).toEqual({
        isLoading: false,
        threads,
      })
    );

    expect(result.current.unreadSince).toEqual(undefined);

    unmount();
  });
});
