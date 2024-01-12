import "@testing-library/jest-dom";

import type { BaseMetadata, JsonObject } from "@liveblocks/core";
import { createClient } from "@liveblocks/core";
import { renderHook, waitFor } from "@testing-library/react";
import { setupServer } from "msw/node";
import React from "react";

import { createRoomContext, POLLING_INTERVAL } from "../room";
import { dummyThreadData } from "./_dummies";
import MockWebSocket from "./_MockWebSocket";
import { mockGetThreads } from "./_restMocks";

const server = setupServer();

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));

beforeEach(() => {
  MockWebSocket.instances = [];
  jest.useFakeTimers();
});

afterEach(() => {
  MockWebSocket.instances = [];
  server.resetHandlers();
  jest.useRealTimers();
});

afterAll(() => server.close());

// TODO: Dry up and create utils that wrap renderHook
function createRoomContextForTest<
  TThreadMetadata extends BaseMetadata = BaseMetadata,
>() {
  const client = createClient({
    publicApiKey: "pk_xxx",
    polyfills: {
      WebSocket: MockWebSocket as any,
    },
  });

  return createRoomContext<JsonObject, never, never, never, TThreadMetadata>(
    client
  );
}

describe("useThreads: polling", () => {
  // TODO: Add more tests for polling
  test("should include an error object in the returned value if initial fetch throws an error but should clear the error if polling is successful", async () => {
    let getThreadsReqCount = 0;
    const threads = [dummyThreadData()];

    server.use(
      mockGetThreads((_req, res, ctx) => {
        getThreadsReqCount++;

        // Mock an error response from the server for the initial fetch
        if (getThreadsReqCount === 1) {
          return res(ctx.status(500));
        }

        // Mock a successful response for all subsequent requests (polling, etc)
        return res(
          ctx.json({
            data: threads,
            inboxNotifications: [],
          })
        );
      })
    );

    const { RoomProvider, useThreads } = createRoomContextForTest();

    const { result, unmount } = renderHook(() => useThreads(), {
      wrapper: ({ children }) => (
        <RoomProvider id="room-id" initialPresence={{}}>
          {children}
        </RoomProvider>
      ),
    });

    expect(result.current).toEqual({ isLoading: true });

    await waitFor(() =>
      expect(result.current).toEqual({
        threads: [],
        isLoading: false,
        error: expect.any(Error),
      })
    );

    jest.advanceTimersByTime(POLLING_INTERVAL);

    await waitFor(() =>
      expect(result.current).toEqual({
        threads: threads,
        isLoading: false,
        error: undefined,
      })
    );

    unmount();
  });
});
