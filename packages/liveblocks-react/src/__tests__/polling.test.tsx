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
        threads,
        isLoading: false,
        error: undefined,
      })
    );

    unmount();
  });

  // TODO: Add more tests for polling
  // test("should poll threads every x seconds", async () => {
  //   let getThreadsReqCount = 0;

  //   const threads = [dummyThreadDataPlain()];
  //   server.use(
  //     rest.post(
  //       "https://api.liveblocks.io/v2/c/rooms/room-id/threads/search",
  //       async (_req, res, ctx) => {
  //         getThreadsReqCount++;
  //         return res(
  //           ctx.json({
  //             data: threads,
  //           })
  //         );
  //       }
  //     )
  //   );

  //   const { RoomProvider, useThreads } = createRoomContextForTest();

  //   const { unmount } = renderHook(() => useThreads(), {
  //     wrapper: ({ children }) => (
  //       <RoomProvider id="room-id" initialPresence={{}}>
  //         {children}
  //       </RoomProvider>
  //     ),
  //   });

  //   await waitFor(() => expect(getThreadsReqCount).toBe(1));

  //   expect(getThreadsReqCount).toBe(1);

  //   // jest.advanceTimersByTime(POLLING_INTERVAL_REALTIME);

  //   // await waitFor(() => expect(getThreadsReqCount).toBe(2));
  //   unmount();
  // });

  // test("should stop polling threads on unmount", async () => {
  //   let getThreadsReqCount = 0;

  //   const threads = [dummyThreadDataPlain()];
  //   server.use(
  //     rest.post(
  //       "https://api.liveblocks.io/v2/c/rooms/room-id/threads/search",
  //       async (_req, res, ctx) => {
  //         getThreadsReqCount++;
  //         return res(
  //           ctx.json({
  //             data: threads,
  //           })
  //         );
  //       }
  //     )
  //   );

  //   const { RoomProvider, useThreads } = createRoomContextForTest();

  //   const { unmount } = renderHook(
  //     () => {
  //       useThreads();
  //     },
  //     {
  //       wrapper: ({ children }) => (
  //         <RoomProvider id="room-id" initialPresence={{}}>
  //           {children}
  //         </RoomProvider>
  //       ),
  //     }
  //   );

  //   await waitFor(() => expect(getThreadsReqCount).toBe(1));

  //   unmount();

  //   jest.advanceTimersByTime(POLLING_INTERVAL_REALTIME);

  //   await waitFor(() => expect(getThreadsReqCount).toBe(1));
  // });

  // test("should stop polling threads only when all instances of useThreads are unmounted", async () => {
  //   let getThreadsReqCount = 0;

  //   const threads = [dummyThreadDataPlain()];
  //   server.use(
  //     rest.post(
  //       "https://api.liveblocks.io/v2/c/rooms/room-id/threads/search",
  //       async (_req, res, ctx) => {
  //         getThreadsReqCount++;
  //         return res(
  //           ctx.json({
  //             data: threads,
  //           })
  //         );
  //       }
  //     )
  //   );

  //   const { RoomProvider, useThreads } = createRoomContextForTest();

  //   function Threads() {
  //     useThreads();
  //     return <div></div>;
  //   }

  //   function Component({
  //     isFirstThreadsInstanceVisible,
  //   }: {
  //     isFirstThreadsInstanceVisible: boolean;
  //   }) {
  //     return (
  //       <>
  //         {isFirstThreadsInstanceVisible && <Threads />}
  //         <Threads />
  //       </>
  //     );
  //   }

  //   const { rerender, unmount } = render(
  //     <Component isFirstThreadsInstanceVisible={true} />,
  //     {
  //       wrapper: ({ children }) => (
  //         <RoomProvider id="room-id" initialPresence={{}}>
  //           {children}
  //         </RoomProvider>
  //       ),
  //     }
  //   );

  //   await waitFor(() => expect(getThreadsReqCount).toBe(1));

  //   // We unmount the first instance of useThreads
  //   rerender(<Component isFirstThreadsInstanceVisible={false} />);

  //   jest.advanceTimersByTime(POLLING_INTERVAL_REALTIME);

  //   await waitFor(() => expect(getThreadsReqCount).toBe(2));

  //   unmount();

  //   jest.advanceTimersByTime(POLLING_INTERVAL_REALTIME);

  //   await waitFor(() => expect(getThreadsReqCount).toBe(2));
  // });
});
