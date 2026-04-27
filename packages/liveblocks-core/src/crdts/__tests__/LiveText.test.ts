import { describe, expect, test } from "vitest";

import {
  compactNodesToNodeStream,
  CrdtType,
  nodeStreamToCompactNodes,
} from "../../protocol/StorageNode";
import { LiveText, rebaseTextOperations } from "../LiveText";
import { toPlainLson } from "../utils";

describe("LiveText", () => {
  test("stores plain text and serializes to a delta", () => {
    const text = new LiveText("Hello");

    expect(text.toString()).toBe("Hello");
    expect(text.length).toBe(5);
    expect(text.toDelta()).toEqual([{ insert: "Hello" }]);
    expect(text.toJSON()).toEqual([{ insert: "Hello" }]);
  });

  test("inserts, deletes, and replaces text", () => {
    const text = new LiveText("Hello");

    text.insert(5, " world");
    text.delete(0, 1);
    text.replace(0, 4, "Hi");

    expect(text.toString()).toBe("Hi world");
    expect(text.toDelta()).toEqual([{ insert: "Hi world" }]);
  });

  test("formats ranges and normalizes adjacent segments", () => {
    const text = new LiveText("Hello world");

    text.format(0, 5, { bold: true });
    text.insert(5, "!", { bold: true });
    text.format(0, 6, { bold: null });

    expect(text.toDelta()).toEqual([{ insert: "Hello! world" }]);
  });

  test("clones without sharing mutable state", () => {
    const text = new LiveText([{ insert: "Hello", attributes: { bold: true } }]);
    const clone = text.clone();

    clone.insert(5, "!");

    expect(text.toDelta()).toEqual([
      { insert: "Hello", attributes: { bold: true } },
    ]);
    expect(clone.toDelta()).toEqual([
      { insert: "Hello", attributes: { bold: true } },
      { insert: "!" },
    ]);
  });

  test("serializes to Plain LSON", () => {
    const text = new LiveText([{ insert: "Hello", attributes: { bold: true } }]);

    expect(toPlainLson(text)).toEqual({
      liveblocksType: "LiveText",
      data: [{ insert: "Hello", attributes: { bold: true } }],
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

  test("round-trips compact storage nodes", () => {
    const nodes = [
      ["root", { type: CrdtType.OBJECT, data: {} }],
      [
        "0:1",
        {
          type: CrdtType.TEXT,
          parentId: "root",
          parentKey: "text",
          data: [{ insert: "Hello" }],
          version: 2,
        },
      ],
    ] as const;

    const compact = Array.from(nodeStreamToCompactNodes(nodes));

    expect(compact).toEqual([
      ["root", {}],
      ["0:1", CrdtType.TEXT, "root", "text", [{ insert: "Hello" }], 2],
    ]);
    expect(Array.from(compactNodesToNodeStream(compact))).toEqual(nodes);
  });
});
