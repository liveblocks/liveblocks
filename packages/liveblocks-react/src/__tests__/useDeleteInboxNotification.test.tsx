import { nanoid } from "@liveblocks/core";
import { act, renderHook, waitFor } from "@testing-library/react";
import { setupServer } from "msw/node";

import {
  dummyCommentData,
  dummyThreadData,
  dummyThreadInboxNotificationData,
} from "./_dummies";
import {
  mockDeleteComment,
  mockDeleteInboxNotification,
  mockDeleteThread,
  mockGetInboxNotifications,
} from "./_restMocks";
import { createContextsForTest } from "./_utils";

const server = setupServer();

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));

afterEach(() => {
  server.resetHandlers();
});

afterAll(() => server.close());

describe("useDeleteInboxNotification", () => {
  test("should delete a notification optimistically", async () => {
    const roomId = nanoid();
    const thread1 = dummyThreadData({ roomId });
    const thread2 = dummyThreadData({ roomId });
    const threads = [thread1, thread2];
    const notification1 = dummyThreadInboxNotificationData({
      roomId,
      threadId: thread1.id,
      readAt: null,
    });
    const notification2 = dummyThreadInboxNotificationData({
      roomId,
      threadId: thread2.id,
      readAt: null,
    });
    const inboxNotifications = [notification1, notification2];

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
      mockDeleteInboxNotification(
        { inboxNotificationId: notification1.id },
        (_req, res, ctx) => res(ctx.status(204))
      )
    );

    const {
      liveblocks: {
        LiveblocksProvider,
        useInboxNotifications,
        useDeleteInboxNotification,
      },
    } = createContextsForTest();

    const { result, unmount } = renderHook(
      () => ({
        deleteInboxNotification: useDeleteInboxNotification(),
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
      result.current.deleteInboxNotification(notification1.id);
    });

    expect(result.current.inboxNotifications).toEqual([notification2]);

    unmount();
  });

  test("should delete a notification optimistically and revert the update if error response from server", async () => {
    const roomId = nanoid();
    const thread1 = dummyThreadData({ roomId });
    const thread2 = dummyThreadData({ roomId });
    const threads = [thread1, thread2];
    const notification1 = dummyThreadInboxNotificationData({
      roomId,
      threadId: thread1.id,
      readAt: null,
    });
    const notification2 = dummyThreadInboxNotificationData({
      roomId,
      threadId: thread2.id,
      readAt: null,
    });
    const inboxNotifications = [notification1, notification2];

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
      mockDeleteInboxNotification(
        { inboxNotificationId: notification1.id },
        (_req, res, ctx) => res(ctx.status(500))
      )
    );

    const {
      liveblocks: {
        LiveblocksProvider,
        useInboxNotifications,
        useDeleteInboxNotification,
      },
    } = createContextsForTest();

    const { result, unmount } = renderHook(
      () => ({
        deleteInboxNotification: useDeleteInboxNotification(),
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
      expect(result.current.inboxNotifications).toEqual(
        expect.arrayContaining(inboxNotifications)
      )
    );

    // We delete the notification optimitiscally
    act(() => {
      result.current.deleteInboxNotification(notification1.id);
    });

    expect(result.current.inboxNotifications).toEqual([notification2]);

    await waitFor(() => {
      // The optimistic update is reverted because of the error response
      expect(result.current.inboxNotifications).toEqual(
        expect.arrayContaining(inboxNotifications)
      );
    });

    unmount();
  });

  test("should affect the number of unread notifications even optimistically", async () => {
    const roomId = nanoid();
    const thread1 = dummyThreadData({ roomId });
    const thread2 = dummyThreadData({ roomId });
    const threads = [thread1, thread2];
    const notification1 = dummyThreadInboxNotificationData({
      roomId,
      threadId: thread1.id,
      readAt: null,
    });
    const notification2 = dummyThreadInboxNotificationData({
      roomId,
      threadId: thread2.id,
      readAt: null,
    });
    const inboxNotifications = [notification1, notification2];

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
      mockDeleteInboxNotification(
        { inboxNotificationId: notification1.id },
        (_req, res, ctx) => res(ctx.status(500))
      )
    );

    const {
      liveblocks: {
        LiveblocksProvider,
        useInboxNotifications,
        useDeleteInboxNotification,
        useUnreadInboxNotificationsCount,
      },
    } = createContextsForTest();

    const { result, unmount } = renderHook(
      () => ({
        deleteInboxNotification: useDeleteInboxNotification(),
        inboxNotifications: useInboxNotifications().inboxNotifications,
        unreadInboxNotificationsCount: useUnreadInboxNotificationsCount().count,
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
      expect(result.current.unreadInboxNotificationsCount).toEqual(2);
    });

    act(() => {
      result.current.deleteInboxNotification(notification1.id);
    });

    // We delete the notification optimitiscally
    expect(result.current.inboxNotifications).toEqual([notification2]);

    expect(result.current.unreadInboxNotificationsCount).toEqual(1);

    await waitFor(() => {
      // The optimistic update is reverted because of the error response
      expect(result.current.inboxNotifications).toEqual(
        expect.arrayContaining(inboxNotifications)
      );
    });

    expect(result.current.unreadInboxNotificationsCount).toEqual(2);

    unmount();
  });

  test("should support deleting a notification and its related thread", async () => {
    const now = new Date();
    const roomId = nanoid();
    const thread1 = dummyThreadData({ roomId, createdAt: now, updatedAt: now });
    const thread2 = dummyThreadData({ roomId });
    const threads = [thread1, thread2];
    const notification1 = dummyThreadInboxNotificationData({
      roomId,
      threadId: thread1.id,
      readAt: null,
    });
    const notification2 = dummyThreadInboxNotificationData({
      roomId,
      threadId: thread2.id,
      readAt: null,
    });
    const inboxNotifications = [notification1, notification2];

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
      mockDeleteInboxNotification(
        { inboxNotificationId: notification1.id },
        (_req, res, ctx) => res(ctx.status(500))
      ),
      mockDeleteThread({ threadId: threads[0]!.id }, async (_req, res, ctx) => {
        return res(ctx.status(204));
      })
    );

    const {
      client,
      room: { RoomProvider, useDeleteThread },
      liveblocks: {
        LiveblocksProvider,
        useInboxNotifications,
        useDeleteInboxNotification,
      },
    } = createContextsForTest({ userId: "user-id" });

    const { result, unmount } = renderHook(
      () => ({
        deleteInboxNotification: useDeleteInboxNotification(),
        deleteThread: useDeleteThread(),
        inboxNotifications: useInboxNotifications().inboxNotifications,
        deletedThreads: [],
        deletedInboxNotifications: [],
        meta: {
          requestedAt: new Date().toISOString(),
        },
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

    // We delete the notification optimitiscally
    act(() => {
      result.current.deleteInboxNotification(notification1.id);
    });

    expect(result.current.inboxNotifications).toEqual([notification2]);

    // We also delete its related thread optimitiscally
    act(() => {
      result.current.deleteThread(thread1.id);
    });

    expect(result.current.inboxNotifications).toEqual([notification2]);

    await waitFor(() =>
      expect(client.getSyncStatus()).toEqual("synchronizing")
    );
    await waitFor(() => expect(client.getSyncStatus()).toEqual("synchronized"));

    unmount();
  });

  test("should support deleting a notification and its related thread implicitly by deleting all its comments", async () => {
    const roomId = nanoid();
    const userId = "userId";
    const comment = dummyCommentData({ roomId, userId });
    const thread = dummyThreadData({ roomId, comments: [comment] });
    const threads = [thread];
    const notification = dummyThreadInboxNotificationData({
      roomId,
      threadId: thread.id,
      readAt: null,
    });
    const inboxNotifications = [notification];

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
      mockDeleteInboxNotification(
        { inboxNotificationId: notification.id },
        (_req, res, ctx) => res(ctx.status(500))
      ),
      mockDeleteComment(
        { threadId: thread.id, commentId: comment.id },
        async (_req, res, ctx) => {
          return res(ctx.status(204));
        }
      )
    );

    const {
      client,
      room: { RoomProvider, useDeleteComment },
      liveblocks: {
        LiveblocksProvider,
        useInboxNotifications,
        useDeleteInboxNotification,
      },
    } = createContextsForTest({ userId });

    const { result, unmount } = renderHook(
      () => ({
        deleteInboxNotification: useDeleteInboxNotification(),
        deleteComment: useDeleteComment(),
        inboxNotifications: useInboxNotifications().inboxNotifications,
        deletedThreads: [],
        deletedInboxNotifications: [],
        meta: {
          requestedAt: new Date().toISOString(),
        },
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

    // We delete the notification optimitiscally
    act(() => {
      result.current.deleteInboxNotification(notification.id);
    });

    expect(result.current.inboxNotifications).toEqual([]);

    // We also delete its related thread implicitly by deleting its only comment optimitiscally
    act(() => {
      result.current.deleteComment({
        threadId: thread.id,
        commentId: comment.id,
      });
    });

    expect(result.current.inboxNotifications).toEqual([]);

    await waitFor(() =>
      expect(client.getSyncStatus()).toEqual("synchronizing")
    );
    await waitFor(() => expect(client.getSyncStatus()).toEqual("synchronized"));

    unmount();
  });
});
