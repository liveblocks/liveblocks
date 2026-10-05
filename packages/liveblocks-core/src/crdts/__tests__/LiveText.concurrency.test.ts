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
    const pool = createManagedPool({
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
      { origin: "local", via: "edit", optimistic: false }
    );

    const undoOp = undoOps[0];
    if (undoOp === undefined) {
      throw new Error("Expected undo operation");
    }

    const outgoingUndoOp = { ...undoOp, opId: "undo" };
    text._apply(outgoingUndoOp, {
      origin: "local",
      via: "edit",
      optimistic: true,
    });

    expect(outgoingUndoOp).toMatchObject({
      baseVersion: 1,
      ops: [{ type: "delete", index: 5, length: 6 }],
    });
    expect(text.toString()).toBe("Hello");
  });

  test("acknowledgement preserves state after concurrent remote edits", () => {
    let acknowledgedOpId = "";
    const pool = createManagedPool({
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
      { origin: "remote" }
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
      { origin: "local", via: "edit", optimistic: false }
    );

    expect(text.toString()).toBe("BAHello");
    expect(text.toJSON()).toEqual([["BAHello"]]);
    expect(text.version).toBe(2);
  });

  test("acknowledgement applies server-rebased operations", () => {
    let acknowledgedOpId = "";
    let undoOps: UpdateTextOp[] = [];
    const pool = createManagedPool({
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
      { origin: "remote" }
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
      { origin: "local", via: "edit", optimistic: false }
    );

    expect(text.toString()).toBe("Allo");
    expect(text.toJSON()).toEqual([["Allo"]]);

    const undoOp = undoOps[0];
    if (undoOp === undefined) {
      throw new Error("Expected undo operation");
    }

    const outgoingUndoOp = { ...undoOp, opId: "undo" };
    text._apply(outgoingUndoOp, {
      origin: "local",
      via: "edit",
      optimistic: true,
    });

    expect(outgoingUndoOp).toMatchObject({
      baseVersion: 2,
      ops: [{ type: "insert", index: 1, text: "He" }],
    });
    expect(text.toString()).toBe("AHello");
  });

  test("queues local edits behind the in-flight op and flushes them on ack", () => {
    const dispatched: UpdateTextOp[] = [];
    const pool = createManagedPool({
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
      { origin: "local", via: "edit", optimistic: false }
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
      { origin: "local", via: "edit", optimistic: false }
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

describe("LiveText reconnect acknowledgements", () => {
  function prepareLostAcknowledgement() {
    const dispatched: UpdateTextOp[] = [];
    const pool = createManagedPool({
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
    text.insert(5, "!");
    const original = nn(dispatched[0]);
    // The server stored this exact op, but its acknowledgement was lost.
    // Keep the stored operation separate from its mutable replay envelope.
    const acknowledgement: UpdateTextOp = {
      ...original,
      version: 1,
      history: [{ version: 1, ops: original.ops }],
    };
    return { text, dispatched, acknowledgement };
  }

  test("a deduplicated acknowledgement reconciles remote snapshot edits", () => {
    const { text, dispatched, acknowledgement } = prepareLostAcknowledgement();
    nn(acknowledgement.history).push({
      version: 2,
      ops: [{ type: "insert", index: 0, text: "Remote " }],
    });
    text._resyncText([["Remote Hello!"]], 2, { origin: "remote" });
    text._apply(nn(dispatched[0]), {
      origin: "local",
      via: "edit",
      optimistic: true,
    });
    text._apply(acknowledgement, {
      origin: "local",
      via: "edit",
      optimistic: false,
    });

    expect(text.toString()).toBe("Remote Hello!");
  });

  test("a historyless replay acknowledgement requests a storage resync", () => {
    const { text, dispatched } = prepareLostAcknowledgement();
    text._resyncText([["Hello!"]], 1, { origin: "remote" });
    const replay = nn(dispatched[0]);
    text._apply(replay, {
      origin: "local",
      via: "edit",
      optimistic: true,
    });
    const historylessAck = { ...replay, version: 1 };

    expect(
      text._apply(historylessAck, {
        origin: "local",
        via: "edit",
        optimistic: false,
      })
    ).toEqual({ modified: false, needsStorageResync: true });

    text._resyncText([["Hello!"]], 1, { origin: "remote" });
    expect(text.toString()).toBe("Hello!");
    expect(text.version).toBe(1);
  });

  test("repeated reconnects preserve edits queued behind a stored op", () => {
    const { text, dispatched, acknowledgement } = prepareLostAcknowledgement();
    text.insert(0, "A");

    // Lose the replay's acknowledgement too, forcing the same op to replay
    // twice while the queued edit must survive both connection losses.
    for (let attempt = 0; attempt < 2; attempt++) {
      text._resyncText([["Hello!"]], 1, { origin: "remote" });
      text._apply(nn(dispatched[0]), {
        origin: "local",
        via: "edit",
        optimistic: true,
      });
    }
    text._apply(acknowledgement, {
      origin: "local",
      via: "edit",
      optimistic: false,
    });

    // Only a fresh opId can persist the edits ignored by server deduplication.
    const server = applyTextOperationsToSegments(
      [{ text: "Hello!" }],
      dispatched.slice(1).flatMap((op) => op.ops)
    );
    expect(server.map((segment) => segment.text).join("")).toBe("AHello!");
    expect(text.toString()).toBe("AHello!");
  });

  test("rebases the restored queue when the stored op was itself rebased", () => {
    const { text, dispatched, acknowledgement } = prepareLostAcknowledgement();
    text.insert(6, "?");
    // The server accepted a remote prefix before our in-flight "!", but the
    // client received neither operation before the connection was lost.
    text._resyncText([["Remote Hello!"]], 2, { origin: "remote" });
    text._apply(nn(dispatched[0]), {
      origin: "local",
      via: "edit",
      optimistic: true,
    });
    text._apply(
      {
        ...acknowledgement,
        baseVersion: 1,
        version: 2,
        ops: [{ type: "insert", index: 12, text: "!" }],
        history: [
          { version: 1, ops: [{ type: "insert", index: 0, text: "Remote " }] },
          { version: 2, ops: [{ type: "insert", index: 12, text: "!" }] },
        ],
      },
      { origin: "local", via: "edit", optimistic: false }
    );

    // Evaluate recovery against the server's actual accepted history, rather
    // than assuming the resent queue already uses snapshot coordinates.
    const history = [
      { version: 1, ops: [{ type: "insert", index: 0, text: "Remote " }] },
      { version: 2, ops: [{ type: "insert", index: 12, text: "!" }] },
    ] satisfies { version: number; ops: UpdateTextOp["ops"] }[];
    let server = [{ text: "Remote Hello!" }];
    for (const op of dispatched.slice(1)) {
      let ops = op.ops;
      for (const accepted of history) {
        if (accepted.version > op.baseVersion) {
          ops = transformTextOperations(ops, accepted.ops, "after");
        }
      }
      server = applyTextOperationsToSegments(server, ops);
    }
    expect(server.map((segment) => segment.text).join("")).toBe(
      "Remote Hello!?"
    );
  });

  test("preserves edit order when typing before the duplicate ack arrives", () => {
    const { text, dispatched, acknowledgement } = prepareLostAcknowledgement();
    text.insert(0, "A");
    text._resyncText([["Hello!"]], 1, { origin: "remote" });
    text._apply(nn(dispatched[0]), {
      origin: "local",
      via: "edit",
      optimistic: true,
    });
    // This deletion cancels the queued insertion, not the original "H".
    text.delete(0, 1);
    text._apply(acknowledgement, {
      origin: "local",
      via: "edit",
      optimistic: false,
    });

    const server = applyTextOperationsToSegments(
      [{ text: "Hello!" }],
      dispatched.slice(1).flatMap((op) => op.ops)
    );
    expect(server.map((segment) => segment.text).join("")).toBe("Hello!");
    expect(text.toString()).toBe("Hello!");
  });

  test("buffers post-snapshot remote edits until their missing predecessors arrive", () => {
    const { text, dispatched, acknowledgement } = prepareLostAcknowledgement();
    text._resyncText([["Remote Hello!"]], 2, { origin: "remote" });
    text._apply(nn(dispatched[0]), {
      origin: "local",
      via: "edit",
      optimistic: true,
    });
    text._apply(
      {
        type: OpCode.UPDATE_TEXT,
        id: "0:1",
        baseVersion: 2,
        version: 3,
        ops: [{ type: "delete", index: 7, length: 5 }],
      },
      { origin: "remote" }
    );
    text.insert(6, "?");
    nn(acknowledgement.history).push(
      { version: 2, ops: [{ type: "insert", index: 0, text: "Remote " }] },
      { version: 3, ops: [{ type: "delete", index: 7, length: 5 }] }
    );
    text._apply(acknowledgement, {
      origin: "local",
      via: "edit",
      optimistic: false,
    });

    expect(text.toString()).toBe("Remote !?");
    const queued = nn(dispatched[1]);
    const acceptedOps = nn(acknowledgement.history)
      .filter((entry) => entry.version > queued.baseVersion)
      .flatMap((entry) => entry.ops);
    const ops = transformTextOperations(queued.ops, acceptedOps, "after");
    const server = applyTextOperationsToSegments([{ text: "Remote !" }], ops);
    expect(server.map((segment) => segment.text).join("")).toBe("Remote !?");
    text._apply(
      { ...queued, baseVersion: 3, version: 4, ops },
      {
        origin: "local",
        via: "edit",
        optimistic: false,
      }
    );
    expect(text.toString()).toBe("Remote !?");
  });

  test("replays a history operation from the confirmed version loaded by a snapshot", () => {
    const text = new LiveText("Hello", 7);
    text._attach("0:1", createManagedPool({ getCurrentConnectionId: () => 0 }));
    const undo: UpdateTextOp = {
      type: OpCode.UPDATE_TEXT,
      id: "0:1",
      opId: "0:undo",
      baseVersion: 7,
      ops: [{ type: "delete", index: 4, length: 1 }],
    };
    text._apply(undo, { origin: "local", via: "undo", optimistic: true });
    text._resyncText([["Remote Hello"]], 8, { origin: "remote" });
    text._apply(undo, { origin: "local", via: "undo", optimistic: true });

    const remote = [
      { type: "insert", index: 0, text: "Remote " },
    ] satisfies UpdateTextOp["ops"];
    // Server history older than the loaded version must not be rebased again.
    const history = [
      { version: 7, ops: [{ type: "insert", index: 0, text: "Hello" }] },
      { version: 8, ops: remote },
    ] satisfies NonNullable<UpdateTextOp["history"]>;
    const missed = history.filter((entry) => entry.version > undo.baseVersion);
    const ops = transformTextOperations(
      undo.ops,
      missed.flatMap((entry) => entry.ops),
      "after"
    );
    const server = applyTextOperationsToSegments(
      [{ text: "Remote Hello" }],
      ops
    );
    expect(server.map((segment) => segment.text).join("")).toBe("Remote Hell");
    text._apply(
      { ...undo, baseVersion: 8, version: 9, ops, history: missed },
      {
        origin: "local",
        via: "undo",
        optimistic: false,
      }
    );
    expect(text.toString()).toBe("Remote Hell");
  });
});
