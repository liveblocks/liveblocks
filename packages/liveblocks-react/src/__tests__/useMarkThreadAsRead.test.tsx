import type { BaseMetadata, JsonObject } from "@liveblocks/core";
import { createClient } from "@liveblocks/core";
import { act, renderHook, waitFor } from "@testing-library/react";
import { setupServer } from "msw/node";
import React from "react";

import { createLiveblocksContext } from "../liveblocks";
import { createRoomContext } from "../room";
import { dummyThreadData, dummyThreadInboxNotificationData } from "./_dummies";
import MockWebSocket from "./_MockWebSocket";
import {
  mockGetInboxNotifications,
  mockGetThreads,
  mockMarkInboxNotificationsAsRead,
} from "./_restMocks";
import { generateFakeJwt } from "./_utils";

const server = setupServer();

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));

afterEach(() => {
  server.resetHandlers();
});

afterAll(() => server.close());

// TODO: Dry up and create utils that wrap renderHook
function createRoomContextForTest<
  M extends BaseMetadata = BaseMetadata,
>() {
  const client = createClient({
    async authEndpoint() {
      return {
        token: await generateFakeJwt({ userId: "userId" }),
      };
    },
    polyfills: {
      WebSocket: MockWebSocket as any,
    },
  });

  return {
    roomCtx: createRoomContext<
      JsonObject,
      never,
      never,
      never,
      M
    >(client),
    liveblocksCtx: createLiveblocksContext(client),
  };
}

describe("useMarkThreadAsRead", () => {
  test("should mark notification as read optimistically", async () => {
    const threads = [dummyThreadData()];
    const inboxNotifications = [dummyThreadInboxNotificationData()];
    inboxNotifications[0].threadId = threads[0].id;
    inboxNotifications[0].readAt = null;

    server.use(
      mockGetThreads((_req, res, ctx) =>
        res(
          ctx.status(200),
          ctx.json({
            data: threads,
            inboxNotifications,
            deletedThreads: [],
            deletedInboxNotifications: [],
            meta: {
              requestedAt: new Date().toISOString(),
            },
          })
        )
      ),
      mockGetInboxNotifications((_req, res, ctx) =>
        res(
          ctx.status(200),
          ctx.json({
            inboxNotifications,
            threads,
            deletedThreads: [],
            deletedInboxNotifications: [],
            meta: {
              requestedAt: new Date().toISOString(),
            },
          })
        )
      ),
      mockMarkInboxNotificationsAsRead((_req, res, ctx) => res(ctx.status(200)))
    );

    const {
      roomCtx: { RoomProvider, useMarkThreadAsRead },
      liveblocksCtx: { LiveblocksProvider, useInboxNotifications },
    } = createRoomContextForTest();

    const { result, unmount } = renderHook(
      () => ({
        markThreadAsRead: useMarkThreadAsRead(),
        inboxNotifications: useInboxNotifications().inboxNotifications,
      }),
      {
        wrapper: ({ children }) => (
          <LiveblocksProvider>
            <RoomProvider id="room-id" initialPresence={{}}>
              {children}
            </RoomProvider>
          </LiveblocksProvider>
        ),
      }
    );

    await waitFor(() =>
      expect(result.current.inboxNotifications).toEqual(inboxNotifications)
    );

    // Mark the first thread in our threads list as read
    act(() => {
      result.current.markThreadAsRead(threads[0].id);
    });

    expect(result.current.inboxNotifications![0].readAt).not.toBe(null);

    unmount();
  });

  test("should mark inbox notification as read optimistically and revert the updates if error response from server", async () => {
    const threads = [dummyThreadData()];
    const inboxNotifications = [dummyThreadInboxNotificationData()];
    inboxNotifications[0].threadId = threads[0].id;
    inboxNotifications[0].readAt = null;

    server.use(
      mockGetThreads((_req, res, ctx) =>
        res(
          ctx.status(200),
          ctx.json({
            data: threads,
            inboxNotifications,
            deletedThreads: [],
            deletedInboxNotifications: [],
            meta: {
              requestedAt: new Date().toISOString(),
            },
          })
        )
      ),
      mockGetInboxNotifications((_req, res, ctx) =>
        res(
          ctx.status(200),
          ctx.json({
            inboxNotifications,
            threads,
            deletedThreads: [],
            deletedInboxNotifications: [],
            meta: {
              requestedAt: new Date().toISOString(),
            },
          })
        )
      ),
      mockMarkInboxNotificationsAsRead((_req, res, ctx) => res(ctx.status(500)))
    );

    const {
      roomCtx: { RoomProvider, useMarkThreadAsRead },
      liveblocksCtx: { LiveblocksProvider, useInboxNotifications },
    } = createRoomContextForTest();

    const { result, unmount } = renderHook(
      () => ({
        markThreadAsRead: useMarkThreadAsRead(),
        inboxNotifications: useInboxNotifications().inboxNotifications,
      }),
      {
        wrapper: ({ children }) => (
          <LiveblocksProvider>
            <RoomProvider id="room-id" initialPresence={{}}>
              {children}
            </RoomProvider>
          </LiveblocksProvider>
        ),
      }
    );

    await waitFor(() =>
      expect(result.current.inboxNotifications).toEqual(inboxNotifications)
    );

    // Mark the first thread in our threads list as read
    act(() => {
      result.current.markThreadAsRead(threads[0].id);
    });

    // We mark the notification as read optimitiscally
    expect(result.current.inboxNotifications![0].readAt).not.toBe(null);

    await waitFor(() => {
      // The readAt field should have been updated in the inbox notification cache
      expect(result.current.inboxNotifications![0].readAt).toEqual(null);
    });

    unmount();
  });
});
