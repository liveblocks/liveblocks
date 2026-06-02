import { describe, expect, test } from "vitest";

import {
  createSerializedRoot,
  prepareIsolatedStorageTest,
} from "../../__tests__/_MockWebSocketServer.setup";
import { OpCode } from "../../protocol/Op";
import type { StorageNode } from "../../protocol/StorageNode";
import { CrdtType } from "../../protocol/StorageNode";
import { createManagedPool } from "../AbstractCrdt";
import { LiveText } from "../LiveText";
import {
  applyTextOperationsToSegments,
  rebaseTextOperations,
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

    expect(text.toString()).toBe("ABHello");
    expect(text.toJSON()).toEqual([["ABHello"]]);
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

  test("rebase and apply converge for overlapping delete operations", () => {
    const segments = [{ text: "Hello" }];
    const accepted = [{ type: "delete" as const, index: 0, length: 2 }];
    const rebased = rebaseTextOperations(
      [{ type: "delete", index: 0, length: 2 }],
      accepted
    );

    expect(
      applyTextOperationsToSegments(
        applyTextOperationsToSegments(segments, accepted),
        rebased
      )
    ).toEqual(applyTextOperationsToSegments(segments, accepted));
  });

  test("rebase shifts format ranges over accepted inserts", () => {
    expect(
      rebaseTextOperations(
        [{ type: "format", index: 1, length: 2, attributes: { bold: true } }],
        [{ type: "insert", index: 0, text: "A" }]
      )
    ).toEqual([
      { type: "format", index: 2, length: 2, attributes: { bold: true } },
    ]);
  });
});

describe("LiveText acknowledgement", () => {
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

    expect(text.toString()).toBe("ABHello");

    text._apply(
      {
        type: OpCode.UPDATE_TEXT,
        id: "0:1",
        opId: acknowledgedOpId,
        baseVersion: 0,
        version: 2,
        ops: [{ type: "insert", index: 0, text: "A" }],
      },
      false
    );

    expect(text.toString()).toBe("ABHello");
    expect(text.toJSON()).toEqual([["ABHello"]]);
  });

  test("re-applies acknowledged operations when multiple local edits are pending", () => {
    let firstOpId = "";
    let secondOpId = "";
    const pool = createManagedPool("room", {
      getCurrentConnectionId: () => 0,
      onDispatch: (ops) => {
        if (firstOpId === "") {
          firstOpId = ops[0]?.opId ?? "";
        } else if (secondOpId === "") {
          secondOpId = ops[0]?.opId ?? "";
        }
      },
    });
    const text = new LiveText("Hello");
    text._attach("0:1", pool);

    text.insert(0, "A");
    text.insert(6, "!");
    expect(text.toString()).toBe("AHello!");

    text._apply(
      {
        type: OpCode.UPDATE_TEXT,
        id: "0:1",
        opId: firstOpId,
        baseVersion: 0,
        version: 1,
        ops: [{ type: "insert", index: 0, text: "A" }],
      },
      false
    );

    expect(text.toString()).toBe("AHello!");
    expect(text.version).toBe(1);

    text._apply(
      {
        type: OpCode.UPDATE_TEXT,
        id: "0:1",
        opId: secondOpId,
        baseVersion: 1,
        version: 2,
        ops: [{ type: "insert", index: 6, text: "!" }],
      },
      false
    );

    expect(text.toString()).toBe("AHello!");
    expect(text.version).toBe(2);
  });
});
