/**
 * LiveFile tests that use the MockWebSocket server to exercise the complete
 * core Storage lifecycle with deterministic wire acknowledgements and
 * conflicts.
 */
import { describe, expect, test } from "vitest";

import {
  createSerializedRoot,
  parseAsClientMsgs,
  prepareIsolatedStorageTest,
  prepareStorageTest,
} from "../../__tests__/_MockWebSocketServer.setup";
import { ClientMsgCode } from "../../protocol/ClientMsg";
import { OpCode } from "../../protocol/Op";
import type { FileStorageNode } from "../../protocol/StorageNode";
import { CrdtType } from "../../protocol/StorageNode";
import { LiveFile, type LiveFileData } from "../LiveFile";

const FIRST_FILE: LiveFileData = {
  id: "fl_123456789012345678901",
  name: "first.txt",
  size: 5,
  mimeType: "text/plain",
};

const SECOND_FILE: LiveFileData = {
  id: "fl_abcdefghijklmnopqrstu",
  name: "second.png",
  size: 13,
  mimeType: "image/png",
};

const THIRD_FILE: LiveFileData = {
  id: "fl_ZYXWVUTSRQPONMLKJIHGF",
  name: "third.pdf",
  size: 21,
  mimeType: "application/pdf",
};

describe("LiveFile", () => {
  test("hydrates from a remote Storage snapshot", async () => {
    const serializedFile: FileStorageNode = [
      "0:1",
      {
        type: CrdtType.FILE,
        parentId: "root",
        parentKey: "file",
        data: FIRST_FILE,
      },
    ];
    const { root } = await prepareIsolatedStorageTest<{ file: LiveFile }>([
      createSerializedRoot(),
      serializedFile,
    ]);

    const file = root.get("file");
    expect(file).toBeInstanceOf(LiveFile);
    expect(file.data).toEqual(FIRST_FILE);
  });

  test("inserts, acknowledges, hydrates a peer, and supports undo/redo", async () => {
    const {
      room,
      operations,
      storage,
      refStorage,
      expectStorage,
      assertUndoRedo,
    } = await prepareStorageTest<{ file?: LiveFile }>(
      [createSerializedRoot()],
      1
    );
    expectStorage({});

    const file = new LiveFile(FIRST_FILE);
    storage.root.set("file", file);
    expectStorage({ file: FIRST_FILE });

    const peerFile = refStorage.root.get("file");
    expect(storage.root.get("file")).toBe(file);
    expect(peerFile).toBeInstanceOf(LiveFile);
    expect(peerFile).not.toBe(file);
    expect(peerFile?.data).toEqual(FIRST_FILE);

    expect(operations).toHaveLength(1);
    expect(operations[0]).toMatchObject({
      type: OpCode.CREATE_FILE,
      parentId: "root",
      parentKey: "file",
      data: FIRST_FILE,
    });
    expect(operations[0]?.opId).toBeDefined();
    expect(room.getStorageStatus()).toBe("synchronized");

    assertUndoRedo();
  });

  test("keeps a local unacknowledged file during a concurrent remote edit", async () => {
    const { root, room, wss, expectStorage, applyRemoteOperations } =
      await prepareIsolatedStorageTest<{ file?: LiveFile }>(
        [createSerializedRoot()],
        1
      );

    root.set("file", new LiveFile(FIRST_FILE));
    expectStorage({ file: FIRST_FILE });

    const lastSentMessage =
      wss.receivedMessagesRaw[wss.receivedMessagesRaw.length - 1];
    if (lastSentMessage === undefined) {
      throw new Error("Expected a LiveFile Storage operation");
    }

    const updateMessage = parseAsClientMsgs(lastSentMessage).find(
      (message) => message.type === ClientMsgCode.UPDATE_STORAGE
    );
    const localCreateOp = updateMessage?.ops.find(
      (op) => op.type === OpCode.CREATE_FILE
    );
    if (localCreateOp === undefined) {
      throw new Error("Expected a CREATE_FILE operation");
    }

    applyRemoteOperations([
      {
        type: OpCode.CREATE_FILE,
        id: "2:0",
        parentId: "root",
        parentKey: "file",
        data: SECOND_FILE,
      },
    ]);
    expectStorage({ file: FIRST_FILE });

    applyRemoteOperations([localCreateOp]);
    expect(room.getStorageStatus()).toBe("synchronized");
    expectStorage({ file: FIRST_FILE });

    applyRemoteOperations([
      {
        type: OpCode.CREATE_FILE,
        id: "2:1",
        parentId: "root",
        parentKey: "file",
        data: THIRD_FILE,
      },
    ]);
    expectStorage({ file: THIRD_FILE });
    expect(root.get("file")).toBeInstanceOf(LiveFile);
  });
});
