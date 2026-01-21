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

// Access token with perms: { "*": ["room:write"] }
const accessToken =
  "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJpYXQiOjE2NjQ1NjY0MTAsImV4cCI6MTY2NDU3MDAxMCwicGlkIjoiNjA1YTRmZDMxYTM2ZDVlYTdhMmUwOGYxIiwidWlkIjoidXNlcjEiLCJwZXJtcyI6eyIqIjpbInJvb206d3JpdGUiXX0sImsiOiJhY2MifQ.OwLJdtVzMmIwIGO4gVWEJSng3DaUFsljpFXKE0Jcl1OTSHKCpDqJDkHMkkhgHmpUbBPMMdf8QmYa-4h4tMAikxzZL_tFdWQ-5kr92jOFqXPscDQTk0_GCMhv7R6vFj4YjT-msYVNVPI5M0Jlmm9fU5U_s3ZssEYhQl6AYkZT0XErrFYch8WmCVCIQ3bmFuUg5WDtnGJFiQIuCvLr0RyalJh4aILKPZ7ii_u9Q04__rN5kUhIqh2NaXWqFwsITuKaFwn24PJfBz-GJNX5Jk-tlmfJItkPFuBFp3WY8J9r9m59rJF35W_UxMU1tBNYVYRs8c3pjJKdnBiSUDUjNPvxrA";

const server = setupServer(
  http.post("/api/auth", () => {
    return HttpResponse.json({ token: accessToken });
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
