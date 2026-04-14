import { nanoid, Permission, type ThreadData } from "@liveblocks/core";
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
      mockGetThreads(() => {
        return HttpResponse.json({
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
        });
      }),
      mockCreateThread(async ({ request }) => {
        const json = await request.json();

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

        return HttpResponse.json(thread);
      })
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

    await vi.waitFor(() =>
      expect(result.current.threadData).toEqual({
        isLoading: false,
        threads: [],
        fetchMore: expect.any(Function),
        isFetchingMore: false,
        hasFetchedAll: true,
        fetchMoreError: undefined,
      })
    );

    let thread!: ThreadData;
    act(() => {
      thread = result.current.createThread({
        body: {
          version: 1,
          content: [{ type: "paragraph", children: [{ text: "Hello" }] }],
        },
      });
    });

    expect(result.current.threadData.threads?.[0]).toEqual(thread);

    // We're using the createdDate overriden by the server to ensure the optimistic update have been properly deleted
    await vi.waitFor(() =>
      expect(result.current.threadData.threads?.[0]?.createdAt).toEqual(
        fakeCreatedAt
      )
    );

    unmount();
  });

  test("should rollback optimistic update", async () => {
    const roomId = nanoid();

    server.use(
      mockGetThreads(() => {
        return HttpResponse.json({
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
        });
      }),
      mockCreateThread(() => new HttpResponse(null, { status: 500 }))
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

    await vi.waitFor(() =>
      expect(result.current.threadsData).toEqual({
        isLoading: false,
        threads: [],
        fetchMore: expect.any(Function),
        isFetchingMore: false,
        hasFetchedAll: true,
        fetchMoreError: undefined,
      })
    );

    let thread!: ThreadData;
    act(() => {
      thread = result.current.createThread({
        body: {
          version: 1,
          content: [{ type: "paragraph", children: [{ text: "Hello" }] }],
        },
      });
    });

    expect(result.current.threadsData.threads).toEqual([thread]);

    // Wait for optimistic update to be rolled back
    await vi.waitFor(() =>
      expect(result.current.threadsData.threads).toEqual([])
    );

    unmount();
  });

  test("should create a thread with comment metadata optimistically", async () => {
    const roomId = nanoid();
    const fakeCreatedAt = addMinutes(new Date(), 5);
    const commentMetadata = { priority: 1, reviewed: false };

    server.use(
      mockGetThreads(() => {
        return HttpResponse.json({
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
        });
      }),
      mockCreateThread(async ({ request }) => {
        const json = await request.json();

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

        return HttpResponse.json(thread);
      })
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

    await vi.waitFor(() =>
      expect(result.current.threadData).toEqual({
        isLoading: false,
        threads: [],
        fetchMore: expect.any(Function),
        isFetchingMore: false,
        hasFetchedAll: true,
        fetchMoreError: undefined,
      })
    );

    let thread!: ThreadData;
    act(() => {
      thread = result.current.createThread({
        body: {
          version: 1,
          content: [{ type: "paragraph", children: [{ text: "Hello" }] }],
        },
        commentMetadata,
      });
    });

    expect(result.current.threadData.threads?.[0]).toEqual(thread);
    expect(thread.comments[0]?.metadata).toEqual(commentMetadata);

    // We're using the createdDate overriden by the server to ensure the optimistic update have been properly deleted
    await vi.waitFor(() => {
      const serverThread = result.current.threadData.threads?.[0];
      expect(serverThread?.createdAt).toEqual(fakeCreatedAt);
      expect(serverThread?.comments[0]?.metadata).toEqual(commentMetadata);
    });

    unmount();
  });
});
