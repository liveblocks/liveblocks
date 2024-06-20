import { act, renderHook, waitFor } from "@testing-library/react";
import { setupServer } from "msw/node";
import React from "react";

import { dummyThreadData } from "./_dummies";
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
  test("should delete a thread optimistically", async () => {
    const threads = [dummyThreadData()];
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
      createRoomContextForTest();

    const { result, unmount } = renderHook(
      () => ({
        threads: useThreads().threads,
        deleteThread: useDeleteThread(),
      }),
      {
        wrapper: ({ children }) => (
          <RoomProvider id="room-id">
            {children}
          </RoomProvider>
        ),
      }
    );

    expect(result.current.threads).toBeUndefined();

    await waitFor(() => expect(result.current.threads).toEqual(threads));

    await act(() => result.current.deleteThread(threads[0].id));

    await waitFor(() => expect(result.current.threads).toEqual([]));

    unmount();
  });

  test("should rollback optimistic deletion if server fails", async () => {
    const threads = [dummyThreadData()];
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
        return res(ctx.status(500));
      })
    );

    const { RoomProvider, useThreads, useDeleteThread } =
      createRoomContextForTest();

    const { result, unmount } = renderHook(
      () => ({
        threads: useThreads().threads,
        deleteThread: useDeleteThread(),
      }),
      {
        wrapper: ({ children }) => (
          <RoomProvider id="room-id">
            {children}
          </RoomProvider>
        ),
      }
    );

    expect(result.current.threads).toBeUndefined();

    await waitFor(() => expect(result.current.threads).toEqual(threads));

    await act(() => result.current.deleteThread(threads[0].id));

    await waitFor(() => expect(result.current.threads).toEqual(threads));

    unmount();
  });
});
