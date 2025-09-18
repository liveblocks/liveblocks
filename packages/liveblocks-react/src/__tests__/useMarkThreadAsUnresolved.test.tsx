import { nanoid, Permission } from "@liveblocks/core";
import { act, renderHook, waitFor } from "@testing-library/react";
import { HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { afterAll, afterEach, beforeAll, describe, expect, test } from "vitest";

import { dummyThreadData } from "./_dummies";
import MockWebSocket from "./_MockWebSocket";
import { mockGetThreads, mockMarkThreadAsUnresolved } from "./_restMocks";
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

describe("useMarkThreadAsUnresolved", () => {
  test("should mark thread as unresolved optimistically", async () => {
    const roomId = nanoid();
    const initialThread = dummyThreadData({ roomId, resolved: true });
    let hasCalledMarkThreadAsUnresolved = false;

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
      mockMarkThreadAsUnresolved({ threadId: initialThread.id }, () => {
        hasCalledMarkThreadAsUnresolved = true;

        return HttpResponse.json(null, { status: 200 });
      })
    );

    const {
      room: { RoomProvider, useThreads, useMarkThreadAsUnresolved },
    } = createContextsForTest();

    const { result, unmount } = renderHook(
      () => ({
        threads: useThreads().threads,
        markThreadAsUnresolved: useMarkThreadAsUnresolved(),
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

    act(() => result.current.markThreadAsUnresolved(initialThread.id));

    expect(result.current.threads![0]?.resolved).toBe(false);

    await waitFor(() => expect(hasCalledMarkThreadAsUnresolved).toEqual(true));

    expect(result.current.threads![0]?.resolved).toBe(false);

    unmount();
  });
});
