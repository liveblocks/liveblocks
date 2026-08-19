import { nanoid, Permission, Promise_withResolvers } from "@liveblocks/core";
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

import { dummyThreadData } from "./_dummies";
import MockWebSocket from "./_MockWebSocket";
import { mockGetThreads, mockMarkThreadAsResolved } from "./_restMocks";
import { createContextsForTest } from "./_utils";

const server = setupServer();

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));

beforeEach(() => {
  MockWebSocket.reset();
});

afterEach(() => {
  vi.useRealTimers();
  MockWebSocket.reset();
  server.resetHandlers();
});

afterAll(() => server.close());

describe("useMarkThreadAsResolved", () => {
  test("should keep a settled resolve after an in-flight stale refetch", async () => {
    const initialDate = new Date("2024-01-01T00:00:00Z");
    const requestedAt = new Date("2024-01-01T00:01:00Z");
    const refetchedAt = new Date("2024-01-01T00:02:00Z");
    const settledAt = new Date("2024-01-01T00:03:00Z");
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(requestedAt);

    const roomId = nanoid();
    const initialThread = dummyThreadData({
      roomId,
      createdAt: initialDate,
      updatedAt: initialDate,
      resolved: false,
    });
    const staleThread = {
      ...initialThread,
      updatedAt: refetchedAt,
    };
    const mutationResponse = Promise_withResolvers<void>();
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
              [roomId]: [Permission.RoomWrite],
            },
          },
        });
      }),
      mockMarkThreadAsResolved({ threadId: initialThread.id }, async () => {
        hasCalledMarkThreadAsResolved = true;
        await mutationResponse.promise;

        return HttpResponse.json(null, { status: 200 });
      })
    );

    const {
      room: { RoomProvider, useThreads, useMarkThreadAsResolved },
      umbrellaStore,
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

    act(() => umbrellaStore.updateThreadifications([staleThread], [], []));

    expect(result.current.threads![0]?.resolved).toBe(true);

    vi.setSystemTime(settledAt);
    act(() => mutationResponse.resolve());

    await vi.waitFor(() =>
      expect(umbrellaStore.optimisticUpdates.signal.get()).toHaveLength(0)
    );
    expect(result.current.threads?.[0]?.resolved).toBe(true);
    expect(result.current.threads?.[0]?.updatedAt.getTime()).toBeGreaterThan(
      refetchedAt.getTime()
    );

    unmount();
  });
});
