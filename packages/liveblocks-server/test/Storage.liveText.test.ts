/**
 * Copyright (c) Liveblocks Inc.
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published
 * by the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program. If not, see <https://www.gnu.org/licenses/>.
 */

import type { NodeMap, TextOperation } from "@liveblocks/core";
import { CrdtType, OpCode } from "@liveblocks/core";
import { describe, expect, test } from "vitest";

import { InMemoryDriver } from "~/plugins/InMemoryDriver";
import { Storage } from "~/Storage";

function initInMemory(driver: InMemoryDriver, rawNodes: NodeMap): void {
  const internalNodes = (driver as unknown as { _nodes: NodeMap })._nodes;
  for (const [id, node] of rawNodes) {
    internalNodes.set(id, node);
  }
}

function updateTextOp(
  id: string,
  baseVersion: number,
  ops: TextOperation[],
  opId = `op:${id}:${baseVersion}`
) {
  return {
    opId,
    id,
    type: OpCode.UPDATE_TEXT,
    baseVersion,
    ops,
  } as const;
}

describe("Storage LiveText", () => {
  test("applies insert, delete, and format operations with version increments", () => {
    const driver = new InMemoryDriver();
    initInMemory(
      driver,
      new Map([
        ["root", { type: CrdtType.OBJECT, data: {} }],
        [
          "0:1",
          {
            type: CrdtType.TEXT,
            parentId: "root",
            parentKey: "text",
            data: [["Hello"]],
            version: 0,
          },
        ],
      ])
    );

    const storage = new Storage(driver);

    const insertResult = storage.applyOps([
      updateTextOp("0:1", 0, [{ type: "insert", index: 5, text: "!" }]),
    ]);
    expect(insertResult[0]?.action).toBe("accepted");
    expect(storage.driver.get_node("0:1")).toEqual({
      type: CrdtType.TEXT,
      parentId: "root",
      parentKey: "text",
      data: [["Hello!"]],
      version: 1,
    });

    const formatResult = storage.applyOps([
      updateTextOp("0:1", 1, [
        {
          type: "format",
          index: 0,
          length: 5,
          attributes: { bold: true },
        },
      ]),
    ]);
    expect(formatResult[0]?.action).toBe("accepted");
    expect(storage.driver.get_node("0:1")).toEqual({
      type: CrdtType.TEXT,
      parentId: "root",
      parentKey: "text",
      data: [["Hello", { bold: true }], ["!"]],
      version: 2,
    });

    const deleteResult = storage.applyOps([
      updateTextOp("0:1", 2, [{ type: "delete", index: 5, length: 1 }]),
    ]);
    expect(deleteResult[0]?.action).toBe("accepted");
    expect(storage.driver.get_node("0:1")).toEqual({
      type: CrdtType.TEXT,
      parentId: "root",
      parentKey: "text",
      data: [["Hello", { bold: true }]],
      version: 3,
    });
  });

  test("normalizes segments with attribute key order differences", () => {
    const driver = new InMemoryDriver();
    initInMemory(
      driver,
      new Map([
        ["root", { type: CrdtType.OBJECT, data: {} }],
        [
          "0:1",
          {
            type: CrdtType.TEXT,
            parentId: "root",
            parentKey: "text",
            data: [
              ["He", { bold: true, italic: true }],
              ["llo", { italic: true, bold: true }],
            ],
            version: 0,
          },
        ],
      ])
    );

    const storage = new Storage(driver);

    const result = storage.applyOps([
      updateTextOp("0:1", 0, [{ type: "insert", index: 5, text: "!" }]),
    ]);
    expect(result[0]?.action).toBe("accepted");
    expect(storage.driver.get_node("0:1")).toEqual({
      type: CrdtType.TEXT,
      parentId: "root",
      parentKey: "text",
      data: [["Hello", { bold: true, italic: true }], ["!"]],
      version: 1,
    });
  });

  test("rebases stale operations over authoritative history", () => {
    const driver = new InMemoryDriver();
    initInMemory(
      driver,
      new Map([
        ["root", { type: CrdtType.OBJECT, data: {} }],
        [
          "0:1",
          {
            type: CrdtType.TEXT,
            parentId: "root",
            parentKey: "text",
            data: [["Hello"]],
            version: 0,
          },
        ],
      ])
    );

    const storage = new Storage(driver);

    const first = storage.applyOps([
      updateTextOp(
        "0:1",
        0,
        [{ type: "insert", index: 0, text: "A" }],
        "client:a"
      ),
    ]);
    expect(first[0]).toMatchObject({
      action: "accepted",
      op: {
        baseVersion: 0,
        version: 1,
        ops: [{ type: "insert", index: 0, text: "A" }],
      },
    });

    const second = storage.applyOps([
      updateTextOp(
        "0:1",
        0,
        [{ type: "delete", index: 0, length: 2 }],
        "client:b"
      ),
    ]);

    expect(second[0]).toMatchObject({
      action: "accepted",
      op: {
        baseVersion: 1,
        version: 2,
        ops: [{ type: "delete", index: 1, length: 2 }],
      },
    });
    expect(storage.driver.get_node("0:1")).toEqual({
      type: CrdtType.TEXT,
      parentId: "root",
      parentKey: "text",
      data: [["Allo"]],
      version: 2,
    });
  });

  test("acknowledges duplicate LiveText opIds without applying twice", () => {
    const driver = new InMemoryDriver();
    initInMemory(
      driver,
      new Map([
        ["root", { type: CrdtType.OBJECT, data: {} }],
        [
          "0:1",
          {
            type: CrdtType.TEXT,
            parentId: "root",
            parentKey: "text",
            data: [["Hello"]],
            version: 0,
          },
        ],
      ])
    );

    const storage = new Storage(driver);
    const op = updateTextOp(
      "0:1",
      0,
      [{ type: "insert", index: 5, text: "!" }],
      "client:duplicate"
    );

    expect(storage.applyOps([op])[0]?.action).toBe("accepted");
    const duplicate = storage.applyOps([op]);

    expect(duplicate[0]).toMatchObject({
      action: "rectified",
      ackOp: {
        opId: "client:duplicate",
        baseVersion: 0,
        version: 1,
        ops: [{ type: "insert", index: 5, text: "!" }],
      },
    });
    expect(storage.driver.get_node("0:1")).toEqual({
      type: CrdtType.TEXT,
      parentId: "root",
      parentKey: "text",
      data: [["Hello!"]],
      version: 1,
    });
  });

  test("rejects stale operations when history does not cover the version gap", () => {
    const driver = new InMemoryDriver();
    initInMemory(
      driver,
      new Map([
        ["root", { type: CrdtType.OBJECT, data: {} }],
        [
          "0:1",
          {
            type: CrdtType.TEXT,
            parentId: "root",
            parentKey: "text",
            data: [["AHello"]],
            version: 1,
          },
        ],
      ])
    );

    const storage = new Storage(driver);
    const result = storage.applyOps([
      updateTextOp(
        "0:1",
        0,
        [{ type: "delete", index: 0, length: 2 }],
        "client:stale"
      ),
    ]);

    expect(result[0]).toMatchObject({
      action: "rejected",
      opIds: ["client:stale"],
      reason: "LiveText operation is older than retained history",
    });
    expect(storage.driver.get_node("0:1")).toEqual({
      type: CrdtType.TEXT,
      parentId: "root",
      parentKey: "text",
      data: [["AHello"]],
      version: 1,
    });
  });

  test("purges retained LiveText history to the configured window", () => {
    const driver = new InMemoryDriver();
    initInMemory(
      driver,
      new Map([
        ["root", { type: CrdtType.OBJECT, data: {} }],
        [
          "0:1",
          {
            type: CrdtType.TEXT,
            parentId: "root",
            parentKey: "text",
            data: [[""]],
            version: 0,
          },
        ],
      ])
    );

    const storage = new Storage(driver);
    for (let version = 0; version < 1002; version++) {
      const result = storage.applyOps([
        updateTextOp(
          "0:1",
          version,
          [{ type: "insert", index: version, text: "x" }],
          `client:${version}`
        ),
      ]);
      expect(result[0]?.action).toBe("accepted");
    }

    // History is purged continuously as ops are appended, not just when a
    // room (re)loads.
    const history = storage.driver.get_live_text_history_since("0:1", 0);
    expect(history).toHaveLength(1000);
    expect(history[0]?.version).toBe(3);
    expect(history[history.length - 1]?.version).toBe(1002);

    // Reloading keeps the same bounded window.
    const reloadedStorage = new Storage(driver);
    const reloadedHistory = reloadedStorage.driver.get_live_text_history_since(
      "0:1",
      0
    );
    expect(reloadedHistory).toHaveLength(1000);
    expect(reloadedHistory[0]?.version).toBe(3);
    expect(reloadedHistory[reloadedHistory.length - 1]?.version).toBe(1002);
  });

  test("ignores empty updates without bumping the version", () => {
    const driver = new InMemoryDriver();
    initInMemory(
      driver,
      new Map([
        ["root", { type: CrdtType.OBJECT, data: {} }],
        [
          "0:1",
          {
            type: CrdtType.TEXT,
            parentId: "root",
            parentKey: "text",
            data: [["Hello"]],
            version: 0,
          },
        ],
      ])
    );

    const storage = new Storage(driver);
    const result = storage.applyOps([updateTextOp("0:1", 0, [])]);

    expect(result[0]?.action).toBe("ignored");
    expect(storage.driver.get_node("0:1")).toEqual({
      type: CrdtType.TEXT,
      parentId: "root",
      parentKey: "text",
      data: [["Hello"]],
      version: 0,
    });
    expect(storage.driver.get_live_text_history_since("0:1", 0)).toHaveLength(
      0
    );
  });

  test("a delete rebased over a concurrent interior insert preserves the insert", () => {
    const driver = new InMemoryDriver();
    initInMemory(
      driver,
      new Map([
        ["root", { type: CrdtType.OBJECT, data: {} }],
        [
          "0:1",
          {
            type: CrdtType.TEXT,
            parentId: "root",
            parentKey: "text",
            data: [["abcdef"]],
            version: 0,
          },
        ],
      ])
    );

    const storage = new Storage(driver);

    // Client A inserts "ZZ" at index 3 (accepted first)
    const insertResult = storage.applyOps([
      updateTextOp("0:1", 0, [{ type: "insert", index: 3, text: "ZZ" }], "a:1"),
    ]);
    expect(insertResult[0]?.action).toBe("accepted");

    // Client B concurrently deletes [1, 5) ("bcde"), based on version 0
    const deleteResult = storage.applyOps([
      updateTextOp("0:1", 0, [{ type: "delete", index: 1, length: 4 }], "b:1"),
    ]);
    expect(deleteResult[0]?.action).toBe("accepted");

    // The concurrently inserted text survives the spanning delete
    expect(storage.driver.get_node("0:1")).toEqual({
      type: CrdtType.TEXT,
      parentId: "root",
      parentKey: "text",
      data: [["aZZf"]],
      version: 2,
    });
  });
});
