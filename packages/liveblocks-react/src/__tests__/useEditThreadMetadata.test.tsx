import { nanoid, Permission } from "@liveblocks/core";
import { act, renderHook, waitFor } from "@testing-library/react";
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
} from "vitest";

import { dummyThreadData } from "./_dummies";
import MockWebSocket from "./_MockWebSocket";
import { mockEditThreadMetadata, mockGetThreads } from "./_restMocks";
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

describe("useEditThreadMetadata", () => {
  test("should edit thread metadata optimistically", async () => {
    const roomId = nanoid();
    const initialThread = dummyThreadData({ roomId });
    let hasCalledEditThreadMetadata = false;

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
      mockEditThreadMetadata(
        { threadId: initialThread.id },
        async ({ request }) => {
          hasCalledEditThreadMetadata = true;
          const json = await request.json();

          return HttpResponse.json(json);
        }
      )
    );

    const {
      room: { RoomProvider, useThreads, useEditThreadMetadata },
    } = createContextsForTest();

    const { result, unmount } = renderHook(
      () => ({
        threads: useThreads().threads,
        editThreadMetadata: useEditThreadMetadata(),
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

    act(() =>
      result.current.editThreadMetadata({
        threadId: initialThread.id,
        metadata: {
          pinned: true,
        },
      })
    );

    expect(result.current.threads![0]?.metadata.pinned).toBe(true);

    // Thread updatedAt is not updated by the server response so exceptionally,
    // we need to check if mock has been called
    await waitFor(() => expect(hasCalledEditThreadMetadata).toEqual(true));

    unmount();
  });

  test("should remove thread metadata optimistically and update it with the server response", async () => {
    const roomId = nanoid();
    const initialThread = dummyThreadData({
      roomId,
      metadata: { color: "blue", pinned: true },
    });
    let hasCalledEditThreadMetadata = false;

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
      mockEditThreadMetadata<{ color: string }>(
        { threadId: initialThread.id },
        () => {
          hasCalledEditThreadMetadata = true;
          return HttpResponse.json({
            color: "yellow",
          });
        }
      )
    );

    const {
      room: { RoomProvider, useThreads, useEditThreadMetadata },
    } = createContextsForTest();

    const { result, unmount } = renderHook(
      () => ({
        threads: useThreads().threads,
        editThreadMetadata: useEditThreadMetadata(),
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

    act(() =>
      result.current.editThreadMetadata({
        threadId: initialThread.id,
        metadata: {
          color: "yellow",
          pinned: null,
        },
      })
    );

    expect(result.current.threads).toBeDefined();
    expect(result.current.threads?.[0]?.metadata).toEqual({
      pinned: null,
      color: "yellow",
    });

    // Thread updatedAt is not updated by the server response so exceptionally,
    // we need to check if mock has been called
    await waitFor(() => expect(hasCalledEditThreadMetadata).toEqual(true));

    await waitFor(() => {
      expect(result.current.threads?.[0]?.metadata).toEqual({
        color: "yellow",
      });
    });
    unmount();
  });
});
