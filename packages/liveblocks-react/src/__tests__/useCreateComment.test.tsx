import type { CommentBody } from "@liveblocks/core";
import { nanoid, Permission } from "@liveblocks/core";
import { act, renderHook, waitFor } from "@testing-library/react";
import { addMinutes } from "date-fns";
import { setupServer } from "msw/node";

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
      mockGetThreads((_req, res, ctx) => {
        return res(
          ctx.json({
            data: [initialThread],
            inboxNotifications: [],
            subscriptions: [],
            deletedThreads: [],
            deletedInboxNotifications: [],
            deletedSubscriptions: [],
            meta: {
              requestedAt: new Date().toISOString(),
              nextCursor: null,
              permissionHints: {
                [roomId]: [Permission.Write],
              },
            },
          })
        );
      }),
      mockCreateComment(
        { threadId: initialThread.id },
        async (req, res, ctx) => {
          const json = await req.json<{ id: string; body: CommentBody }>();

          const comment = dummyCommentData({
            roomId,
            threadId: initialThread.id,
            body: json.body,
            createdAt: fakeCreatedAt,
          });

          return res(ctx.json(comment));
        }
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

    await waitFor(() =>
      expect(result.current.threads).toEqual([initialThread])
    );

    const comment = await act(() =>
      result.current.createComment({
        threadId: initialThread.id,
        body: {
          version: 1,
          content: [{ type: "paragraph", children: [{ text: "Hello" }] }],
        },
      })
    );

    expect(result.current.threads?.[0]?.comments[1]).toEqual(comment);

    // We're using the createdDate overriden by the server to ensure the optimistic update have been properly deleted
    await waitFor(() =>
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
      mockGetThreads((_req, res, ctx) => {
        return res(
          ctx.json({
            data: [initialThread],
            inboxNotifications: [initialInboxNotification],
            subscriptions: [initialSubscription],
            deletedThreads: [],
            deletedInboxNotifications: [],
            deletedSubscriptions: [],
            meta: {
              requestedAt: new Date().toISOString(),
              nextCursor: null,
              permissionHints: {
                [roomId]: [Permission.Write],
              },
            },
          })
        );
      }),
      mockCreateComment(
        { threadId: initialThread.id },
        async (req, res, ctx) => {
          const json = await req.json<{ id: string; body: CommentBody }>();

          const comment = dummyCommentData({
            roomId,
            id: json.id,
            body: json.body,
            createdAt: fakeCreatedAt,
            threadId: initialThread.id,
          });

          return res(ctx.json(comment));
        }
      )
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

    await waitFor(() =>
      expect(result.current.subscription.unreadSince).toBeNull()
    );

    const comment = await act(() =>
      result.current.createComment({
        threadId: initialThread.id,
        body: {
          version: 1,
          content: [{ type: "paragraph", children: [{ text: "Hello" }] }],
        },
      })
    );

    expect(result.current.subscription.status).toEqual("subscribed");
    expect(result.current.subscription.unreadSince).toEqual(comment.createdAt);

    // We're using the createdDate overriden by the server to ensure the optimistic update have been properly deleted
    await waitFor(() =>
      expect(result.current.subscription.unreadSince).toEqual(fakeCreatedAt)
    );

    unmount();
  });

  test("should rollback optimistic update", async () => {
    const roomId = nanoid();
    const initialThread = dummyThreadData({ roomId });

    server.use(
      mockGetThreads((_req, res, ctx) => {
        return res(
          ctx.json({
            data: [initialThread],
            inboxNotifications: [],
            subscriptions: [],
            deletedThreads: [],
            deletedInboxNotifications: [],
            deletedSubscriptions: [],
            meta: {
              requestedAt: new Date().toISOString(),
              nextCursor: null,
              permissionHints: {
                [roomId]: [Permission.Write],
              },
            },
          })
        );
      }),
      mockCreateComment(
        { threadId: initialThread.id },
        async (_req, res, ctx) => {
          return res(ctx.status(500));
        }
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
    await waitFor(() =>
      expect(result.current.threads).toEqual([initialThread])
    );

    const comment = await act(() =>
      result.current.createComment({
        threadId: initialThread.id,
        body: {
          version: 1,
          content: [{ type: "paragraph", children: [{ text: "Hello" }] }],
        },
      })
    );

    expect(result.current.threads?.[0]?.comments[1]).toEqual(comment);

    // Wait for optimistic update to be rolled back
    await waitFor(() =>
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
      mockGetThreads((_req, res, ctx) => {
        return res(
          ctx.json({
            data: [initialThread],
            inboxNotifications: [],
            subscriptions: [],
            deletedThreads: [],
            deletedInboxNotifications: [],
            deletedSubscriptions: [],
            meta: {
              requestedAt: new Date().toISOString(),
              nextCursor: null,
              permissionHints: {
                [roomId]: [Permission.Write],
              },
            },
          })
        );
      }),
      mockCreateComment(
        { threadId: initialThread.id },
        async (req, res, ctx) => {
          const json = await req.json<{
            id: string;
            body: CommentBody;
            metadata?: Record<string, string | number | boolean>;
          }>();

          const comment = dummyCommentData({
            roomId,
            threadId: initialThread.id,
            body: json.body,
            createdAt: fakeCreatedAt,
            metadata: json.metadata ?? {},
          });

          return res(ctx.json(comment));
        }
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

    await waitFor(() =>
      expect(result.current.threads).toEqual([initialThread])
    );

    const comment = await act(() =>
      result.current.createComment({
        threadId: initialThread.id,
        body: {
          version: 1,
          content: [{ type: "paragraph", children: [{ text: "Hello" }] }],
        },
        metadata,
      })
    );

    expect(result.current.threads?.[0]?.comments[1]).toEqual(comment);
    expect(comment.metadata).toEqual(metadata);

    // We're using the createdDate overriden by the server to ensure the optimistic update have been properly deleted
    await waitFor(() => {
      const serverComment = result.current.threads?.[0]?.comments[1];
      expect(serverComment?.createdAt).toEqual(fakeCreatedAt);
      expect(serverComment?.metadata).toEqual(metadata);
    });

    unmount();
  });
});
