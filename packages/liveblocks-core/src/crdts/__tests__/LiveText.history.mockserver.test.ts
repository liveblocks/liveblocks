import { describe, expect, test, vi } from "vitest";

import type { MockWebSocketServer } from "../../__tests__/_MockWebSocketServer";
import {
  createSerializedRoot,
  parseAsClientMsgs,
  prepareIsolatedStorageTest,
  replaceRemoteStorageAndReconnect,
} from "../../__tests__/_MockWebSocketServer.setup";
import { waitUntilStatus } from "../../__tests__/_waitUtils";
import { ClientMsgCode } from "../../protocol/ClientMsg";
import type { ClientWireOp, CreateTextOp } from "../../protocol/Op";
import { OpCode } from "../../protocol/Op";
import type { StorageNode } from "../../protocol/StorageNode";
import { CrdtType } from "../../protocol/StorageNode";
import type { LiveText } from "../LiveText";

const OLD_TEXT_ID = "0:1";
const initialNodes: StorageNode[] = [
  createSerializedRoot(),
  [
    OLD_TEXT_ID,
    {
      type: CrdtType.TEXT,
      parentId: "root",
      parentKey: "text",
      data: [["Hello"]],
      version: 7,
    },
  ],
];

function getStorageOps(wss: MockWebSocketServer): ClientWireOp[] {
  return wss.receivedMessagesRaw.flatMap((raw) =>
    parseAsClientMsgs(raw).flatMap((message) =>
      message.type === ClientMsgCode.UPDATE_STORAGE ? message.ops : []
    )
  );
}

function getCreateTextOps(wss: MockWebSocketServer): CreateTextOp[] {
  return getStorageOps(wss).filter(
    (op): op is ClientWireOp & CreateTextOp => op.type === OpCode.CREATE_TEXT
  );
}

describe("LiveText history lifetimes", () => {
  test("delete then undo creates a fresh text ID at version 0", async () => {
    const { root, room, wss } = await prepareIsolatedStorageTest<{
      text?: LiveText;
    }>(initialNodes, 1);

    root.delete("text");
    room.history.undo();

    const createOp = getCreateTextOps(wss).at(-1);
    expect(createOp).toMatchObject({
      type: OpCode.CREATE_TEXT,
      parentId: "root",
      parentKey: "text",
      data: [["Hello"]],
      version: 0,
    });
    expect(createOp?.id).not.toBe(OLD_TEXT_ID);

    room.history.redo();
    expect(root.get("text")).toBeUndefined();
  });

  test("every undo after a redo creates a new text lifetime", async () => {
    const { root, room, wss } = await prepareIsolatedStorageTest<{
      text?: LiveText;
    }>(initialNodes, 1);

    root.delete("text");

    for (let i = 0; i < 3; i++) {
      room.history.undo();
      room.history.redo();
    }

    const createOps = getCreateTextOps(wss);
    expect(createOps).toHaveLength(3);
    expect(createOps.every((op) => op.version === 0)).toBe(true);
    expect(new Set(createOps.map((op) => op.id)).size).toBe(3);
    expect(createOps.map((op) => op.id)).not.toContain(OLD_TEXT_ID);
  });

  test("a pending update for the deleted ID cannot affect the restored text", async () => {
    const { root, room, wss, applyRemoteOperations } =
      await prepareIsolatedStorageTest<{ text?: LiveText }>(initialNodes, 1);

    root.get("text")?.insert(5, "!");
    const pendingUpdate = getStorageOps(wss).find(
      (op) => op.type === OpCode.UPDATE_TEXT && op.id === OLD_TEXT_ID
    );
    if (pendingUpdate?.type !== OpCode.UPDATE_TEXT) {
      throw new Error("Expected a pending UPDATE_TEXT operation");
    }

    root.delete("text");
    room.history.undo();

    const restoredText = root.get("text");
    const restoredId = getCreateTextOps(wss).at(-1)?.id;
    expect(restoredText?.toString()).toBe("Hello!");
    expect(restoredId).toBeDefined();
    expect(restoredId).not.toBe(OLD_TEXT_ID);

    applyRemoteOperations([{ ...pendingUpdate, version: 8 }]);
    applyRemoteOperations([
      {
        type: OpCode.UPDATE_TEXT,
        id: OLD_TEXT_ID,
        baseVersion: 0,
        version: 1,
        ops: [{ type: "insert", index: 0, text: "stale" }],
      },
    ]);

    expect(root.get("text")).toBe(restoredText);
    expect(restoredText?.toString()).toBe("Hello!");
  });

  test("reconnect replay preserves the restored text ID", async () => {
    const { root, room, wss } = await prepareIsolatedStorageTest<{
      text?: LiveText;
    }>(initialNodes, 1);

    root.delete("text");
    room.history.undo();
    const restoredCreate = getCreateTextOps(wss).at(-1);
    if (restoredCreate === undefined) {
      throw new Error("Expected a restored CREATE_TEXT operation");
    }

    // Detach the restored node again so replay sees a CREATE_TEXT whose ID is
    // absent from the pool. Its existing opId is what distinguishes replay
    // from a new restoration.
    room.history.redo();
    const messagesBeforeReconnect = wss.receivedMessagesRaw.length;

    replaceRemoteStorageAndReconnect(wss, [createSerializedRoot()]);
    await waitUntilStatus(room, "connected");

    await vi.waitFor(() => {
      const replayedCreate = wss.receivedMessagesRaw
        .slice(messagesBeforeReconnect)
        .flatMap(parseAsClientMsgs)
        .flatMap((message) =>
          message.type === ClientMsgCode.UPDATE_STORAGE ? message.ops : []
        )
        .find((op) => op.type === OpCode.CREATE_TEXT);

      expect(replayedCreate).toMatchObject({
        id: restoredCreate.id,
        opId: restoredCreate.opId,
        version: 0,
      });
    });
  });
});
