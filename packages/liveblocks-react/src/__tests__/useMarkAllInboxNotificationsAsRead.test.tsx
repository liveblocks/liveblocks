import type { BaseMetadata, JsonObject } from "@liveblocks/core";
import { createClient } from "@liveblocks/core";
import { act, renderHook, waitFor } from "@testing-library/react";
import { setupServer } from "msw/node";
import React from "react";

import { createRoomContext } from "../room";
import { dummyInboxNoficationData, dummyThreadData } from "./_dummies";
import MockWebSocket from "./_MockWebSocket";
import {
  mockGetInboxNotifications,
  mockMarkInboxNotificationsAsRead,
} from "./_restMocks";
import { createLiveblocksContext } from "../liveblocks";

const server = setupServer();

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));

afterEach(() => {
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

describe("useMarkAllInboxNotificationsAsRead", () => {
  test("should mark notification as read optimistically", async () => {
    const threads = [dummyThreadData(), dummyThreadData()];
    const inboxNotifications = [
      dummyInboxNoficationData(),
      dummyInboxNoficationData(),
    ];
    inboxNotifications[0].threadId = threads[0].id;
    inboxNotifications[0].readAt = null;
    inboxNotifications[1].threadId = threads[1].id;
    inboxNotifications[1].readAt = null;

    server.use(
      mockGetInboxNotifications((_req, res, ctx) =>
        res(
          ctx.status(200),
          ctx.json({
            inboxNotifications,
            threads,
          })
        )
      ),
      mockMarkInboxNotificationsAsRead((_req, res, ctx) => res(ctx.status(200)))
    );

    const {
      liveblocksCtx: {
        LiveblocksProvider,
        useInboxNotifications,
        useMarkAllInboxNotificationsAsRead,
      },
    } = createRoomContextForTest();

    const { result, unmount } = renderHook(
      () => ({
        markAllInboxNotificationsAsRead: useMarkAllInboxNotificationsAsRead(),
        inboxNotifications: useInboxNotifications().inboxNotifications,
      }),
      {
        wrapper: ({ children }) => (
          <LiveblocksProvider>{children}</LiveblocksProvider>
        ),
      }
    );

    await waitFor(() =>
      expect(result.current.inboxNotifications).toEqual(inboxNotifications)
    );

    act(() => {
      result.current.markAllInboxNotificationsAsRead();
    });

    expect(result.current.inboxNotifications![0].readAt).not.toBe(null);
    expect(result.current.inboxNotifications![1].readAt).not.toBe(null);

    unmount();
  });

  test("should mark inbox notification as read optimistically and revert the updates if error response from server", async () => {
    const threads = [dummyThreadData(), dummyThreadData()];
    const inboxNotifications = [
      dummyInboxNoficationData(),
      dummyInboxNoficationData(),
    ];
    inboxNotifications[0].threadId = threads[0].id;
    inboxNotifications[0].readAt = null;
    inboxNotifications[1].threadId = threads[1].id;
    inboxNotifications[1].readAt = null;

    server.use(
      mockGetInboxNotifications((_req, res, ctx) =>
        res(
          ctx.status(200),
          ctx.json({
            inboxNotifications,
            threads,
          })
        )
      ),
      mockMarkInboxNotificationsAsRead((_req, res, ctx) => res(ctx.status(500)))
    );

    const {
      liveblocksCtx: {
        LiveblocksProvider,
        useInboxNotifications,
        useMarkAllInboxNotificationsAsRead,
      },
    } = createRoomContextForTest();

    const { result, unmount } = renderHook(
      () => ({
        markMarkInboxNotificationsAsRead: useMarkAllInboxNotificationsAsRead(),
        inboxNotifications: useInboxNotifications().inboxNotifications,
      }),
      {
        wrapper: ({ children }) => (
          <LiveblocksProvider>{children}</LiveblocksProvider>
        ),
      }
    );

    await waitFor(() =>
      expect(result.current.inboxNotifications).toEqual(inboxNotifications)
    );

    act(() => {
      result.current.markMarkInboxNotificationsAsRead();
    });

    // We mark the notification as read optimitiscally
    expect(result.current.inboxNotifications![0].readAt).not.toBe(null);
    expect(result.current.inboxNotifications![1].readAt).not.toBe(null);

    await waitFor(() => {
      // The readAt field should have been updated in the inbox notification cache
      expect(result.current.inboxNotifications![0].readAt).toEqual(null);
      expect(result.current.inboxNotifications![1].readAt).toEqual(null);
    });

    unmount();
  });
});
