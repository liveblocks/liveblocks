import type { BaseUserMeta, JsonObject } from "@liveblocks/client";
import { createClient } from "@liveblocks/client";
import type {
  RoomStateServerMsg,
  UpdatePresenceServerMsg,
} from "@liveblocks/core";
import { ServerMsgCode } from "@liveblocks/core";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  test,
} from "vitest";
import * as Y from "yjs";

import { LiveblocksYjsProvider } from "..";
import { MockWebSocket, waitFor } from "./_utils";

type UpdateType = { added: string[]; removed: string[]; updated: string[] };

window.WebSocket = MockWebSocket as any;

const server = setupServer(
  http.post("/api/auth", () => {
    return HttpResponse.json({
      token:
        "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJpYXQiOjE2OTAwMzMzMjgsImV4cCI6MTY5MDAzMzMzMywiayI6InNlYy1sZWdhY3kiLCJyb29tSWQiOiJlTFB3dU9tTXVUWEN6Q0dSaTVucm4iLCJhcHBJZCI6IjYyNDFjYjk1ZWQ2ODdkNWRlNWFhYTEzMiIsImFjdG9yIjoxLCJzY29wZXMiOlsicm9vbTp3cml0ZSJdLCJpZCI6InVzZXItMyIsIm1heENvbm5lY3Rpb25zUGVyUm9vbSI6MjB9.QoRc9dJJp-C1LzmQ-S_scHfFsAZ7dBcqep0bUZNyWxEWz_VeBHBBNdJpNs7b7RYRFDBi7RxkywKJlO-gNE8h3wkhebgLQVeSgI3YfTJo7J8Jzj38TzH85ZIbybaiGcxda_sYn3VohDtUHA1k67ns08Q2orJBNr30Gc88jJmc1He_7bLStsDP4M2F1NRMuFuqLULWHnPeEM7jMvLZYkbu3SBeCH4TQGyweu7qAXvP-HHtmvzOi8LdEnpxgxGjxefdu6m4a-fJj6LwoYCGi1rlLDHH9aOHFwYVrBBBVwoeIDSHoAonkPaae9AWM6igJhNt9-ihgEH6sF-qgFiPxHNXdg",
    });
  }),
  http.post("/api/auth-fail", () => {
    return new HttpResponse(null, { status: 400 });
  })
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

afterEach(() => MockWebSocket.reset());
beforeEach(() => MockWebSocket.reset());

async function waitForSocketToBeConnected() {
  await waitFor(() => MockWebSocket.instances.length === 1);

  const socket = MockWebSocket.instances[0]!;
  expect(socket.callbacks.open.length).toBe(1); // Got open callback
  expect(socket.callbacks.message.length).toBe(1); // Got ROOM_STATE message callback

  return socket;
}

describe("presence", () => {
  test("Setting local state should remove local state", async () => {
    const client = createClient({ authEndpoint: "/api/auth" });
    const { room, leave } = client.enterRoom<{ __yjs?: JsonObject }>("room", {
      initialPresence: {},
    });
    await waitForSocketToBeConnected();
    const yDoc = new Y.Doc();
    const yProvider = new LiveblocksYjsProvider(room, yDoc);
    yProvider.awareness.setLocalState({ test: "local state" });
    const presence = room.getSelf()?.presence;
    expect(presence).toHaveProperty("__yjs");
    expect(presence?.__yjs?.test).toBe("local state");
    yProvider.awareness.setLocalState(null);
    const presenceAfterUpdate = room.getSelf()?.presence;
    expect(presenceAfterUpdate?.__yjs).toBe(null);
    leave();
  });

  test("Update handler should be called", async () => {
    const client = createClient({ authEndpoint: "/api/auth" });
    const { room, leave } = client.enterRoom<{ __yjs?: JsonObject }>("room", {
      initialPresence: {},
    });
    await waitForSocketToBeConnected();
    const yDoc = new Y.Doc();
    const yProvider = new LiveblocksYjsProvider(room, yDoc);
    let updatesCalled = 0;
    let update: UpdateType | undefined;
    yProvider.awareness.on("update", (updateArray: UpdateType) => {
      update = updateArray;
      updatesCalled++;
    });
    yProvider.awareness.setLocalState({ test: "local state" });
    expect(updatesCalled).toBe(1);
    expect(update?.added[0]).toBe(yProvider.awareness.doc.clientID);
    leave();
  });

  test("When others update, we should get awareness state correctly and update should be called", async () => {
    const client = createClient({ authEndpoint: "/api/auth" });
    const { room, leave } = client.enterRoom<{ __yjs?: JsonObject }>("room", {
      initialPresence: {},
    });
    const socket = await waitForSocketToBeConnected();
    const yDoc = new Y.Doc();
    const yProvider = new LiveblocksYjsProvider(room, yDoc);
    let updatesCalled = 0;
    let update: UpdateType | undefined;
    yProvider.awareness.on("update", (updateArray: UpdateType) => {
      update = updateArray;
      updatesCalled++;
    });
    socket.callbacks.message[0]!({
      data: JSON.stringify({
        type: ServerMsgCode.ROOM_STATE,
        users: {
          "1": {
            info: { name: "Testy McTester" },
            scopes: ["room:write"],
          },
        },
        actor: 2,
        nonce: "nonce-for-actor-2",
        scopes: ["room:write"],
        meta: {},
      } as RoomStateServerMsg<BaseUserMeta>),
    } as MessageEvent);

    socket.callbacks.message[0]!({
      data: JSON.stringify({
        type: ServerMsgCode.UPDATE_PRESENCE,
        targetActor: -1,
        actor: 1,
        data: {
          __yjs_clientid: 1,
          __yjs: { test: "yjs awareness another user" },
        },
      } as UpdatePresenceServerMsg<JsonObject>),
    } as MessageEvent);

    const states = yProvider.awareness.getStates();
    expect(states.get(1)).toStrictEqual({ test: "yjs awareness another user" });
    expect(updatesCalled).toBe(1);
    expect(update?.added[0]).toBe(1);
    leave();
  });
});
