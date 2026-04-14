import type { BaseMetadata } from "@liveblocks/core";
import { nanoid, Permission } from "@liveblocks/core";
import { act, renderHook } from "@testing-library/react";
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
import { mockEditCommentMetadata, mockGetThreads } from "./_restMocks";
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

describe("useEditCommentMetadata", () => {
  test("should edit comment metadata optimistically", async () => {
    const roomId = nanoid();
    const initialComment = dummyCommentData({
      roomId,
      metadata: { priority: 1 },
    });
    const initialThread = dummyThreadData({
      roomId,
      comments: [initialComment],
    });
    let hasCalledEditCommentMetadata = false;

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
      mockEditCommentMetadata(
        { threadId: initialThread.id, commentId: initialComment.id },
        async ({ request }) => {
          hasCalledEditCommentMetadata = true;
          const json = await request.json();

          return HttpResponse.json(json);
        }
      )
    );

    const {
      room: { RoomProvider, useThreads, useEditCommentMetadata },
    } = createContextsForTest();

    const { result, unmount } = renderHook(
      () => ({
        threads: useThreads().threads,
        editCommentMetadata: useEditCommentMetadata(),
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

    act(() =>
      result.current.editCommentMetadata({
        threadId: initialThread.id,
        commentId: initialComment.id,
        metadata: {
          reviewed: true,
        },
      })
    );

    expect(result.current.threads![0]?.comments[0]?.metadata.reviewed).toBe(
      true
    );

    // Comment metadata is not updated by the server response so exceptionally,
    // we need to check if mock has been called
    await vi.waitFor(() => expect(hasCalledEditCommentMetadata).toEqual(true));

    unmount();
  });

  test("should remove comment metadata optimistically and update it with the server response", async () => {
    const roomId = nanoid();
    const initialComment = dummyCommentData({
      roomId,
      metadata: { priority: 1, reviewed: false },
    });
    const initialThread = dummyThreadData({
      roomId,
      comments: [initialComment],
    });
    let hasCalledEditCommentMetadata = false;

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
      mockEditCommentMetadata(
        { threadId: initialThread.id, commentId: initialComment.id },
        async () => {
          hasCalledEditCommentMetadata = true;
          return HttpResponse.json<BaseMetadata>({ priority: 2 });
        }
      )
    );

    const {
      room: { RoomProvider, useThreads, useEditCommentMetadata },
    } = createContextsForTest();

    const { result, unmount } = renderHook(
      () => ({
        threads: useThreads().threads,
        editCommentMetadata: useEditCommentMetadata(),
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

    act(() =>
      result.current.editCommentMetadata({
        threadId: initialThread.id,
        commentId: initialComment.id,
        metadata: {
          priority: 2,
          reviewed: null,
        },
      })
    );

    expect(result.current.threads).toBeDefined();
    expect(result.current.threads?.[0]?.comments[0]?.metadata).toEqual({
      priority: 2,
      reviewed: null,
    });

    // Comment metadata is not updated by the server response so exceptionally,
    // we need to check if mock has been called
    await vi.waitFor(() => expect(hasCalledEditCommentMetadata).toEqual(true));

    await vi.waitFor(() => {
      expect(result.current.threads?.[0]?.comments[0]?.metadata).toEqual({
        priority: 2,
      });
    });
    unmount();
  });
});
