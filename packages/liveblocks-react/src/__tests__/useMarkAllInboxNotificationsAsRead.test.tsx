import { nanoid } from "@liveblocks/core";
import { act, renderHook, waitFor } from "@testing-library/react";
import { setupServer } from "msw/node";

import { dummyThreadData, dummyThreadInboxNotificationData } from "./_dummies";
import {
  mockGetInboxNotifications,
  mockMarkInboxNotificationsAsRead,
} from "./_restMocks";
import { createContextsForTest } from "./_utils";

const server = setupServer();

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));

afterEach(() => {
  server.resetHandlers();
});

afterAll(() => server.close());

describe("useMarkAllInboxNotificationsAsRead", () => {
  test("should mark all notifications as read optimistically", async () => {
    const roomId = nanoid();
    const threads = [dummyThreadData({ roomId }), dummyThreadData({ roomId })];
    const inboxNotifications = [
      dummyThreadInboxNotificationData({
        roomId,
        threadId: threads[0]!.id,
        readAt: null,
      }),
      dummyThreadInboxNotificationData({
        roomId,
        threadId: threads?.[1]?.id,
        readAt: null,
      }),
    ];

    server.use(
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
      liveblocks: {
        LiveblocksProvider,
        useInboxNotifications,
        useMarkAllInboxNotificationsAsRead,
      },
    } = createContextsForTest();

    const { result, unmount } = renderHook(
      () => ({
        markAllInboxNotificationsAsRead: useMarkAllInboxNotificationsAsRead(),
        inboxNotifications: useInboxNotifications().inboxNotifications,
        deletedThreads: [],
        deletedInboxNotifications: [],
        meta: {
          requestedAt: new Date().toISOString(),
        },
      }),
      {
        wrapper: ({ children }) => (
          <LiveblocksProvider>{children}</LiveblocksProvider>
        ),
      }
    );

    await waitFor(() => {
      expect(result.current.inboxNotifications).toEqual(
        expect.arrayContaining(inboxNotifications)
      );
    });

    act(() => {
      result.current.markAllInboxNotificationsAsRead();
    });

    expect(result.current.inboxNotifications?.[0]?.readAt).not.toBe(null);
    expect(result.current.inboxNotifications?.[1]?.readAt).not.toBe(null);

    unmount();
  });

  test("should mark all inbox notifications as read optimistically and revert the updates if error response from server", async () => {
    const roomId = nanoid();
    const threads = [dummyThreadData({ roomId }), dummyThreadData({ roomId })];
    const inboxNotifications = [
      dummyThreadInboxNotificationData({
        roomId,
        threadId: threads[0]!.id,
        readAt: null,
        notifiedAt: new Date(2024, 3, 6),
      }),
      dummyThreadInboxNotificationData({
        roomId,
        threadId: threads?.[1]?.id,
        readAt: null,
        notifiedAt: new Date(2024, 3, 5),
      }),
    ];

    server.use(
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
      liveblocks: {
        LiveblocksProvider,
        useInboxNotifications,
        useMarkAllInboxNotificationsAsRead,
      },
    } = createContextsForTest();

    const { result, unmount } = renderHook(
      () => ({
        markInboxNotificationsAsRead: useMarkAllInboxNotificationsAsRead(),
        inboxNotifications: useInboxNotifications().inboxNotifications,
      }),
      {
        wrapper: ({ children }) => (
          <LiveblocksProvider>{children}</LiveblocksProvider>
        ),
      }
    );

    await waitFor(() =>
      expect(result.current.inboxNotifications).toEqual(
        expect.arrayContaining(inboxNotifications)
      )
    );

    act(() => {
      result.current.markInboxNotificationsAsRead();
    });

    // We mark the notifications as read optimitiscally
    expect(result.current.inboxNotifications?.[0]?.readAt).not.toBe(null);
    expect(result.current.inboxNotifications?.[1]?.readAt).not.toBe(null);

    await waitFor(() => {
      // The readAt field should have been updated in the inbox notifications cache
      expect(result.current.inboxNotifications?.[0]?.readAt).toEqual(null);
      expect(result.current.inboxNotifications?.[1]?.readAt).toEqual(null);
    });

    unmount();
  });
});
