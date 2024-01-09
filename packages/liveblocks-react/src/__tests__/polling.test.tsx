import "@testing-library/jest-dom";

import type { BaseMetadata, JsonObject } from "@liveblocks/core";
import { createClient } from "@liveblocks/core";
import { render, renderHook, waitFor } from "@testing-library/react";
import { rest } from "msw";
import { setupServer } from "msw/node";
import React from "react";

import { POLLING_INTERVAL_REALTIME } from "../comments/CommentsRoom";
import { createRoomContext } from "../factory";
import { dummyThreadDataPlain } from "./_dummies";
import MockWebSocket from "./_MockWebSocket";

const server = setupServer();

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));

beforeEach(() => {
  MockWebSocket.instances = [];
  jest.useFakeTimers();
});

afterEach(() => {
  MockWebSocket.instances = [];
  jest.useRealTimers();
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

  return createRoomContext<JsonObject, never, never, never, TThreadMetadata>(
    client
  );
}

describe("useThreads: Polling", () => {
  test("should poll threads every x seconds", async () => {
    let getThreadsReqCount = 0;

    const threads = [dummyThreadDataPlain()];
    server.use(
      rest.post(
        "https://api.liveblocks.io/v2/c/rooms/room-id/threads/search",
        async (_req, res, ctx) => {
          console.log("HI", getThreadsReqCount);
          getThreadsReqCount++;
          return res(
            ctx.json({
              data: threads,
            })
          );
        }
      )
    );

    const { RoomProvider, useThreads } = createRoomContextForTest();

    const { unmount } = renderHook(() => useThreads(), {
      wrapper: ({ children }) => (
        <RoomProvider id="room-id" initialPresence={{}}>
          {children}
        </RoomProvider>
      ),
    });

    await waitFor(() => expect(getThreadsReqCount).toBe(1));

    expect(getThreadsReqCount).toBe(1);

    // jest.advanceTimersByTime(POLLING_INTERVAL_REALTIME);

    // await waitFor(() => expect(getThreadsReqCount).toBe(2));
    unmount();
  });

  test("should stop polling threads on unmount", async () => {
    let getThreadsReqCount = 0;

    const threads = [dummyThreadDataPlain()];
    server.use(
      rest.post(
        "https://api.liveblocks.io/v2/c/rooms/room-id/threads/search",
        async (_req, res, ctx) => {
          getThreadsReqCount++;
          return res(
            ctx.json({
              data: threads,
            })
          );
        }
      )
    );

    const { RoomProvider, useThreads } = createRoomContextForTest();

    const { unmount } = renderHook(
      () => {
        useThreads();
      },
      {
        wrapper: ({ children }) => (
          <RoomProvider id="room-id" initialPresence={{}}>
            {children}
          </RoomProvider>
        ),
      }
    );

    await waitFor(() => expect(getThreadsReqCount).toBe(1));

    unmount();

    jest.advanceTimersByTime(POLLING_INTERVAL_REALTIME);

    await waitFor(() => expect(getThreadsReqCount).toBe(1));
  });

  test("should stop polling threads only when all instances of useThreads are unmounted", async () => {
    let getThreadsReqCount = 0;

    const threads = [dummyThreadDataPlain()];
    server.use(
      rest.post(
        "https://api.liveblocks.io/v2/c/rooms/room-id/threads/search",
        async (_req, res, ctx) => {
          getThreadsReqCount++;
          return res(
            ctx.json({
              data: threads,
            })
          );
        }
      )
    );

    const { RoomProvider, useThreads } = createRoomContextForTest();

    function Threads() {
      useThreads();
      return <div></div>;
    }

    function Component({
      isFirstThreadsInstanceVisible,
    }: {
      isFirstThreadsInstanceVisible: boolean;
    }) {
      return (
        <>
          {isFirstThreadsInstanceVisible && <Threads />}
          <Threads />
        </>
      );
    }

    const { rerender, unmount } = render(
      <Component isFirstThreadsInstanceVisible={true} />,
      {
        wrapper: ({ children }) => (
          <RoomProvider id="room-id" initialPresence={{}}>
            {children}
          </RoomProvider>
        ),
      }
    );

    await waitFor(() => expect(getThreadsReqCount).toBe(1));

    // We unmount the first instance of useThreads
    rerender(<Component isFirstThreadsInstanceVisible={false} />);

    jest.advanceTimersByTime(POLLING_INTERVAL_REALTIME);

    await waitFor(() => expect(getThreadsReqCount).toBe(2));

    unmount();

    jest.advanceTimersByTime(POLLING_INTERVAL_REALTIME);

    await waitFor(() => expect(getThreadsReqCount).toBe(2));
  });
});
