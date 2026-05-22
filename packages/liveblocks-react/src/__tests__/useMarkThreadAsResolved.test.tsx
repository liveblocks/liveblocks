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
  mockGetThread,
  mockGetThreads,
  mockMarkThreadAsResolved,
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

describe("useMarkThreadAsResolved", () => {
  test("should mark thread as resolved optimistically", async () => {
    const roomId = nanoid();
    const initialThread = dummyThreadData({ roomId, resolved: false });
    let hasCalledMarkThreadAsResolved = false;

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
      mockMarkThreadAsResolved({ threadId: initialThread.id }, () => {
        hasCalledMarkThreadAsResolved = true;

        return HttpResponse.json(null, { status: 200 });
      })
    );

    const {
      room: { RoomProvider, useThreads, useMarkThreadAsResolved },
    } = createContextsForTest();

    const { result, unmount } = renderHook(
      () => ({
        threads: useThreads().threads,
        markThreadAsResolved: useMarkThreadAsResolved(),
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

    act(() => result.current.markThreadAsResolved(initialThread.id));

    expect(result.current.threads![0]?.resolved).toBe(true);

    await vi.waitFor(() => expect(hasCalledMarkThreadAsResolved).toEqual(true));

    expect(result.current.threads![0]?.resolved).toBe(true);

    unmount();
  });

  // Reproduces a race between an optimistic change and a realtime refresh.
  // The refresh writes the server's latest thread into the local store while
  // the change request is still pending. That thread has a newer `updatedAt`,
  // but still contains the old value because the change has not finished yet.
  // The local optimistic change must stay visible and take priority over the
  // remote value.
  test("should prioritize optimistic changes over remote values", async () => {
    const roomId = nanoid();
    const now = new Date();
    const initialThread = dummyThreadData({
      roomId,
      resolved: false,
      updatedAt: now,
    });

    // This is the thread returned by the realtime-triggered refresh. It
    // represents an unrelated server-side change, such as a new comment,
    // whose `updatedAt` is newer than the local change's time. Its data is
    // intentionally stale because the change request is still blocked.
    const concurrentlyUpdatedThread = {
      ...initialThread,
      updatedAt: addSeconds(now, 10),
    };

    let resolveMarkAsResolved: (() => void) | undefined;
    const markAsResolved$ = new Promise<void>((resolve) => {
      resolveMarkAsResolved = resolve;
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
      mockMarkThreadAsResolved({ threadId: initialThread.id }, async () => {
        await markAsResolved$;
        return HttpResponse.json(null, { status: 200 });
      })
    );

    const {
      room: { RoomProvider, useThreads, useMarkThreadAsResolved },
    } = createContextsForTest();

    const { result, unmount } = renderHook(
      () => ({
        threads: useThreads().threads,
        markThreadAsResolved: useMarkThreadAsResolved(),
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

    act(() => result.current.markThreadAsResolved(initialThread.id));

    // The local change is visible immediately.
    expect(result.current.threads![0]?.resolved).toBe(true);

    // A concurrent realtime event arrives and refreshes the thread with the
    // newer `updatedAt` above. Even though that response still has the old
    // resolved value, the optimistic local change should take priority.
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
    expect(result.current.threads![0]?.resolved).toBe(true);

    resolveMarkAsResolved!();

    await vi.waitFor(() => {
      expect(result.current.threads![0]?.resolved).toBe(true);
    });

    await delay(50);
    expect(result.current.threads![0]?.resolved).toBe(true);

    unmount();
  });
});
