import { act, renderHook, waitFor } from "@testing-library/react";
import { setupServer } from "msw/node";
import React from "react";

import { dummyCommentData, dummyThreadData } from "./_dummies";
import MockWebSocket from "./_MockWebSocket";
import { mockDeleteThread, mockGetThreads } from "./_restMocks";
import { createRoomContextForTest } from "./_utils";

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

describe("useDeleteThread", () => {
  const userId = "batman";
  const threads = [
    {
      ...dummyThreadData(),
      comments: [
        {
          ...dummyCommentData(),
          userId,
        },
      ],
    },
  ];

  test("should delete a thread optimistically", async () => {
    server.use(
      mockGetThreads(async (_req, res, ctx) => {
        return res(
          ctx.json({
            data: threads,
            inboxNotifications: [],
            deletedThreads: [],
            deletedInboxNotifications: [],
            meta: {
              requestedAt: new Date().toISOString(),
            },
          })
        );
      }),
      mockDeleteThread({ threadId: threads[0].id }, async (_req, res, ctx) => {
        return res(ctx.status(204));
      })
    );

    const { RoomProvider, useThreads, useDeleteThread } =
      createRoomContextForTest({ userId });

    const { result, unmount } = renderHook(
      () => ({
        threads: useThreads().threads,
        deleteThread: useDeleteThread(),
      }),
      {
        wrapper: ({ children }) => (
          <RoomProvider id="room-id">{children}</RoomProvider>
        ),
      }
    );

    expect(result.current.threads).toBeUndefined();

    await waitFor(() => expect(result.current.threads).toEqual(threads));

    await act(() => {
      result.current.deleteThread(threads[0].id);
      return null;
    });

    await waitFor(() => expect(result.current.threads).toEqual([]));

    unmount();
  });

  test("should throw an error when a user attempts to delete someone else's thread", async () => {
    server.use(
      mockGetThreads(async (_req, res, ctx) =>
        res(
          ctx.json({
            data: threads,
            inboxNotifications: [],
            deletedThreads: [],
            deletedInboxNotifications: [],
            meta: {
              requestedAt: new Date().toISOString(),
            },
          })
        )
      )
      // no need to mock delete thread, as it should not be called
    );

    const { RoomProvider, useThreads, useDeleteThread } =
      createRoomContextForTest({ userId: "superman" });

    const { result, unmount } = renderHook(
      () => ({
        threads: useThreads().threads,
        deleteThread: useDeleteThread(),
      }),
      {
        wrapper: ({ children }) => (
          <RoomProvider id="room-id">{children}</RoomProvider>
        ),
      }
    );

    expect(result.current.threads).toBeUndefined();

    await waitFor(() => expect(result.current.threads).toEqual(threads));

    try {
      result.current.deleteThread(threads[0].id);
    } catch (error) {
      const message = (error as Error).message;
      expect(message).toMatch("Only the thread creator can delete the thread");
    }

    await waitFor(() => expect(result.current.threads).toEqual(threads));

    unmount();
  });

  test("should rollback optimistic deletion if server fails", async () => {
    server.use(
      mockGetThreads(async (_req, res, ctx) =>
        res(
          ctx.json({
            data: threads,
            inboxNotifications: [],
            deletedThreads: [],
            deletedInboxNotifications: [],
            meta: {
              requestedAt: new Date().toISOString(),
            },
          })
        )
      ),
      mockDeleteThread({ threadId: threads[0].id }, async (_req, res, ctx) =>
        res(ctx.status(500))
      )
    );

    const { RoomProvider, useThreads, useDeleteThread } =
      createRoomContextForTest({ userId });

    const { result, unmount } = renderHook(
      () => ({
        threads: useThreads().threads,
        deleteThread: useDeleteThread(),
      }),
      {
        wrapper: ({ children }) => (
          <RoomProvider id="room-id">{children}</RoomProvider>
        ),
      }
    );

    expect(result.current.threads).toBeUndefined();

    await waitFor(() => expect(result.current.threads).toEqual(threads));

    await act(() => {
      result.current.deleteThread(threads[0].id);
      return null;
    });

    await waitFor(() => expect(result.current.threads).toEqual(threads));

    unmount();
  });
});
