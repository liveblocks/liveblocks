import { nanoid, Permission } from "@liveblocks/core";
import { act, renderHook, waitFor } from "@testing-library/react";
import { setupServer } from "msw/node";

import { dummyThreadData, dummyThreadInboxNotificationData } from "./_dummies";
import {
  mockGetInboxNotifications,
  mockGetThreads,
  mockMarkInboxNotificationsAsRead,
} from "./_restMocks";
import { createContextsForTest } from "./_utils";

const server = setupServer();

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));

afterEach(() => {
  server.resetHandlers();
});

afterAll(() => server.close());

describe("useMarkThreadAsRead", () => {
  test("should mark notification as read optimistically", async () => {
    const roomId = nanoid();
    const threads = [dummyThreadData({ roomId })];
    const inboxNotifications = [
      dummyThreadInboxNotificationData({
        roomId,
        threadId: threads[0]!.id,
        readAt: null,
      }),
    ];

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
              nextCursor: null,
              permissionHints: {
                [roomId]: [Permission.Write],
              },
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
            meta: {
              requestedAt: new Date().toISOString(),
              nextCursor: null,
            },
          })
        )
      ),
      mockMarkInboxNotificationsAsRead((_req, res, ctx) => res(ctx.status(200)))
    );

    const {
      room: { RoomProvider, useMarkThreadAsRead },
      liveblocks: { LiveblocksProvider, useInboxNotifications },
    } = createContextsForTest();

    const { result, unmount } = renderHook(
      () => ({
        markThreadAsRead: useMarkThreadAsRead(),
        inboxNotifications: useInboxNotifications().inboxNotifications,
      }),
      {
        wrapper: ({ children }) => (
          <LiveblocksProvider>
            <RoomProvider id={roomId}>{children}</RoomProvider>
          </LiveblocksProvider>
        ),
      }
    );

    await waitFor(() =>
      expect(result.current.inboxNotifications).toEqual(
        expect.arrayContaining(inboxNotifications)
      )
    );

    // Mark the first thread in our threads list as read
    act(() => {
      result.current.markThreadAsRead(threads[0]!.id);
    });

    expect(result.current.inboxNotifications?.[0]?.readAt).not.toBe(null);

    unmount();
  });

  test("should mark inbox notification as read optimistically and revert the updates if error response from server", async () => {
    const roomId = nanoid();
    const threads = [dummyThreadData({ roomId })];
    const inboxNotifications = [
      dummyThreadInboxNotificationData({
        roomId,
        threadId: threads[0]!.id,
        readAt: null,
      }),
    ];

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
              nextCursor: null,
              permissionHints: {
                [roomId]: [Permission.Write],
              },
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
            meta: {
              requestedAt: new Date().toISOString(),
              nextCursor: null,
            },
          })
        )
      ),
      mockMarkInboxNotificationsAsRead((_req, res, ctx) => res(ctx.status(500)))
    );

    const {
      room: { RoomProvider, useMarkThreadAsRead },
      liveblocks: { LiveblocksProvider, useInboxNotifications },
    } = createContextsForTest();

    const { result, unmount } = renderHook(
      () => ({
        markThreadAsRead: useMarkThreadAsRead(),
        inboxNotifications: useInboxNotifications().inboxNotifications,
      }),
      {
        wrapper: ({ children }) => (
          <LiveblocksProvider>
            <RoomProvider id={roomId}>{children}</RoomProvider>
          </LiveblocksProvider>
        ),
      }
    );

    await waitFor(() =>
      expect(result.current.inboxNotifications).toEqual(
        expect.arrayContaining(inboxNotifications)
      )
    );

    // Mark the first thread in our threads list as read
    act(() => {
      result.current.markThreadAsRead(threads[0]!.id);
    });

    // We mark the notification as read optimitiscally
    expect(result.current.inboxNotifications?.[0]?.readAt).not.toBe(null);

    await waitFor(() => {
      // The readAt field should have been updated in the inbox notification cache
      expect(result.current.inboxNotifications?.[0]?.readAt).toEqual(null);
    });

    unmount();
  });
});
