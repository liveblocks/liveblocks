import "@testing-library/jest-dom";

import type { BaseMetadata, JsonObject } from "@liveblocks/core";
import { createClient } from "@liveblocks/core";
import { act, renderHook, waitFor } from "@testing-library/react";
import { setupServer } from "msw/node";
import React, { Suspense } from "react";

import { createLiveblocksContext } from "../liveblocks";
import { createRoomContext } from "../room";
import MockWebSocket from "./_MockWebSocket";
import {
  mockGetRoomNotificationSettings,
  mockUpdateRoomNotificationSettings,
} from "./_restMocks";

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
function createRoomContextForTest<
  TThreadMetadata extends BaseMetadata = BaseMetadata,
>() {
  const client = createClient({
    publicApiKey: "pk_xxx",
    polyfills: {
      WebSocket: MockWebSocket as any,
    },
  });

  return {
    roomCtx: createRoomContext<
      JsonObject,
      never,
      never,
      never,
      TThreadMetadata
    >(client),
    liveblocksCtx: createLiveblocksContext(client),
  };
}

describe("useRoomNotificationSettings", () => {
  test("should be referentially stable", async () => {
    server.use(
      mockGetRoomNotificationSettings(async (_req, res, ctx) => {
        return res(
          ctx.json({
            threads: "all",
          })
        );
      })
    );

    const {
      roomCtx: { RoomProvider, useRoomNotificationSettings },
    } = createRoomContextForTest();

    const { result, unmount, rerender } = renderHook(
      () => useRoomNotificationSettings(),
      {
        wrapper: ({ children }) => (
          <RoomProvider id="room-id" initialPresence={{}}>
            {children}
          </RoomProvider>
        ),
      }
    );

    expect(result.current[0]).toEqual({ isLoading: true });

    await waitFor(() =>
      expect(result.current[0]).toEqual({
        isLoading: false,
        settings: {
          threads: "all",
        },
      })
    );

    const oldResult = result.current;

    rerender();

    expect(result.current).toBe(oldResult);

    unmount();
  });

  test("should update room notification settings optimistically and revert the updates if error response from server", async () => {
    server.use(
      mockGetRoomNotificationSettings(async (_req, res, ctx) => {
        return res(
          ctx.json({
            threads: "all",
          })
        );
      }),
      mockUpdateRoomNotificationSettings((_req, res, ctx) =>
        res(ctx.status(500))
      )
    );

    const {
      roomCtx: { RoomProvider, useRoomNotificationSettings },
    } = createRoomContextForTest();

    const { result, unmount } = renderHook(
      () => useRoomNotificationSettings(),
      {
        wrapper: ({ children }) => (
          <RoomProvider id="room-id" initialPresence={{}}>
            {children}
          </RoomProvider>
        ),
      }
    );

    expect(result.current[0]).toEqual({ isLoading: true });

    await waitFor(() =>
      expect(result.current[0]).toEqual({
        isLoading: false,
        settings: {
          threads: "all",
        },
      })
    );

    const updateRoomNotificationSettings = result.current[1];
    // Update the room notification settings to none
    await act(() => {
      updateRoomNotificationSettings({ threads: "none" });
    });

    // Notification settings should be updated optimistically
    expect(result.current[0]).toEqual({
      isLoading: false,
      settings: {
        threads: "none",
      },
    });

    await waitFor(() => {
      // Notification settings should be reverted to the original value ("all") after the error response from the server
      expect(result.current[0]).toEqual({
        isLoading: false,
        settings: {
          threads: "all",
        },
      });
    });

    unmount();
  });
});

describe("useRoomNotificationSettings suspense", () => {
  test("should be referentially stable", async () => {
    server.use(
      mockGetRoomNotificationSettings(async (_req, res, ctx) => {
        return res(
          ctx.json({
            threads: "all",
          })
        );
      })
    );

    const {
      roomCtx: {
        suspense: { RoomProvider, useRoomNotificationSettings },
      },
    } = createRoomContextForTest();

    const { result, unmount, rerender } = renderHook(
      () => useRoomNotificationSettings(),
      {
        wrapper: ({ children }) => (
          <RoomProvider id="room-id" initialPresence={{}}>
            <Suspense>{children}</Suspense>
          </RoomProvider>
        ),
      }
    );

    await waitFor(() =>
      expect(result.current[0]).toEqual({
        isLoading: false,
        settings: {
          threads: "all",
        },
      })
    );

    const oldResult = result.current;

    rerender();

    expect(result.current).toBe(oldResult);

    unmount();
  });
});
