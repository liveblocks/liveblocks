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
  mockDeleteAllInboxNotifications,
  mockDeleteComment,
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

describe("useDeleteAllInboxNotifications", () => {
  test("should delete all notifications optimistically", async () => {
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
    const subscriptions = [
      dummySubscriptionData({ subjectId: threads[0]!.id }),
      dummySubscriptionData({ subjectId: threads[1]!.id }),
    ];

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
      mockDeleteAllInboxNotifications(() => {
        return HttpResponse.json(null, { status: 204 });
      })
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
      expect(result.current.inboxNotifications).toEqual(
        expect.arrayContaining(inboxNotifications)
      )
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
        threadId: threads[0]!.id,
        readAt: null,
      }),
      dummyThreadInboxNotificationData({
        roomId,
        threadId: threads?.[1]?.id,
        readAt: null,
      }),
    ];
    const subscriptions = [
      dummySubscriptionData({ subjectId: threads[0]!.id }),
      dummySubscriptionData({ subjectId: threads[1]!.id }),
    ];

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
      mockDeleteAllInboxNotifications(() => {
        return HttpResponse.json(null, { status: 500 });
      })
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
      expect(result.current.inboxNotifications).toEqual(
        expect.arrayContaining(inboxNotifications)
      )
    );

    act(() => {
      result.current.deleteAllInboxNotifications();
    });

    // We delete the notifications optimitiscally
    expect(result.current.inboxNotifications).toEqual([]);

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
    const subscriptions = [
      dummySubscriptionData({ subjectId: threads[0]!.id }),
      dummySubscriptionData({ subjectId: threads[1]!.id }),
    ];

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
      mockDeleteAllInboxNotifications(() => {
        return HttpResponse.json(null, { status: 500 });
      })
    );

    const {
      liveblocks: {
        LiveblocksProvider,
        useInboxNotifications,
        useDeleteAllInboxNotifications,
        useUnreadInboxNotificationsCount,
      },
    } = createContextsForTest();

    const { result, unmount } = renderHook(
      () => ({
        deleteAllInboxNotifications: useDeleteAllInboxNotifications(),
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
      result.current.deleteAllInboxNotifications();
    });

    // We delete the notifications optimitiscally
    expect(result.current.inboxNotifications).toEqual([]);

    expect(result.current.unreadInboxNotificationsCount).toEqual(0);

    await waitFor(() => {
      // The optimistic update is reverted because of the error response
      expect(result.current.inboxNotifications).toEqual(
        expect.arrayContaining(inboxNotifications)
      );
    });

    expect(result.current.unreadInboxNotificationsCount).toEqual(2);

    unmount();
  });

  test("should support deleting all notifications and one if its related thread", async () => {
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
    const subscriptions = [
      dummySubscriptionData({ subjectId: threads[0]!.id }),
      dummySubscriptionData({ subjectId: threads[1]!.id }),
    ];
    const inboxNotifications = [notification1, notification2];
    let hasCalledDeleteThread = false;

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
      mockDeleteAllInboxNotifications(() => {
        return HttpResponse.json(null, { status: 204 });
      }),
      mockDeleteThread({ threadId: threads[0]!.id }, () => {
        hasCalledDeleteThread = true;
        return HttpResponse.json(null, { status: 204 });
      })
    );

    const {
      room: { RoomProvider, useDeleteThread },
      liveblocks: {
        LiveblocksProvider,
        useInboxNotifications,
        useDeleteAllInboxNotifications,
      },
    } = createContextsForTest({ userId: "user-id" });

    const { result, unmount } = renderHook(
      () => ({
        deleteAllInboxNotifications: useDeleteAllInboxNotifications(),
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

    // We delete all notifications optimitiscally
    act(() => {
      result.current.deleteAllInboxNotifications();
    });

    expect(result.current.inboxNotifications).toEqual([]);

    // We also delete the first thread optimitiscally
    act(() => {
      result.current.deleteThread(thread1.id);
    });

    expect(result.current.inboxNotifications).toEqual([]);

    // TODO: We should wait for the `deleteThread` call to be finished but we don't have APIs for that yet
    //       We should expose a way to know (and be updated about) if there are still pending optimistic updates
    //       Until then, we'll just wait for the mock to be called
    await waitFor(() => expect(hasCalledDeleteThread).toEqual(true));

    unmount();
  });

  test("should support deleting all notifications and one its related thread implicitly by deleting all its comments", async () => {
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
    const subscriptions = [dummySubscriptionData({ subjectId: thread.id })];
    let hasCalledDeleteComment = false;

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
      mockDeleteAllInboxNotifications(() => {
        return HttpResponse.json(null, { status: 204 });
      }),
      mockDeleteComment({ threadId: thread.id, commentId: comment.id }, () => {
        hasCalledDeleteComment = true;
        return HttpResponse.json(null, { status: 204 });
      })
    );

    const {
      room: { RoomProvider, useDeleteComment },
      liveblocks: {
        LiveblocksProvider,
        useInboxNotifications,
        useDeleteAllInboxNotifications,
      },
    } = createContextsForTest({ userId });

    const { result, unmount } = renderHook(
      () => ({
        deleteAllInboxNotifications: useDeleteAllInboxNotifications(),
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

    // We delete all notifications optimitiscally
    act(() => {
      result.current.deleteAllInboxNotifications();
    });

    expect(result.current.inboxNotifications).toEqual([]);

    // We also delete the first thread implicitly by deleting its only comment optimitiscally
    act(() => {
      result.current.deleteComment({
        threadId: thread.id,
        commentId: comment.id,
      });
    });

    expect(result.current.inboxNotifications).toEqual([]);

    // TODO: We should wait for the `deleteComment` call to be finished but we don't have APIs for that yet
    //       We should expose a way to know (and be updated about) if there are still pending optimistic updates
    //       Until then, we'll just wait for the mock to be called
    await waitFor(() => expect(hasCalledDeleteComment).toEqual(true));

    unmount();
  });
});
