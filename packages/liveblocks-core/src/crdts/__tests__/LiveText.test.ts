import { describe, expect, test } from "vitest";

import {
  compactNodesToNodeStream,
  CrdtType,
  nodeStreamToCompactNodes,
  type StorageNode,
} from "../../protocol/StorageNode";
import { LiveText, rebaseTextOperations } from "../LiveText";
import { invertTextOperations } from "../liveTextOps";
import { toPlainLson } from "../utils";

describe("LiveText", () => {
  test("stores plain text and serializes to a delta", () => {
    const text = new LiveText("Hello");

    expect(text.toString()).toBe("Hello");
    expect(text.length).toBe(5);
    expect(text.toDelta()).toEqual([{ text: "Hello" }]);
    expect(text.toJSON()).toEqual([{ text: "Hello" }]);
  });

  test("inserts, deletes, and replaces text", () => {
    const text = new LiveText("Hello");

    text.insert(5, " world");
    text.delete(0, 1);
    text.replace(0, 4, "Hi");

    expect(text.toString()).toBe("Hi world");
    expect(text.toDelta()).toEqual([{ text: "Hi world" }]);
  });

  test("formats ranges and normalizes adjacent segments", () => {
    const text = new LiveText("Hello world");

    text.format(0, 5, { bold: true });
    text.insert(5, "!", { bold: true });
    text.format(0, 6, { bold: null });

    expect(text.toDelta()).toEqual([{ text: "Hello! world" }]);
  });

  test("clones without sharing mutable state", () => {
    const text = new LiveText([{ text: "Hello", attributes: { bold: true } }]);
    const clone = text.clone();

    clone.insert(5, "!");

    expect(text.toDelta()).toEqual([
      { text: "Hello", attributes: { bold: true } },
    ]);
    expect(clone.toDelta()).toEqual([
      { text: "Hello", attributes: { bold: true } },
      { text: "!" },
    ]);
  });

  test("serializes to Plain LSON", () => {
    const text = new LiveText([{ text: "Hello", attributes: { bold: true } }]);

    expect(toPlainLson(text)).toEqual({
      liveblocksType: "LiveText",
      data: [{ text: "Hello", attributes: { bold: true } }],
      version: 0,
    });
  });

  test("rebases text operations over accepted operations", () => {
    expect(
      rebaseTextOperations(
        [{ type: "insert", index: 1, text: "!" }],
        [{ type: "insert", index: 0, text: "A" }]
      )
    ).toEqual([{ type: "insert", index: 2, text: "!" }]);
  });

  test("invertTextOperations preserves attributes for multi-segment deletes", () => {
    expect(
      invertTextOperations(
        [{ text: "He", attributes: { bold: true } }, { text: "llo" }],
        [{ type: "delete", index: 0, length: 5 }]
      )
    ).toEqual([
      { type: "insert", index: 0, text: "He", attributes: { bold: true } },
      { type: "insert", index: 2, text: "llo" },
    ]);
  });

  test("round-trips compact storage nodes", () => {
    const nodes: StorageNode[] = [
      ["root", { type: CrdtType.OBJECT, data: {} }],
      [
        "0:1",
        {
          type: CrdtType.TEXT,
          parentId: "root",
          parentKey: "text",
          data: [{ text: "Hello" }],
          version: 2,
        },
      ],
    ];

    const compact = Array.from(nodeStreamToCompactNodes(nodes));

    expect(compact).toEqual([
      ["root", {}],
      ["0:1", CrdtType.TEXT, "root", "text", [{ text: "Hello" }], 2],
    ]);
    expect(Array.from(compactNodesToNodeStream(compact))).toEqual(nodes);
  });
});
