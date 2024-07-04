import type { BaseMetadata, JsonObject } from "@liveblocks/core";
import { createClient } from "@liveblocks/core";
import { act, renderHook, waitFor } from "@testing-library/react";
import { setupServer } from "msw/node";
import React from "react";

import { createRoomContext } from "../room";
import { dummyThreadData } from "./_dummies";
import MockWebSocket from "./_MockWebSocket";
import { mockEditThreadMetadata, mockGetThreads } from "./_restMocks";

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

describe("useEditThreadMetadata", () => {
  test("should edit thread metadata optimistically", async () => {
    const initialThread = dummyThreadData();
    let hasCalledEditThreadMetadata = false;

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
      mockEditThreadMetadata(
        { threadId: initialThread.id },
        async (req, res, ctx) => {
          hasCalledEditThreadMetadata = true;
          const json = await req.json();

          return res(ctx.json(json));
        }
      )
    );

    const { RoomProvider, useThreads, useEditThreadMetadata } =
      createRoomContextForTest();

    const { result, unmount } = renderHook(
      () => ({
        threads: useThreads().threads,
        editThreadMetadata: useEditThreadMetadata(),
      }),
      {
        wrapper: ({ children }) => (
          <RoomProvider id="room-id">{children}</RoomProvider>
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
    const initialThread = dummyThreadData();
    initialThread.metadata = { color: "blue", pinned: true };
    let hasCalledEditThreadMetadata = false;

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
      mockEditThreadMetadata(
        { threadId: initialThread.id },
        async (_, res, ctx) => {
          hasCalledEditThreadMetadata = true;
          return res(
            ctx.json({
              color: "yellow",
            })
          );
        }
      )
    );

    const { RoomProvider, useThreads, useEditThreadMetadata } =
      createRoomContextForTest();

    const { result, unmount } = renderHook(
      () => ({
        threads: useThreads().threads,
        editThreadMetadata: useEditThreadMetadata(),
      }),
      {
        wrapper: ({ children }) => (
          <RoomProvider id="room-id">{children}</RoomProvider>
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
    expect(result.current.threads![0].metadata).toEqual({
      pinned: null,
      color: "yellow",
    });

    // Thread updatedAt is not updated by the server response so exceptionally,
    // we need to check if mock has been called
    await waitFor(() => expect(hasCalledEditThreadMetadata).toEqual(true));

    await waitFor(() => {
      expect(result.current.threads![0].metadata).toEqual({
        color: "yellow",
      });
    });
    unmount();
  });
});
