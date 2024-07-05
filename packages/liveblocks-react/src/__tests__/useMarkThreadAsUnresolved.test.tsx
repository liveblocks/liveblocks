import type { BaseMetadata, JsonObject } from "@liveblocks/core";
import { createClient } from "@liveblocks/core";
import { act, renderHook, waitFor } from "@testing-library/react";
import { setupServer } from "msw/node";
import { nanoid } from "nanoid";
import React from "react";

import { createRoomContext } from "../room";
import { dummyThreadData } from "./_dummies";
import MockWebSocket from "./_MockWebSocket";
import { mockGetThreads, mockMarkThreadAsUnresolved } from "./_restMocks";

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

// TODO: Dry up and create utils that wrap renderHook
function createRoomContextForTest<M extends BaseMetadata>() {
  const client = createClient({
    publicApiKey: "pk_xxx",
    polyfills: {
      WebSocket: MockWebSocket as any,
    },
  });

  return createRoomContext<JsonObject, never, never, never, M>(client);
}

describe("useMarkThreadAsUnresolved", () => {
  test("should mark thread as unresolved optimistically", async () => {
    const roomId = nanoid();
    const initialThread = dummyThreadData({ roomId, resolved: true });
    let hasCalledMarkThreadAsUnresolved = false;

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
      mockMarkThreadAsUnresolved(
        { threadId: initialThread.id },
        async (_, res, ctx) => {
          hasCalledMarkThreadAsUnresolved = true;

          return res(ctx.status(200));
        }
      )
    );

    const { RoomProvider, useThreads, useMarkThreadAsUnresolved } =
      createRoomContextForTest();

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
