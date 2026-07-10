import { describe, expect, test } from "vitest";

import {
  createSerializedRoot,
  prepareIsolatedStorageTest,
} from "../../__tests__/_MockWebSocketServer.setup";
import { nn } from "../../lib/assert";
import type { UpdateTextOp } from "../../protocol/Op";
import { OpCode } from "../../protocol/Op";
import type { StorageNode } from "../../protocol/StorageNode";
import { CrdtType } from "../../protocol/StorageNode";
import { createManagedPool } from "../AbstractCrdt";
import { LiveText } from "../LiveText";
import {
  applyTextOperationsToSegments,
  transformTextOperations,
} from "../liveTextOps";

const initialNodes: StorageNode[] = [
  createSerializedRoot(),
  [
    "0:1",
    {
      type: CrdtType.TEXT,
      parentId: "root",
      parentKey: "text",
      data: [["Hello"]],
      version: 0,
    },
  ] as const,
];

describe("LiveText concurrency", () => {
  test("local client rebases remote insert over pending local insert", async () => {
    const { root, applyRemoteOperations } = await prepareIsolatedStorageTest<{
      text: LiveText;
    }>(initialNodes, 0);

    const text = root.get("text");
    text.insert(0, "A");

    applyRemoteOperations([
      {
        type: OpCode.UPDATE_TEXT,
        id: "0:1",
        baseVersion: 0,
        version: 1,
        ops: [{ type: "insert", index: 0, text: "B" }],
      },
    ]);

    // The remote insert was accepted by the server first, so on a same-index
    // tie it stays left of our still-pending local insert. This matches the
    // outcome on the server (and on every other client).
    expect(text.toString()).toBe("BAHello");
    expect(text.toJSON()).toEqual([["BAHello"]]);
  });

  test("local client rebases remote delete over pending local insert", async () => {
    const { root, applyRemoteOperations } = await prepareIsolatedStorageTest<{
      text: LiveText;
    }>(initialNodes, 0);

    const text = root.get("text");
    text.insert(0, "Hi");

    applyRemoteOperations([
      {
        type: OpCode.UPDATE_TEXT,
        id: "0:1",
        baseVersion: 0,
        version: 1,
        ops: [{ type: "delete", index: 0, length: 2 }],
      },
    ]);

    expect(text.toString()).toBe("Hillo");
  });

  test("transform and apply converge for overlapping delete operations", () => {
    const segments = [{ text: "Hello" }];
    const accepted = [{ type: "delete" as const, index: 0, length: 2 }];
    const transformed = transformTextOperations(
      [{ type: "delete", index: 0, length: 2 }],
      accepted,
      "after"
    );

    expect(
      applyTextOperationsToSegments(
        applyTextOperationsToSegments(segments, accepted),
        transformed
      )
    ).toEqual(applyTextOperationsToSegments(segments, accepted));
  });

  test("transform shifts format ranges over accepted inserts", () => {
    expect(
      transformTextOperations(
        [{ type: "format", index: 1, length: 2, attributes: { bold: true } }],
        [{ type: "insert", index: 0, text: "A" }],
        "after"
      )
    ).toEqual([
      { type: "format", index: 2, length: 2, attributes: { bold: true } },
    ]);
  });
});

