import { describe, expect, test } from "vitest";

import type { LiveTextData } from "../../protocol/Op";
import {
  applyLiveTextOperations,
  attributesEqual,
  dataToSegments,
  inverseMapTextIndexThroughOperations,
  invertTextOperations,
  mapTextIndexThroughOperations,
  normalizeLiveTextOperations,
  normalizeSegments,
  transformTextOperations,
} from "../liveTextOps";

describe("liveTextOps", () => {
  test("attributesEqual is order-independent", () => {
    expect(attributesEqual({ a: 1, b: 2 }, { b: 2, a: 1 })).toBe(true);
    expect(attributesEqual({ a: 1 }, { a: 2 })).toBe(false);
  });

  test("inverting a format clears attribute names inherited from Object.prototype", () => {
    // Attribute names are arbitrary strings, so they can collide with members
    // every plain object inherits from Object.prototype ("toString",
    // "constructor", "valueOf", ...). Undoing a format on a key the segment
    // never had must restore "no such attribute" (null) -- the inherited
    // member is not an attribute value.
    //
    // The segment carries an unrelated attribute here so its attribute bag
    // exists: that is what makes the inherited "toString" reachable.
    const doc: LiveTextData = [["a", { bold: true }]];
    const ops = [
      {
        type: "format" as const,
        index: 0,
        length: 1,
        attributes: { toString: false },
      },
    ];

    const reverse = invertTextOperations(dataToSegments(doc), ops);

    expect(reverse).toEqual([
      { type: "format", index: 0, length: 1, attributes: { toString: null } },
    ]);
    expect(
      applyLiveTextOperations(applyLiveTextOperations(doc, ops), reverse)
    ).toEqual(doc);
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

  test("normalizes operation boundaries around surrogate pairs", () => {
    const data: LiveTextData = [["a😀b"]];

    expect(
      normalizeLiveTextOperations(data, [
        { type: "insert", index: 2, text: "X" },
      ])
    ).toEqual([{ type: "insert", index: 1, text: "X" }]);

    expect(
      normalizeLiveTextOperations(data, [
        { type: "delete", index: 2, length: 1 },
      ])
    ).toEqual([{ type: "delete", index: 1, length: 2 }]);

    expect(
      normalizeLiveTextOperations(data, [
        { type: "delete", index: 0, length: 2 },
      ])
    ).toEqual([{ type: "delete", index: 0, length: 3 }]);

    expect(
      normalizeLiveTextOperations(data, [
        { type: "delete", index: 2, length: 0 },
      ])
    ).toEqual([{ type: "delete", index: 1, length: 0 }]);

    expect(
      normalizeLiveTextOperations(data, [
        {
          type: "format",
          index: 2,
          length: 1,
          attributes: { bold: true },
        },
      ])
    ).toEqual([
      {
        type: "format",
        index: 1,
        length: 2,
        attributes: { bold: true },
      },
    ]);
  });

  test("normalizes each operation against the preceding operations", () => {
    expect(
      normalizeLiveTextOperations(
        [["ab"]],
        [
          { type: "insert", index: 1, text: "😀" },
          { type: "insert", index: 2, text: "X" },
        ]
      )
    ).toEqual([
      { type: "insert", index: 1, text: "😀" },
      { type: "insert", index: 1, text: "X" },
    ]);
  });

  test("detects surrogate pairs across segment boundaries", () => {
    expect(
      normalizeLiveTextOperations(
        [["a\ud83d"], ["\ude00b", { bold: true }]],
        [{ type: "insert", index: 2, text: "X" }]
      )
    ).toEqual([{ type: "insert", index: 1, text: "X" }]);
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
