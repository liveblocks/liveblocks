import { nanoid, Permission, ServerMsgCode } from "@liveblocks/core";
import { act, renderHook } from "@testing-library/react";
import { addSeconds } from "date-fns";
import { delay, HttpResponse } from "msw";
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

import { dummySubscriptionData, dummyThreadData } from "./_dummies";
import MockWebSocket, { websocketSimulator } from "./_MockWebSocket";
import {
  mockEditThreadMetadata,
  mockGetThread,
  mockGetThreads,
} from "./_restMocks";
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

    await vi.waitFor(() =>
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
    await vi.waitFor(() => expect(hasCalledEditThreadMetadata).toEqual(true));

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

    await vi.waitFor(() =>
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
    await vi.waitFor(() => expect(hasCalledEditThreadMetadata).toEqual(true));

    await vi.waitFor(() => {
      expect(result.current.threads?.[0]?.metadata).toEqual({
        color: "yellow",
      });
    });
    unmount();
  });

  // Reproduces a race between an optimistic change and a realtime refresh.
  // The refresh writes the server's latest thread into the local store while
  // the change request is still pending. That thread has a newer `updatedAt`,
  // but still contains the old value because the edit has not finished yet.
  // The local optimistic change must stay visible and take priority over the
  // remote value.
  test("should prioritize optimistic changes over remote values", async () => {
      const roomId = nanoid();
      const now = new Date();
      const initialThread = dummyThreadData({
        roomId,
        updatedAt: now,
        metadata: { pinned: false },
      });

      // This is the thread returned by the realtime-triggered refresh. It
      // represents an unrelated server-side change, such as a new comment,
      // whose `updatedAt` is newer than the local change's time. Its data is
      // intentionally stale because the edit request is still blocked.
      const concurrentlyUpdatedThread = {
        ...initialThread,
        updatedAt: addSeconds(now, 10),
      };

      let resolveEdit: (() => void) | undefined;
      const edit$ = new Promise<void>((resolve) => {
        resolveEdit = resolve;
      });

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
        mockGetThread({ threadId: initialThread.id }, () => {
          return HttpResponse.json({
            thread: concurrentlyUpdatedThread,
            inboxNotification: undefined,
            subscription: dummySubscriptionData({
              subjectId: initialThread.id,
            }),
          });
        }),
        mockEditThreadMetadata(
          { threadId: initialThread.id },
          async ({ request }) => {
            await edit$;
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

      const sim = await websocketSimulator();

      await vi.waitFor(() =>
        expect(result.current.threads).toEqual([initialThread])
      );

      act(() =>
        result.current.editThreadMetadata({
          threadId: initialThread.id,
          metadata: { pinned: true },
        })
      );

      // The local change is visible immediately.
      expect(result.current.threads![0]?.metadata.pinned).toBe(true);

      // A concurrent realtime event arrives and refreshes the thread with the
      // newer `updatedAt` above. Even though that response still has the old
      // metadata, the optimistic local edit should take priority.
      sim.simulateIncomingMessage({
        type: ServerMsgCode.COMMENT_CREATED,
        threadId: initialThread.id,
        commentId: initialThread.comments[0]!.id,
      });

      await vi.waitFor(() => {
        const thread = result.current.threads![0]!;
        expect(thread.updatedAt).toEqual(concurrentlyUpdatedThread.updatedAt);
      });

      // The optimistic local value should survive the stale refresh.
      expect(result.current.threads![0]?.metadata.pinned).toBe(true);

      resolveEdit!();

      await vi.waitFor(() => {
        expect(result.current.threads![0]?.metadata.pinned).toBe(true);
      });

      await delay(50);
      expect(result.current.threads![0]?.metadata.pinned).toBe(true);

      unmount();
  });
});
