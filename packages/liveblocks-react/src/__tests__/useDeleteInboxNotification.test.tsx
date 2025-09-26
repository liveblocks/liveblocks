import { nanoid } from "@liveblocks/core";
import { act, renderHook, waitFor } from "@testing-library/react";
import { HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { afterAll, afterEach, beforeAll, describe, expect, test } from "vitest";

import {
  dummyCommentData,
  dummySubscriptionData,
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
    const subscription1 = dummySubscriptionData({
      subjectId: thread1.id,
    });
    const subscription2 = dummySubscriptionData({
      subjectId: thread2.id,
    });
    const subscriptions = [subscription1, subscription2];

    server.use(
      mockGetInboxNotifications(() => {
        return HttpResponse.json(
          {
            inboxNotifications,
            threads,
            subscriptions,
            groups: [],
            meta: {
              requestedAt: new Date().toISOString(),
              nextCursor: null,
            },
          },
          { status: 200 }
        );
      }),
      mockDeleteInboxNotification(
        { inboxNotificationId: notification1.id },
        () => {
          return HttpResponse.json(null, { status: 204 });
        }
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
    const subscription1 = dummySubscriptionData({
      subjectId: thread1.id,
    });
    const subscription2 = dummySubscriptionData({
      subjectId: thread2.id,
    });
    const subscriptions = [subscription1, subscription2];

    server.use(
      mockGetInboxNotifications(() => {
        return HttpResponse.json(
          {
            inboxNotifications,
            threads,
            subscriptions,
            groups: [],
            meta: {
              requestedAt: new Date().toISOString(),
              nextCursor: null,
            },
          },
          { status: 200 }
        );
      }),
      mockDeleteInboxNotification(
        { inboxNotificationId: notification1.id },
        () => {
          return HttpResponse.json(null, { status: 500 });
        }
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
    const subscription1 = dummySubscriptionData({
      subjectId: thread1.id,
    });
    const subscription2 = dummySubscriptionData({
      subjectId: thread2.id,
    });
    const subscriptions = [subscription1, subscription2];

    server.use(
      mockGetInboxNotifications(() => {
        return HttpResponse.json(
          {
            inboxNotifications,
            threads,
            subscriptions,
            groups: [],
            meta: {
              requestedAt: new Date().toISOString(),
              nextCursor: null,
            },
          },
          { status: 200 }
        );
      }),
      mockDeleteInboxNotification(
        { inboxNotificationId: notification1.id },
        () => {
          return HttpResponse.json(null, { status: 500 });
        }
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
    const subscription1 = dummySubscriptionData({
      subjectId: thread1.id,
    });
    const subscription2 = dummySubscriptionData({
      subjectId: thread2.id,
    });
    const subscriptions = [subscription1, subscription2];

    server.use(
      mockGetInboxNotifications(() => {
        return HttpResponse.json(
          {
            inboxNotifications,
            threads,
            subscriptions,
            groups: [],
            meta: {
              requestedAt: new Date().toISOString(),
              nextCursor: null,
            },
          },
          { status: 200 }
        );
      }),
      mockDeleteInboxNotification(
        { inboxNotificationId: notification1.id },
        () => {
          return HttpResponse.json(null, { status: 500 });
        }
      ),
      mockDeleteThread({ threadId: threads[0]!.id }, () => {
        return HttpResponse.json(null, { status: 204 });
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
    const subscription = dummySubscriptionData({
      subjectId: thread.id,
    });
    const subscriptions = [subscription];

    server.use(
      mockGetInboxNotifications(() => {
        return HttpResponse.json(
          {
            inboxNotifications,
            threads,
            subscriptions,
            groups: [],
            meta: {
              requestedAt: new Date().toISOString(),
              nextCursor: null,
            },
          },
          { status: 200 }
        );
      }),
      mockDeleteInboxNotification(
        { inboxNotificationId: notification.id },
        () => {
          return HttpResponse.json(null, { status: 500 });
        }
      ),
      mockDeleteComment({ threadId: thread.id, commentId: comment.id }, () => {
        return HttpResponse.json(null, { status: 204 });
      })
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
