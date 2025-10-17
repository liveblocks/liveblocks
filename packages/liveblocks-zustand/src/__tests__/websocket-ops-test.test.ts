import type { JsonObject, BaseUserMeta, Json } from "@liveblocks/client";
import { createClient } from "@liveblocks/client";
import { ClientMsgCode, OpCode, ServerMsgCode } from "@liveblocks/core";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { assertEq } from "tosti";
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  test,
} from "vitest";
import type { StateCreator } from "zustand";
import { create } from "zustand";

import type { WithLiveblocks } from "..";
import { liveblocks as liveblocksMiddleware } from "..";
import { obj, MockWebSocket, waitFor } from "./_utils";

window.WebSocket = MockWebSocket as any;

const server = setupServer(
  http.post("/api/auth", () => {
    return HttpResponse.json({
      token:
        "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJpYXQiOjE2OTAwMzMzMjgsImV4cCI6MTY5MDAzMzMzMywiayI6InNlYy1sZWdhY3kiLCJyb29tSWQiOiJlTFB3dU9tTXVUWEN6Q0dSaTVucm4iLCJhcHBJZCI6IjYyNDFjYjk1ZWQ2ODdkNWRlNWFhYTEzMiIsImFjdG9yIjoxLCJzY29wZXMiOlsicm9vbTp3cml0ZSJdLCJpZCI6InVzZXItMyIsIm1heENvbm5lY3Rpb25zUGVyUm9vbSI6MjB9.QoRc9dJJp-C1LzmQ-S_scHfFsAZ7dBcqep0bUZNyWxEWz_VeBHBBNdJpNs7b7RYRFDBi7RxkywKJlO-gNE8h3wkhebgLQVeSgI3YfTJo7J8Jzj38TzH85ZIbybaiGcxda_sYn3VohDtUHA1k67ns08Q2orJBNr30Gc88jJmc1He_7bLStsDP4M2F1NRMuFuqLULWHnPeEM7jMvLZYkbu3SBeCH4TQGyweu7qAXvP-HHtmvzOi8LdEnpxgxGjxefdu6m4a-fJj6LwoYCGi1rlLDHH9aOHFwYVrBBBVwoeIDSHoAonkPaae9AWM6igJhNt9-ihgEH6sF-qgFiPxHNXdg",
    });
  })
);

beforeAll(() => server.listen());
afterEach(() => {
  MockWebSocket.instances = [];
  server.resetHandlers();
});
beforeEach(() => {
  MockWebSocket.instances = [];
});
afterAll(() => server.close());

async function waitForSocketToBeConnected() {
  await waitFor(() => MockWebSocket.instances.length === 1);

  const socket = MockWebSocket.instances[0]!;
  expect(socket.callbacks.open.length).toBe(1);
  expect(socket.callbacks.message.length).toBe(1);

  return socket;
}

interface TestStore {
  count: number;
  nested: { nestedCount: number };
  increment: () => void;
  incrementNested: () => void;
}

const testStateCreator: StateCreator<TestStore> = (set) => ({
  count: 0,
  nested: { nestedCount: 13 },
  increment: () => set((state) => ({ ...state, count: state.count + 1 })),
  incrementNested: () =>
    set((state) => ({
      ...state,
      nested: { ...state.nested, nestedCount: state.nested.nestedCount + 1 },
    })),
});

async function setupStoreWithStorage() {
  const client = createClient({ authEndpoint: "/api/auth" });
  const store = create<
    WithLiveblocks<TestStore, JsonObject, JsonObject, BaseUserMeta, JsonObject>
  >()(
    liveblocksMiddleware(testStateCreator, {
      client,
      storageMapping: { count: true, nested: true },
      presenceMapping: {},
    }) as any
  );

  store.getState().liveblocks.enterRoom("test-room");

  const socket = await waitForSocketToBeConnected();

  // Send initial storage state
  socket.callbacks.message[0]!({
    data: JSON.stringify({
      type: ServerMsgCode.INITIAL_STORAGE_STATE,
      items: [obj("root", { count: 0, nested: { nestedCount: 13 } })],
    }),
  } as MessageEvent);

  await waitFor(() => !store.getState().liveblocks.isStorageLoading);

  return { store, socket };
}

describe("WebSocket operations verification", () => {
  test("should send UPDATE_STORAGE op when state is updated", async () => {
    const { store, socket } = await setupStoreWithStorage();

    // Clear initial messages
    socket.sentMessages = [];

    // Perform state updates
    store.getState().increment();
    store.getState().increment();

    // Wait for operation to be sent
    await waitFor(() => socket.sentMessages.length > 0);

    // Verify the WebSocket message
    const sentMessage = socket.sentMessages.map((m) => JSON.parse(m) as Json);
    assertEq(sentMessage, [
      [
        {
          type: ClientMsgCode.UPDATE_STORAGE,
          ops: [
            {
              opId: "0:0",
              id: "root",
              type: OpCode.UPDATE_OBJECT,
              data: { count: 1 },
            },
          ],
        },
      ],
      [
        {
          type: ClientMsgCode.UPDATE_STORAGE,
          ops: [
            {
              opId: "0:1",
              id: "root",
              type: OpCode.UPDATE_OBJECT,
              data: { count: 2 },
            },
          ],
        },
      ],
    ]);

    // Verify state was updated locally
    expect(store.getState().count).toBe(2);
  });

  test("should send UPDATE_STORAGE op when nested count is updated", async () => {
    const { store, socket } = await setupStoreWithStorage();
    expect(store.getState().nested.nestedCount).toBe(13);

    // Clear initial messages
    socket.sentMessages = [];

    // Perform state updates
    store.getState().incrementNested();
    store.getState().incrementNested();
    store.getState().incrementNested();

    // Wait for operation to be sent
    await waitFor(() => socket.sentMessages.length > 0);

    // Verify the WebSocket message
    const sentMessage = socket.sentMessages.map((m) => JSON.parse(m) as Json);
    assertEq(sentMessage, [
      [
        {
          type: ClientMsgCode.UPDATE_STORAGE,
          ops: [
            {
              opId: "0:1",
              id: "0:0",
              parentId: "root",
              parentKey: "nested",
              type: OpCode.CREATE_OBJECT,
              data: { nestedCount: 14 },
            },
          ],
        },
      ],
      [
        {
          type: ClientMsgCode.UPDATE_STORAGE,
          ops: [
            {
              opId: "0:2",
              id: "0:0",
              type: OpCode.UPDATE_OBJECT,
              data: { nestedCount: 15 },
            },
            {
              opId: "0:3",
              id: "0:0",
              type: OpCode.UPDATE_OBJECT,
              data: { nestedCount: 16 },
            },
          ],
        },
      ],
    ]);

    // Verify state was updated locally
    expect(store.getState().nested.nestedCount).toBe(16);
  });
});
