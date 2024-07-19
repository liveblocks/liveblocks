import { act, renderHook, waitFor } from "@testing-library/react";
import { setupServer } from "msw/node";
import { nanoid } from "@liveblocks/core";
import React from "react";

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
      mockGetThreads((_req, res, ctx) => {
        return res(
          ctx.json({
            data: [initialThread],
            inboxNotifications: [],
            deletedThreads: [],
            deletedInboxNotifications: [],
            meta: {
              requestedAt: new Date().toISOString(),
            },
          })
        );
      }),
      mockMarkThreadAsResolved(
        { threadId: initialThread.id },
        async (_, res, ctx) => {
          hasCalledMarkThreadAsResolved = true;

          return res(ctx.status(200));
        }
      )
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

    await waitFor(() =>
      expect(result.current.threads).toEqual([initialThread])
    );

    act(() => result.current.markThreadAsResolved(initialThread.id));

    expect(result.current.threads![0]?.resolved).toBe(true);

    await waitFor(() => expect(hasCalledMarkThreadAsResolved).toEqual(true));

    expect(result.current.threads![0]?.resolved).toBe(true);

    unmount();
  });
});