describe("LiveText acknowledgement", () => {
  test("undo of an acknowledged insert emits current-version operations", () => {
    let insertOpId = "";
    let undoOps: UpdateTextOp[] = [];
    const pool = createManagedPool("room", {
      getCurrentConnectionId: () => 0,
      onDispatch: (ops, reverse) => {
        insertOpId = ops[0]?.opId ?? insertOpId;
        undoOps = reverse as UpdateTextOp[];
      },
    });
    const text = new LiveText("Hello");
    text._attach("0:1", pool);

    text.insert(5, " world");
    expect(text.toString()).toBe("Hello world");

    text._apply(
      {
        type: OpCode.UPDATE_TEXT,
        id: "0:1",
        opId: insertOpId,
        baseVersion: 0,
        version: 1,
        ops: [{ type: "insert", index: 5, text: " world" }],
      },
      false
    );

    const undoOp = undoOps[0];
    if (undoOp === undefined) {
      throw new Error("Expected undo operation");
    }

    const outgoingUndoOp = { ...undoOp, opId: "undo" };
    text._apply(outgoingUndoOp, true);

    expect(outgoingUndoOp).toMatchObject({
      baseVersion: 1,
      ops: [{ type: "delete", index: 5, length: 6 }],
    });
    expect(text.toString()).toBe("Hello");
  });

  test("acknowledgement preserves state after concurrent remote edits", () => {
    let acknowledgedOpId = "";
    const pool = createManagedPool("room", {
      getCurrentConnectionId: () => 0,
      onDispatch: (ops) => {
        acknowledgedOpId = ops[0]?.opId ?? "";
      },
    });
    const text = new LiveText("Hello");
    text._attach("0:1", pool);

    text.insert(0, "A");
    expect(text.toString()).toBe("AHello");
    expect(acknowledgedOpId).not.toBe("");

    text._apply(
      {
        type: OpCode.UPDATE_TEXT,
        id: "0:1",
        baseVersion: 0,
        version: 1,
        ops: [{ type: "insert", index: 0, text: "B" }],
      },
      false
    );

    // The remote insert was accepted first, so it wins the same-index tie.
    expect(text.toString()).toBe("BAHello");

    // The server acknowledges our op with its authoritative (rebased) form:
    // our insert was shifted right over the accepted remote insert.
    text._apply(
      {
        type: OpCode.UPDATE_TEXT,
        id: "0:1",
        opId: acknowledgedOpId,
        baseVersion: 1,
        version: 2,
        ops: [{ type: "insert", index: 1, text: "A" }],
      },
      false
    );

    expect(text.toString()).toBe("BAHello");
    expect(text.toJSON()).toEqual([["BAHello"]]);
    expect(text.version).toBe(2);
  });

  test("acknowledgement applies server-rebased operations", () => {
    let acknowledgedOpId = "";
    let undoOps: UpdateTextOp[] = [];
    const pool = createManagedPool("room", {
      getCurrentConnectionId: () => 0,
      onDispatch: (ops, reverse) => {
        acknowledgedOpId = ops[0]?.opId ?? "";
        undoOps = reverse as UpdateTextOp[];
      },
    });
    const text = new LiveText("Hello");
    text._attach("0:1", pool);

    text.delete(0, 2);
    expect(text.toString()).toBe("llo");
    expect(acknowledgedOpId).not.toBe("");

    text._apply(
      {
        type: OpCode.UPDATE_TEXT,
        id: "0:1",
        baseVersion: 0,
        version: 1,
        ops: [{ type: "insert", index: 0, text: "A" }],
      },
      false
    );

    expect(text.toString()).toBe("Allo");

    text._apply(
      {
        type: OpCode.UPDATE_TEXT,
        id: "0:1",
        opId: acknowledgedOpId,
        baseVersion: 1,
        version: 2,
        ops: [{ type: "delete", index: 1, length: 2 }],
      },
      false
    );

    expect(text.toString()).toBe("Allo");
    expect(text.toJSON()).toEqual([["Allo"]]);

    const undoOp = undoOps[0];
    if (undoOp === undefined) {
      throw new Error("Expected undo operation");
    }

    const outgoingUndoOp = { ...undoOp, opId: "undo" };
    text._apply(outgoingUndoOp, true);

    expect(outgoingUndoOp).toMatchObject({
      baseVersion: 2,
      ops: [{ type: "insert", index: 1, text: "He" }],
    });
    expect(text.toString()).toBe("AHello");
  });

  test("queues local edits behind the in-flight op and flushes them on ack", () => {
    const dispatched: UpdateTextOp[] = [];
    const pool = createManagedPool("room", {
      getCurrentConnectionId: () => 0,
      onDispatch: (ops) => {
        for (const op of ops) {
          if (op.type === OpCode.UPDATE_TEXT) {
            dispatched.push(op);
          }
        }
      },
    });
    const text = new LiveText("Hello");
    text._attach("0:1", pool);

    text.insert(0, "A");
    text.insert(6, "!");
    expect(text.toString()).toBe("AHello!");

    // Only the first edit goes on the wire; the second is queued behind it
    // (one in-flight op at a time keeps wire ops in server coordinates).
    expect(dispatched).toHaveLength(1);
    expect(dispatched[0]).toMatchObject({
      baseVersion: 0,
      ops: [{ type: "insert", index: 0, text: "A" }],
    });

    text._apply(
      {
        type: OpCode.UPDATE_TEXT,
        id: "0:1",
        opId: nn(dispatched[0]?.opId),
        baseVersion: 0,
        version: 1,
        ops: [{ type: "insert", index: 0, text: "A" }],
      },
      false
    );

    expect(text.toString()).toBe("AHello!");
    expect(text.version).toBe(1);

    // The ack flushed the queued edit as the next in-flight op.
    expect(dispatched).toHaveLength(2);
    expect(dispatched[1]).toMatchObject({
      baseVersion: 1,
      ops: [{ type: "insert", index: 6, text: "!" }],
    });

    text._apply(
      {
        type: OpCode.UPDATE_TEXT,
        id: "0:1",
        opId: nn(dispatched[1]?.opId),
        baseVersion: 1,
        version: 2,
        ops: [{ type: "insert", index: 6, text: "!" }],
      },
      false
    );

    expect(text.toString()).toBe("AHello!");
    expect(text.version).toBe(2);
  });

  test("batched queued LiveText edit clears the redo stack", async () => {
    const { room, root } = await prepareIsolatedStorageTest<{
      text: LiveText;
    }>(initialNodes, 0);

    const text = root.get("text");

    // First insert sends UPDATE_TEXT (in-flight).
    room.batch(() => {
      text.insert(5, "!");
    });
    expect(text.toString()).toBe("Hello!");

    room.history.undo();
    expect(text.toString()).toBe("Hello");
    expect(room.history.canRedo()).toBe(true);

    room.history.pause();
    // Second insert while the first UPDATE_TEXT is still in-flight queues
    // with empty ops + clearRedoStack: true inside the batch.
    room.batch(() => {
      text.insert(5, "?");
    });
    expect(text.toString()).toBe("Hello?");
    expect(room.history.canRedo()).toBe(false);

    room.history.resume();
    expect(room.history.canUndo()).toBe(true);

    room.history.undo();
    expect(text.toString()).toBe("Hello");

    room.history.redo();
    expect(text.toString()).toBe("Hello?");
    expect(room.history.canRedo()).toBe(false);
  });
});
