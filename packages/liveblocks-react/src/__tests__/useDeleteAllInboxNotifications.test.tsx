import { act, renderHook, waitFor } from "@testing-library/react";
import { setupServer } from "msw/node";
import { nanoid } from "nanoid";
import React from "react";

import { dummyThreadData, dummyThreadInboxNotificationData } from "./_dummies";
import {
  mockDeleteAllInboxNotifications,
  mockGetInboxNotifications,
} from "./_restMocks";
import { createContextsForTest } from "./_utils";

const server = setupServer();

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));

afterEach(() => {
  server.resetHandlers();
});

afterAll(() => server.close());

describe("useDeleteAllInboxNotifications", () => {
  test("should delete all notifications optimistically", async () => {
    const roomId = nanoid();
    const threads = [dummyThreadData({ roomId }), dummyThreadData({ roomId })];
    const inboxNotifications = [
      dummyThreadInboxNotificationData({
        roomId,
        threadId: threads[0].id,
        readAt: null,
      }),
      dummyThreadInboxNotificationData({
        roomId,
        threadId: threads[1].id,
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
            deletedThreads: [],
            deletedInboxNotifications: [],
            meta: {
              requestedAt: new Date().toISOString(),
            },
          })
        )
      ),
      mockDeleteAllInboxNotifications((_req, res, ctx) => res(ctx.status(204)))
    );

    const {
      liveblocks: {
        LiveblocksProvider,
        useInboxNotifications,
        useDeleteAllInboxNotifications,
      },
    } = createContextsForTest();

    const { result, unmount } = renderHook(
      () => ({
        deleteAllInboxNotifications: useDeleteAllInboxNotifications(),
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

    await waitFor(() =>
      expect(result.current.inboxNotifications).toEqual(inboxNotifications)
    );

    act(() => {
      result.current.deleteAllInboxNotifications();
    });

    expect(result.current.inboxNotifications).toEqual([]);

    unmount();
  });

  test("should delete all inbox notifications optimistically and revert the updates if error response from server", async () => {
    const roomId = nanoid();
    const threads = [dummyThreadData({ roomId }), dummyThreadData({ roomId })];
    const inboxNotifications = [
      dummyThreadInboxNotificationData({
        roomId,
        threadId: threads[0].id,
        readAt: null,
      }),
      dummyThreadInboxNotificationData({
        roomId,
        threadId: threads[1].id,
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
            deletedThreads: [],
            deletedInboxNotifications: [],
            meta: {
              requestedAt: new Date().toISOString(),
            },
          })
        )
      ),
      mockDeleteAllInboxNotifications((_req, res, ctx) => res(ctx.status(500)))
    );

    const {
      liveblocks: {
        LiveblocksProvider,
        useInboxNotifications,
        useDeleteAllInboxNotifications,
      },
    } = createContextsForTest();

    const { result, unmount } = renderHook(
      () => ({
        deleteAllInboxNotifications: useDeleteAllInboxNotifications(),
        inboxNotifications: useInboxNotifications().inboxNotifications,
      }),
      {
        wrapper: ({ children }) => (
          <LiveblocksProvider>{children}</LiveblocksProvider>
        ),
      }
    );

    await waitFor(() =>
      expect(result.current.inboxNotifications).toEqual(inboxNotifications)
    );

    act(() => {
      result.current.deleteAllInboxNotifications();
    });

    // We delete the notifications optimitiscally
    expect(result.current.inboxNotifications).toEqual([]);

    await waitFor(() => {
      // The optimistic update is reverted because of the error response
      expect(result.current.inboxNotifications).toEqual(inboxNotifications);
    });

    unmount();
  });
});
