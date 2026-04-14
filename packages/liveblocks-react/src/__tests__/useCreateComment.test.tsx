import { type CommentData, nanoid, Permission } from "@liveblocks/core";
import { act, renderHook } from "@testing-library/react";
import { addMinutes } from "date-fns";
import { HttpResponse } from "msw";
import { setupServer } from "msw/node";
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  test,
  vi,
} from "vitest";

import {
  dummyCommentData,
  dummySubscriptionData,
  dummyThreadData,
  dummyThreadInboxNotificationData,
} from "./_dummies";
import MockWebSocket from "./_MockWebSocket";
import { mockCreateComment, mockGetThreads } from "./_restMocks";
import { createContextsForTest } from "./_utils";

const server = setupServer();

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));

beforeEach(() => {
  MockWebSocket.reset();
});

afterEach(() => {
  MockWebSocket.reset();
  server.resetHandlers();
});

afterAll(() => server.close());

describe("useCreateComment", () => {
  test("should create a comment optimistically and override with thread coming from server", async () => {
    const roomId = nanoid();
    const fakeCreatedAt = addMinutes(new Date(), 5);
    const initialThread = dummyThreadData({ roomId });

    server.use(
      mockGetThreads(() => {
        return HttpResponse.json({
          data: [initialThread],
          inboxNotifications: [],
          subscriptions: [],
          meta: {
            requestedAt: new Date().toISOString(),
            nextCursor: null,
            permissionHints: {
              [roomId]: [Permission.Write],
            },
          },
        });
      }),
      mockCreateComment({ threadId: initialThread.id }, async ({ request }) => {
        const json = await request.json();

        const comment = dummyCommentData({
          roomId,
          threadId: initialThread.id,
          body: json.body,
          createdAt: fakeCreatedAt,
        });

        return HttpResponse.json(comment);
      })
    );

    const {
      room: { RoomProvider, useThreads, useCreateComment },
    } = createContextsForTest();

    const { result, unmount } = renderHook(
      () => ({
        threads: useThreads().threads,
        createComment: useCreateComment(),
      }),
      {
        wrapper: ({ children }) => (
          <RoomProvider id={roomId}>{children}</RoomProvider>
        ),
      }
    );

    expect(result.current.threads).toBeUndefined();

    await vi.waitFor(() =>
      expect(result.current.threads).toEqual([initialThread])
    );

    let comment!: CommentData;
    act(() => {
      comment = result.current.createComment({
        threadId: initialThread.id,
        body: {
          version: 1,
          content: [{ type: "paragraph", children: [{ text: "Hello" }] }],
        },
      });
    });

    expect(result.current.threads?.[0]?.comments[1]).toEqual(comment);

    // We're using the createdDate overriden by the server to ensure the optimistic update have been properly deleted
    await vi.waitFor(() =>
      expect(result.current.threads?.[0]?.comments[1]?.createdAt).toEqual(
        fakeCreatedAt
      )
    );

    unmount();
  });

  test("should mark thread as read optimistically", async () => {
    const roomId = nanoid();
    const initialThread = dummyThreadData({ roomId });
    const initialInboxNotification = dummyThreadInboxNotificationData({
      roomId,
      threadId: initialThread.id,
    });
    const initialSubscription = dummySubscriptionData({
      subjectId: initialThread.id,
    });
    const fakeCreatedAt = addMinutes(new Date(), 5);

    server.use(
      mockGetThreads(() => {
        return HttpResponse.json({
          data: [initialThread],
          inboxNotifications: [initialInboxNotification],
          subscriptions: [initialSubscription],
          meta: {
            requestedAt: new Date().toISOString(),
            nextCursor: null,
            permissionHints: {
              [roomId]: [Permission.Write],
            },
          },
        });
      }),
      mockCreateComment({ threadId: initialThread.id }, async ({ request }) => {
        const json = await request.json();

        const comment = dummyCommentData({
          roomId,
          id: json.id,
          body: json.body,
          createdAt: fakeCreatedAt,
          threadId: initialThread.id,
        });

        return HttpResponse.json(comment);
      })
    );

    const {
      room: {
        RoomProvider,
        useThreadSubscription,
        useCreateComment,
        useThreads,
      },
    } = createContextsForTest();

    const { result, unmount } = renderHook(
      () => ({
        threads: useThreads().threads,
        subscription: useThreadSubscription(initialThread.id),
        createComment: useCreateComment(),
      }),
      {
        wrapper: ({ children }) => (
          <RoomProvider id={roomId}>{children}</RoomProvider>
        ),
      }
    );

    expect(result.current.subscription.status).toEqual("not-subscribed");

    await vi.waitFor(() =>
      expect(result.current.subscription.unreadSince).toBeNull()
    );

    let comment!: CommentData;
    act(() => {
      comment = result.current.createComment({
        threadId: initialThread.id,
        body: {
          version: 1,
          content: [{ type: "paragraph", children: [{ text: "Hello" }] }],
        },
      });
    });

    expect(result.current.subscription.status).toEqual("subscribed");
    expect(result.current.subscription.unreadSince).toEqual(comment.createdAt);

    // We're using the createdDate overriden by the server to ensure the optimistic update have been properly deleted
    await vi.waitFor(() =>
      expect(result.current.subscription.unreadSince).toEqual(fakeCreatedAt)
    );

    unmount();
  });

  test("should rollback optimistic update", async () => {
    const roomId = nanoid();
    const initialThread = dummyThreadData({ roomId });

    server.use(
      mockGetThreads(() => {
        return HttpResponse.json({
          data: [initialThread],
          inboxNotifications: [],
          subscriptions: [],
          meta: {
            requestedAt: new Date().toISOString(),
            nextCursor: null,
            permissionHints: {
              [roomId]: [Permission.Write],
            },
          },
        });
      }),
      mockCreateComment(
        { threadId: initialThread.id },
        () => new HttpResponse(null, { status: 500 })
      )
    );

    const {
      room: { RoomProvider, useThreads, useCreateComment },
    } = createContextsForTest();

    const { result, unmount } = renderHook(
      () => ({
        threads: useThreads().threads,
        createComment: useCreateComment(),
      }),
      {
        wrapper: ({ children }) => (
          <RoomProvider id={roomId}>{children}</RoomProvider>
        ),
      }
    );

    expect(result.current.threads).toBeUndefined();
    await vi.waitFor(() =>
      expect(result.current.threads).toEqual([initialThread])
    );

    let comment!: CommentData;
    act(() => {
      comment = result.current.createComment({
        threadId: initialThread.id,
        body: {
          version: 1,
          content: [{ type: "paragraph", children: [{ text: "Hello" }] }],
        },
      });
    });

    expect(result.current.threads?.[0]?.comments[1]).toEqual(comment);

    // Wait for optimistic update to be rolled back
    await vi.waitFor(() =>
      expect(result.current.threads).toEqual([initialThread])
    );

    unmount();
  });

  test("should create a comment with metadata optimistically", async () => {
    const roomId = nanoid();
    const fakeCreatedAt = addMinutes(new Date(), 5);
    const initialThread = dummyThreadData({ roomId });
    const metadata = { priority: 1, reviewed: false };

    server.use(
      mockGetThreads(() => {
        return HttpResponse.json({
          data: [initialThread],
          inboxNotifications: [],
          subscriptions: [],
          meta: {
            requestedAt: new Date().toISOString(),
            nextCursor: null,
            permissionHints: {
              [roomId]: [Permission.Write],
            },
          },
        });
      }),
      mockCreateComment({ threadId: initialThread.id }, async ({ request }) => {
        const json = await request.json();

        const comment = dummyCommentData({
          roomId,
          threadId: initialThread.id,
          body: json.body,
          createdAt: fakeCreatedAt,
          metadata: json.metadata ?? {},
        });

        return HttpResponse.json(comment);
      })
    );

    const {
      room: { RoomProvider, useThreads, useCreateComment },
    } = createContextsForTest();

    const { result, unmount } = renderHook(
      () => ({
        threads: useThreads().threads,
        createComment: useCreateComment(),
      }),
      {
        wrapper: ({ children }) => (
          <RoomProvider id={roomId}>{children}</RoomProvider>
        ),
      }
    );

    expect(result.current.threads).toBeUndefined();

    await vi.waitFor(() =>
      expect(result.current.threads).toEqual([initialThread])
    );

    let comment!: CommentData;
    act(() => {
      comment = result.current.createComment({
        threadId: initialThread.id,
        body: {
          version: 1,
          content: [{ type: "paragraph", children: [{ text: "Hello" }] }],
        },
        metadata,
      });
    });

    expect(result.current.threads?.[0]?.comments[1]).toEqual(comment);
    expect(comment.metadata).toEqual(metadata);

    // We're using the createdDate overriden by the server to ensure the optimistic update have been properly deleted
    await vi.waitFor(() => {
      const serverComment = result.current.threads?.[0]?.comments[1];
      expect(serverComment?.createdAt).toEqual(fakeCreatedAt);
      expect(serverComment?.metadata).toEqual(metadata);
    });

    unmount();
  });
});
