import type { JsonObject } from "@liveblocks/client";
import { createClient } from "@liveblocks/client";
import { describe, expect, onTestFinished, test } from "vitest";
import * as Y from "yjs";

import { LiveblocksYjsProvider } from "..";
import { waitFor } from "./_utils";

const DEV_SERVER_PORT = 1154;

type UpdateType = { added: string[]; removed: string[]; updated: string[] };

/**
 * getSelf() is null until both auth and the ROOM_STATE message have been fully
 * processed. With a real server, there's a brief async gap after the room
 * status becomes "connected" before self is assembled.
 */
async function waitForSelf(
  room: ReturnType<ReturnType<typeof createClient>["enterRoom"]>["room"]
): Promise<void> {
  await waitFor(() => room.getSelf() !== null);
}

function createDevServerClient() {
  return createClient({
    publicApiKey: "pk_localdev",
    baseUrl: `http://localhost:${DEV_SERVER_PORT}`,
    polyfills: {
      WebSocket: globalThis.WebSocket,
    },
  });
}

describe("presence (dev server)", () => {
  test("Setting local state should remove local state", async () => {
    const client = createDevServerClient();
    const roomId = `test-room-${crypto.randomUUID()}`;
    const { room, leave } = client.enterRoom<{ __yjs?: JsonObject }>(roomId, {
      initialPresence: {},
    });
    onTestFinished(leave);

    await waitForSelf(room);

    const yDoc = new Y.Doc();
    const yProvider = new LiveblocksYjsProvider(room, yDoc);

    yProvider.awareness.setLocalState({ test: "local state" });
    const presence = room.getSelf()?.presence;
    expect(presence).toHaveProperty("__yjs");
    expect(presence?.__yjs?.test).toBe("local state");

    yProvider.awareness.setLocalState(null);
    const presenceAfterUpdate = room.getSelf()?.presence;
    expect(presenceAfterUpdate?.__yjs).toBe(null);
  });

  test("Update handler should be called", async () => {
    const client = createDevServerClient();
    const roomId = `test-room-${crypto.randomUUID()}`;
    const { room, leave } = client.enterRoom<{ __yjs?: JsonObject }>(roomId, {
      initialPresence: {},
    });
    onTestFinished(leave);

    await waitForSelf(room);

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
  });

  test("When others update, we should get awareness state correctly and update should be called", async () => {
    const roomId = `test-room-${crypto.randomUUID()}`;

    // Client A
    const clientA = createDevServerClient();
    const { room: roomA, leave: leaveA } = clientA.enterRoom<{
      __yjs?: JsonObject;
    }>(roomId, { initialPresence: {} });
    onTestFinished(leaveA);
    await waitForSelf(roomA);

    const yDocA = new Y.Doc();
    const yProviderA = new LiveblocksYjsProvider(roomA, yDocA);

    const updates: UpdateType[] = [];
    yProviderA.awareness.on("update", (updateArray: UpdateType) => {
      updates.push(updateArray);
    });

    // Client B joins the same room and sets awareness
    const clientB = createDevServerClient();
    const { room: roomB, leave: leaveB } = clientB.enterRoom<{
      __yjs?: JsonObject;
    }>(roomId, { initialPresence: {} });
    onTestFinished(leaveB);
    await waitForSelf(roomB);

    const yDocB = new Y.Doc();
    const yProviderB = new LiveblocksYjsProvider(roomB, yDocB);
    yProviderB.awareness.setLocalState({ test: "yjs awareness another user" });

    // Wait for client A to see client B's awareness state
    await waitFor(() => yProviderA.awareness.getStates().size >= 1);

    const states = yProviderA.awareness.getStates();
    expect(states.get(yDocB.clientID)).toStrictEqual({
      test: "yjs awareness another user",
    });
    expect(updates.length).toBeGreaterThanOrEqual(1);
    // Client B's clientID should appear in add or update events (with a real
    // server, the "enter" event fires before __yjs_clientid is in presence,
    // so the clientID first appears in an "update" event, not "added")
    const allMentioned = updates.flatMap((u) => [...u.added, ...u.updated]);
    expect(allMentioned).toContain(yDocB.clientID);
  });
});
