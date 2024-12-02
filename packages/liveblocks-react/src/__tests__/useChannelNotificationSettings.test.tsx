import "@testing-library/jest-dom";

import { renderHook, waitFor } from "@testing-library/react";
import { setupServer } from "msw/node";
import React from "react";

import MockWebSocket from "./_MockWebSocket";
import { mockGetChannelNotificationSettings } from "./_restMocks";
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

describe("useChannelNotificationSettings", () => {
  test("should fetch channel notification settings and be referentially stable", async () => {
    server.use(
      mockGetChannelNotificationSettings(async (_req, res, ctx) => {
        console.log("nbom");
        return res(
          ctx.json({
            email: {
              thread: true,
              textMention: false,
            },
          })
        );
      })
    );

    const {
      liveblocks: { LiveblocksProvider, useChannelNotificationSettings },
    } = createContextsForTest();

    const { result, unmount, rerender } = renderHook(
      () => useChannelNotificationSettings(),
      {
        wrapper: ({ children }) => (
          <LiveblocksProvider>{children}</LiveblocksProvider>
        ),
      }
    );

    expect(result.current[0]).toEqual({ isLoading: true });

    await waitFor(() =>
      expect(result.current[0]).toEqual({
        isLoading: false,
        settings: {
          email: {
            thread: true,
            textMention: false,
          },
        },
      })
    );

    const oldResult = result.current;
    rerender();

    expect(result.current).toBe(oldResult);

    unmount();
  });
});
