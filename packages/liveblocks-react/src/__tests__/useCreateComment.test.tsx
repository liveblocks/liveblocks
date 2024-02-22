import type { BaseMetadata, CommentBody, JsonObject } from "@liveblocks/core";
import { createClient } from "@liveblocks/core";
import { act, renderHook, waitFor } from "@testing-library/react";
import { addMinutes } from "date-fns";
import { setupServer } from "msw/node";
import React from "react";

import { createRoomContext } from "../room";
import {
  dummyCommentData,
  dummyInboxNoficationData,
  dummyThreadData,
} from "./_dummies";
import MockWebSocket from "./_MockWebSocket";
import { mockCreateComment, mockGetThreads } from "./_restMocks";

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

describe("useCreateComment", () => {
  test("should create a comment optimistically and override with thread coming from server", async () => {
    const fakeCreatedAt = addMinutes(new Date(), 5);
    const initialThread = dummyThreadData();

    server.use(
      mockGetThreads((_req, res, ctx) => {
        return res(
          ctx.json({
            data: [initialThread],
            inboxNotifications: [],
            deletedThreads: [],
            deletedInboxNotifications: [],
            meta: {
              requestedAt: new Date().toISOString(),
            },
          })
        );
      }),
      mockCreateComment(
        { threadId: initialThread.id },
        async (req, res, ctx) => {
          const json = await req.json<{ id: string; body: CommentBody }>();

          const comment = dummyCommentData();
          comment.id = json.id;
          comment.body = json.body;
          comment.createdAt = fakeCreatedAt;
          comment.threadId = initialThread.id;

          return res(ctx.json(comment));
        }
      )
    );

    const { RoomProvider, useThreads, useCreateComment } =
      createRoomContextForTest();

    const { result, unmount } = renderHook(
      () => ({
        threads: useThreads().threads,
        createComment: useCreateComment(),
      }),
      {
        wrapper: ({ children }) => (
          <RoomProvider id="room-id" initialPresence={{}}>
            {children}
          </RoomProvider>
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

    expect(result.current.threads![0].comments[1]).toEqual(comment);

    // We're using the createdDate overriden by the server to ensure the optimistic update have been properly deleted
    await waitFor(() =>
      expect(result.current.threads![0].comments[1].createdAt).toEqual(
        fakeCreatedAt
      )
    );

    unmount();
  });

  test("should mark thread as read optimistically", async () => {
    const initialThread = dummyThreadData();
    const initialInboxNotification = dummyInboxNoficationData();
    const fakeCreatedAt = addMinutes(new Date(), 5);
    initialInboxNotification.threadId = initialThread.id;

    server.use(
      mockGetThreads((_req, res, ctx) => {
        return res(
          ctx.json({
            data: [initialThread],
            inboxNotifications: [initialInboxNotification],
            deletedThreads: [],
            deletedInboxNotifications: [],
            meta: {
              requestedAt: new Date().toISOString(),
            },
          })
        );
      }),
      mockCreateComment(
        { threadId: initialThread.id },
        async (req, res, ctx) => {
          const json = await req.json<{ id: string; body: CommentBody }>();

          const comment = dummyCommentData();
          comment.id = json.id;
          comment.body = json.body;
          comment.createdAt = fakeCreatedAt;
          comment.threadId = initialThread.id;

          return res(ctx.json(comment));
        }
      )
    );

    const {
      RoomProvider,
      useThreadSubscription,
      useCreateComment,
      useThreads,
    } = createRoomContextForTest();

    const { result, unmount } = renderHook(
      () => ({
        threads: useThreads().threads,
        subscription: useThreadSubscription(initialThread.id),
        createComment: useCreateComment(),
      }),
      {
        wrapper: ({ children }) => (
          <RoomProvider id="room-id" initialPresence={{}}>
            {children}
          </RoomProvider>
        ),
      }
    );

    expect(result.current.subscription).toEqual({
      status: "not-subscribed",
    });

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

    expect(result.current.subscription).toEqual({
      status: "subscribed",
      unreadSince: comment.createdAt,
    });

    // We're using the createdDate overriden by the server to ensure the optimistic update have been properly deleted
    await waitFor(() =>
      expect(result.current.subscription.unreadSince).toEqual(fakeCreatedAt)
    );

    unmount();
  });

  test("should rollback optimistic update", async () => {
    const initialThread = dummyThreadData();

    server.use(
      mockGetThreads((_req, res, ctx) => {
        return res(
          ctx.json({
            data: [initialThread],
            inboxNotifications: [],
            deletedThreads: [],
            deletedInboxNotifications: [],
            meta: {
              requestedAt: new Date().toISOString(),
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

    const { RoomProvider, useThreads, useCreateComment } =
      createRoomContextForTest();

    const { result, unmount } = renderHook(
      () => ({
        threads: useThreads().threads,
        createComment: useCreateComment(),
      }),
      {
        wrapper: ({ children }) => (
          <RoomProvider id="room-id" initialPresence={{}}>
            {children}
          </RoomProvider>
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

    expect(result.current.threads![0].comments[1]).toEqual(comment);

    // Wait for optimistic update to be rolled back
    await waitFor(() =>
      expect(result.current.threads).toEqual([initialThread])
    );

    unmount();
  });
});
