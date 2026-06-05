import { describe, expect, test } from "vitest";

import {
  applyLiveTextOperations,
  attributesEqual,
  dataToSegments,
  invertTextOperations,
  normalizeSegments,
  rebaseTextOperations,
} from "../liveTextOps";

describe("liveTextOps", () => {
  test("attributesEqual is order-independent", () => {
    expect(attributesEqual({ a: 1, b: 2 }, { b: 2, a: 1 })).toBe(true);
    expect(attributesEqual({ a: 1 }, { a: 2 })).toBe(false);
  });

  test("normalizeSegments merges adjacent segments with equivalent attributes", () => {
    expect(
      normalizeSegments([
        { text: "He", attributes: { bold: true } },
        { text: "llo", attributes: { bold: true } },
      ])
    ).toEqual([{ text: "Hello", attributes: { bold: true } }]);
  });

  test("applyLiveTextOperations inserts, deletes, and formats", () => {
    const data = applyLiveTextOperations(
      [["Hello"]],
      [
        { type: "insert", index: 5, text: "!" },
        { type: "format", index: 0, length: 5, attributes: { bold: true } },
      ]
    );

    expect(data).toEqual([["Hello", { bold: true }], ["!"]]);
  });

  test("invertTextOperations preserves attributes for deleted segments", () => {
    const segments = dataToSegments([["He", { bold: true }], ["llo"]]);

    expect(
      invertTextOperations(segments, [{ type: "delete", index: 0, length: 5 }])
    ).toEqual([
      { type: "insert", index: 0, text: "He", attributes: { bold: true } },
      { type: "insert", index: 2, text: "llo" },
    ]);
  });

  test("rebaseTextOperations shifts indices over accepted inserts", () => {
    expect(
      rebaseTextOperations(
        [{ type: "insert", index: 1, text: "!" }],
        [{ type: "insert", index: 0, text: "A" }]
      )
    ).toEqual([{ type: "insert", index: 2, text: "!" }]);
  });
});
