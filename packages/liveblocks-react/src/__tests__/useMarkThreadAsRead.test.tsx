import type { BaseMetadata, JsonObject } from "@liveblocks/core";
import { createClient, getCacheStore } from "@liveblocks/core";
import { act, renderHook, waitFor } from "@testing-library/react";
import { setupServer } from "msw/node";
import React from "react";

import { createRoomContext } from "../room";
import { dummyInboxNoficationData, dummyThreadData } from "./_dummies";
import MockWebSocket from "./_MockWebSocket";
import { mockMarkInboxNotificationsAsRead } from "./_restMocks";

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
    context: createRoomContext<
      JsonObject,
      never,
      never,
      never,
      TThreadMetadata
    >(client),
    client,
  };
}

// TODO: Refactor test to not assert based on the internal store
describe("useMarkThreadAsRead", () => {
  test("should mark thread as read optimistically and keep the updates if successful response from server", async () => {
    const threads = [dummyThreadData()];
    const inboxNotifications = [dummyInboxNoficationData()];
    inboxNotifications[0].threadId = threads[0].id;
    inboxNotifications[0].readAt = null;

    server.use(
      mockMarkInboxNotificationsAsRead((_req, res, ctx) => res(ctx.status(200)))
    );

    const {
      context: { RoomProvider, useMarkThreadAsRead },
      client,
    } = createRoomContextForTest();

    const store = getCacheStore(client);

    store.updateThreadsAndNotifications(threads, inboxNotifications);

    const {
      result: { current: markThreadAsRead },
      unmount,
    } = renderHook(() => useMarkThreadAsRead(), {
      wrapper: ({ children }) => (
        <RoomProvider id="room-id" initialPresence={{}}>
          {children}
        </RoomProvider>
      ),
    });

    // Mark the first thread in our threads list as read
    act(() => {
      markThreadAsRead(threads[0].id);
    });

    // An optimistic update should have been added to the store
    const optimisticUpdates = store.get().optimisticUpdates;
    expect(optimisticUpdates.length).toEqual(1);
    expect(optimisticUpdates[0]).toEqual({
      type: "mark-inbox-notification-as-read",
      id: expect.any(String),
      inboxNotificationId: inboxNotifications[0].id,
      readAt: expect.any(Date),
    });

    await waitFor(() => {
      // The optimistic update should have been removed
      expect(store.get().optimisticUpdates.length).toEqual(0);

      // The readAt field should have been updated in the inbox notification cache
      expect(
        store.get().inboxNotifications[inboxNotifications[0].id].readAt
      ).toEqual((optimisticUpdates[0] as { readAt: Date }).readAt);
    });

    unmount();
  });

  test("should mark thread as read optimistically and revert the updates if error response from server", async () => {
    const threads = [dummyThreadData()];
    const inboxNotifications = [dummyInboxNoficationData()];
    inboxNotifications[0].threadId = threads[0].id;
    inboxNotifications[0].readAt = null;

    server.use(
      mockMarkInboxNotificationsAsRead((_req, res, ctx) => res(ctx.status(500)))
    );

    const {
      context: { RoomProvider, useMarkThreadAsRead },
      client,
    } = createRoomContextForTest();

    const store = getCacheStore(client);

    store.updateThreadsAndNotifications(threads, inboxNotifications);

    const {
      result: { current: markThreadAsRead },
      unmount,
    } = renderHook(() => useMarkThreadAsRead(), {
      wrapper: ({ children }) => (
        <RoomProvider id="room-id" initialPresence={{}}>
          {children}
        </RoomProvider>
      ),
    });

    // Mark the first thread in our threads list as read
    act(() => {
      markThreadAsRead(threads[0].id);
    });

    // An optimistic update should have been added to the store
    const optimisticUpdates = store.get().optimisticUpdates;
    expect(optimisticUpdates.length).toEqual(1);
    expect(optimisticUpdates[0]).toEqual({
      type: "mark-inbox-notification-as-read",
      id: expect.any(String),
      inboxNotificationId: inboxNotifications[0].id,
      readAt: expect.any(Date),
    });

    await waitFor(() => {
      // The optimistic update should have been removed
      expect(store.get().optimisticUpdates.length).toEqual(0);

      // The readAt field should have been updated in the inbox notification cache
      expect(
        store.get().inboxNotifications[inboxNotifications[0].id].readAt
      ).toEqual(null);
    });

    unmount();
  });
});
