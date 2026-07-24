import { describe, expect, test } from "vitest";

import {
  applyLiveTextOperations,
  attributesEqual,
  dataToSegments,
  inverseMapTextIndexThroughOperations,
  invertTextOperations,
  mapTextIndexThroughOperations,
  normalizeSegments,
  transformTextOperations,
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

  test("transformTextOperations shifts indices over accepted inserts", () => {
    expect(
      transformTextOperations(
        [{ type: "insert", index: 1, text: "!" }],
        [{ type: "insert", index: 0, text: "A" }],
        "after"
      )
    ).toEqual([{ type: "insert", index: 2, text: "!" }]);
  });

  describe("inverseMapTextIndexThroughOperations", () => {
    test("identity when there are no ops", () => {
      expect(inverseMapTextIndexThroughOperations(7, [])).toBe(7);
    });

    test("undoes a single insert: positions past insertion shift left", () => {
      const op = { type: "insert" as const, index: 5, text: "ab" };
      expect(inverseMapTextIndexThroughOperations(8, [op])).toBe(6);
    });

    test("undoes a single insert: positions before insertion are unchanged", () => {
      const op = { type: "insert" as const, index: 5, text: "ab" };
      expect(inverseMapTextIndexThroughOperations(3, [op])).toBe(3);
    });

    test("undoes a single insert: positions inside insertion collapse to insertion point", () => {
      const op = { type: "insert" as const, index: 5, text: "abc" };
      expect(inverseMapTextIndexThroughOperations(5, [op])).toBe(5);
      expect(inverseMapTextIndexThroughOperations(6, [op])).toBe(5);
      expect(inverseMapTextIndexThroughOperations(7, [op])).toBe(5);
      expect(inverseMapTextIndexThroughOperations(8, [op])).toBe(5);
      expect(inverseMapTextIndexThroughOperations(9, [op])).toBe(6);
    });

    test("undoes a single delete: positions before deletion are unchanged", () => {
      const op = { type: "delete" as const, index: 5, length: 2 };
      expect(inverseMapTextIndexThroughOperations(3, [op])).toBe(3);
      expect(inverseMapTextIndexThroughOperations(4, [op])).toBe(4);
    });

    test("undoes a single delete: positions past deletion shift right", () => {
      const op = { type: "delete" as const, index: 5, length: 2 };
      expect(inverseMapTextIndexThroughOperations(6, [op])).toBe(8);
      expect(inverseMapTextIndexThroughOperations(10, [op])).toBe(12);
    });

    test("undoes a single delete: position at the deletion point lands on the right edge", () => {
      const op = { type: "delete" as const, index: 5, length: 3 };
      expect(inverseMapTextIndexThroughOperations(5, [op])).toBe(8);
    });

    test("format ops are positionally neutral", () => {
      const op = {
        type: "format" as const,
        index: 1,
        length: 4,
        attributes: { bold: true },
      };
      expect(inverseMapTextIndexThroughOperations(3, [op])).toBe(3);
    });

    test("ops are inverted in reverse order", () => {
      const ops = [
        { type: "insert" as const, index: 0, text: "Hi " },
        { type: "delete" as const, index: 6, length: 1 },
      ];
      // Forward: from "World" → "Hi World" → "Hi Wold" (delete the "r" at index 6).
      // Position 4 in the final string ("Wo|ld") should inverse-map back to
      // position 1 in the original "World" ("W|orld"), which the forward map
      // confirms: forward(1, ops) = 4.
      expect(mapTextIndexThroughOperations(1, ops)).toBe(4);
      expect(inverseMapTextIndexThroughOperations(4, ops)).toBe(1);
    });

    test("forward then inverse is identity on positions clearly outside any op range", () => {
      const ops = [
        { type: "insert" as const, index: 2, text: "XY" },
        { type: "delete" as const, index: 10, length: 3 },
      ];
      for (const index of [0, 1, 15, 20, 100]) {
        expect(
          inverseMapTextIndexThroughOperations(
            mapTextIndexThroughOperations(index, ops),
            ops
          )
        ).toBe(index);
      }
    });
  });
});
