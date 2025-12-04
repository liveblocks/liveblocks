import type { CommentBody, ThreadData } from "@liveblocks/core";
import { nanoid, Permission } from "@liveblocks/core";
import { act, renderHook, waitFor } from "@testing-library/react";
import { addMinutes } from "date-fns";
import type { ResponseComposition, RestContext, RestRequest } from "msw";
import { setupServer } from "msw/node";

import { dummyCommentData, dummyThreadData } from "./_dummies";
import MockWebSocket from "./_MockWebSocket";
import { mockCreateThread, mockGetThreads } from "./_restMocks";
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

describe("useCreateThread", () => {
  test("should create a thread optimistically and override with thread coming from server", async () => {
    const roomId = nanoid();
    const fakeCreatedAt = addMinutes(new Date(), 5);

    server.use(
      mockGetThreads(async (_req, res, ctx) => {
        return res(
          ctx.json({
            data: [],
            inboxNotifications: [],
            subscriptions: [],
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
      mockCreateThread(
        async (
          req: RestRequest,
          res: ResponseComposition<ThreadData<any>>,
          ctx: RestContext
        ) => {
          const json = await req.json<{
            id: string;
            comment: { id: string; body: CommentBody };
          }>();

          const comment = dummyCommentData({
            roomId,
            threadId: json.id,
            id: json.comment.id,
            body: json.comment.body,
            createdAt: fakeCreatedAt,
          });

          const thread = dummyThreadData({
            roomId,
            id: json.id,
            comments: [comment],
            createdAt: fakeCreatedAt,
          });

          return res(ctx.json(thread));
        }
      )
    );

    const {
      room: { RoomProvider, useThreads, useCreateThread },
    } = createContextsForTest();

    const { result, unmount } = renderHook(
      () => ({
        threadData: useThreads(),
        createThread: useCreateThread(),
      }),
      {
        wrapper: ({ children }) => (
          <RoomProvider id={roomId}>{children}</RoomProvider>
        ),
      }
    );

    expect(result.current.threadData).toEqual({ isLoading: true });

    await waitFor(() =>
      expect(result.current.threadData).toEqual({
        isLoading: false,
        threads: [],
        fetchMore: expect.any(Function),
        isFetchingMore: false,
        hasFetchedAll: true,
        fetchMoreError: undefined,
      })
    );

    const thread = await act(() =>
      result.current.createThread({
        body: {
          version: 1,
          content: [{ type: "paragraph", children: [{ text: "Hello" }] }],
        },
      })
    );

    expect(result.current.threadData.threads?.[0]).toEqual(thread);

    // We're using the createdDate overriden by the server to ensure the optimistic update have been properly deleted
    await waitFor(() =>
      expect(result.current.threadData.threads?.[0]?.createdAt).toEqual(
        fakeCreatedAt
      )
    );

    unmount();
  });

  test("should rollback optimistic update", async () => {
    const roomId = nanoid();

    server.use(
      mockGetThreads(async (_req, res, ctx) => {
        return res(
          ctx.json({
            data: [],
            inboxNotifications: [],
            subscriptions: [],
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
      mockCreateThread((_req, res, ctx) => {
        return res(ctx.status(500));
      })
    );

    const {
      room: { RoomProvider, useThreads, useCreateThread },
    } = createContextsForTest();

    const { result, unmount } = renderHook(
      () => ({
        threadsData: useThreads(),
        createThread: useCreateThread(),
      }),
      {
        wrapper: ({ children }) => (
          <RoomProvider id={roomId}>{children}</RoomProvider>
        ),
      }
    );

    expect(result.current.threadsData).toEqual({ isLoading: true });

    await waitFor(() =>
      expect(result.current.threadsData).toEqual({
        isLoading: false,
        threads: [],
        fetchMore: expect.any(Function),
        isFetchingMore: false,
        hasFetchedAll: true,
        fetchMoreError: undefined,
      })
    );

    const thread = await act(() =>
      result.current.createThread({
        body: {
          version: 1,
          content: [{ type: "paragraph", children: [{ text: "Hello" }] }],
        },
      })
    );

    expect(result.current.threadsData.threads).toEqual([thread]);

    // Wait for optimistic update to be rolled back
    await waitFor(() => expect(result.current.threadsData.threads).toEqual([]));

    unmount();
  });

  test("should create a thread with comment metadata optimistically", async () => {
    const roomId = nanoid();
    const fakeCreatedAt = addMinutes(new Date(), 5);
    const commentMetadata = { priority: 1, reviewed: false };

    server.use(
      mockGetThreads(async (_req, res, ctx) => {
        return res(
          ctx.json({
            data: [],
            inboxNotifications: [],
            subscriptions: [],
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
      mockCreateThread(
        async (
          req: RestRequest,
          res: ResponseComposition<ThreadData<any>>,
          ctx: RestContext
        ) => {
          const json = await req.json<{
            id: string;
            comment: { id: string; body: CommentBody; metadata?: Record<string, string | number | boolean> };
          }>();

          const comment = dummyCommentData({
            roomId,
            threadId: json.id,
            id: json.comment.id,
            body: json.comment.body,
            createdAt: fakeCreatedAt,
            metadata: json.comment.metadata ?? {},
          });

          const thread = dummyThreadData({
            roomId,
            id: json.id,
            comments: [comment],
            createdAt: fakeCreatedAt,
          });

          return res(ctx.json(thread));
        }
      )
    );

    const {
      room: { RoomProvider, useThreads, useCreateThread },
    } = createContextsForTest();

    const { result, unmount } = renderHook(
      () => ({
        threadData: useThreads(),
        createThread: useCreateThread(),
      }),
      {
        wrapper: ({ children }) => (
          <RoomProvider id={roomId}>{children}</RoomProvider>
        ),
      }
    );

    expect(result.current.threadData).toEqual({ isLoading: true });

    await waitFor(() =>
      expect(result.current.threadData).toEqual({
        isLoading: false,
        threads: [],
        fetchMore: expect.any(Function),
        isFetchingMore: false,
        hasFetchedAll: true,
        fetchMoreError: undefined,
      })
    );

    const thread = await act(() =>
      result.current.createThread({
        body: {
          version: 1,
          content: [{ type: "paragraph", children: [{ text: "Hello" }] }],
        },
        commentMetadata,
      })
    );

    expect(result.current.threadData.threads?.[0]).toEqual(thread);
    expect(thread.comments[0]?.metadata).toEqual(commentMetadata);

    // We're using the createdDate overriden by the server to ensure the optimistic update have been properly deleted
    await waitFor(() => {
      const serverThread = result.current.threadData.threads?.[0];
      expect(serverThread?.createdAt).toEqual(fakeCreatedAt);
      expect(serverThread?.comments[0]?.metadata).toEqual(commentMetadata);
    });

    unmount();
  });
});
