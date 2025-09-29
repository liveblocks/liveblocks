import "@testing-library/jest-dom";

import { nanoid } from "@liveblocks/core";
import { renderHook, waitFor } from "@testing-library/react";
import { setupServer } from "msw/node";
import { Suspense } from "react";

import MockWebSocket from "./_MockWebSocket";
import { mockGetUnreadInboxNotificationsCount } from "./_restMocks";
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

describe("useUnreadInboxNotificationsCount", () => {
  test("should fetch inbox notification count", async () => {
    server.use(
      mockGetUnreadInboxNotificationsCount(async (_req, res, ctx) => {
        return res(
          ctx.json({
            count: 1,
          })
        );
      })
    );

    const {
      liveblocks: { LiveblocksProvider, useUnreadInboxNotificationsCount },
    } = createContextsForTest();

    const { result, unmount } = renderHook(
      () => useUnreadInboxNotificationsCount(),
      {
        wrapper: ({ children }) => (
          <LiveblocksProvider>{children}</LiveblocksProvider>
        ),
      }
    );

    expect(result.current).toEqual({
      isLoading: true,
    });

    await waitFor(() =>
      expect(result.current).toEqual({
        isLoading: false,
        count: 1,
      })
    );

    unmount();
  });

  test("should fetch inbox notification count for a given query", async () => {
    const roomA = nanoid();

    server.use(
      mockGetUnreadInboxNotificationsCount(async (_req, res, ctx) => {
        const query = _req.url.searchParams.get("query");

        // For the sake of simplicity, the server mock assumes that if a query is provided, it's for roomA.
        if (query) {
          return res(
            ctx.json({
              count: 1,
            })
          );
        }

        return res(
          ctx.json({
            count: 2,
          })
        );
      })
    );

    const {
      liveblocks: { LiveblocksProvider, useUnreadInboxNotificationsCount },
    } = createContextsForTest();

    const { result, unmount } = renderHook(
      () => useUnreadInboxNotificationsCount({ query: { roomId: roomA } }),
      {
        wrapper: ({ children }) => (
          <LiveblocksProvider>{children}</LiveblocksProvider>
        ),
      }
    );

    expect(result.current).toEqual({
      isLoading: true,
    });

    await waitFor(() =>
      expect(result.current).toEqual({
        isLoading: false,
        count: 1,
      })
    );

    unmount();

    const { result: result2, unmount: unmount2 } = renderHook(
      () => useUnreadInboxNotificationsCount(),
      {
        wrapper: ({ children }) => (
          <LiveblocksProvider>{children}</LiveblocksProvider>
        ),
      }
    );

    expect(result2.current).toEqual({
      isLoading: true,
    });

    await waitFor(() =>
      expect(result2.current).toEqual({
        isLoading: false,
        count: 2,
      })
    );

    unmount2();
  });
});

describe("useUnreadInboxNotificationsCount - Suspense", () => {
  test("should be referentially stable after rerendering", async () => {
    server.use(
      mockGetUnreadInboxNotificationsCount(async (_req, res, ctx) => {
        return res(
          ctx.json({
            count: 1,
          })
        );
      })
    );

    const {
      liveblocks: {
        suspense: { LiveblocksProvider, useUnreadInboxNotificationsCount },
      },
    } = createContextsForTest();

    const { result, unmount, rerender } = renderHook(
      () => useUnreadInboxNotificationsCount(),
      {
        wrapper: ({ children }) => (
          <LiveblocksProvider>
            <Suspense>{children}</Suspense>
          </LiveblocksProvider>
        ),
      }
    );

    expect(result.current).toEqual(null);

    await waitFor(() =>
      expect(result.current).toEqual({
        isLoading: false,
        count: 1,
      })
    );

    const oldResult = result.current;

    rerender();

    expect(result.current).toBe(oldResult);

    unmount();
  });
});
