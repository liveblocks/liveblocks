/**
 * LiveObject behavioral equivalence tests.
 *
 * Exercises getTreesDiffOperations with LiveObject-specific scenarios
 * (nested objects, property updates, child object creation/deletion)
 * and verifies identical results across JS and Adapter engines.
 */
import { afterEach, describe, expect, test } from "vitest";

import { OpCode } from "../../protocol/Op";
import { CrdtType } from "../../protocol/SerializedCrdt";
import type { NodeMap } from "../../types/NodeMap";
import { FIRST_POSITION } from "../_utils";
import { getTestEngines, resetEngine } from "./setup";

afterEach(() => {
  resetEngine();
});

for (const engine of getTestEngines()) {
  describe(`LiveObject operations [${engine.name}]`, () => {
    test("new property on root produces UPDATE_OBJECT", () => {
      const current: NodeMap = new Map([
        ["root", { type: CrdtType.OBJECT, data: {} }],
      ]);
      const newItems: NodeMap = new Map([
        ["root", { type: CrdtType.OBJECT, data: { name: "Alice" } }],
      ]);

      const ops = engine.getTreesDiffOperations(current, newItems);
      expect(ops).toEqual([
        {
          type: OpCode.UPDATE_OBJECT,
          id: "root",
          data: { name: "Alice" },
        },
      ]);
    });

    test("multiple property changes produce single UPDATE_OBJECT", () => {
      const current: NodeMap = new Map([
        ["root", { type: CrdtType.OBJECT, data: { a: 1, b: 2, c: 3 } }],
      ]);
      const newItems: NodeMap = new Map([
        ["root", { type: CrdtType.OBJECT, data: { a: 10, b: 20, c: 30 } }],
      ]);

      const ops = engine.getTreesDiffOperations(current, newItems);
      expect(ops).toEqual([
        {
          type: OpCode.UPDATE_OBJECT,
          id: "root",
          data: { a: 10, b: 20, c: 30 },
        },
      ]);
    });

    test("unchanged object produces no ops", () => {
      const items: NodeMap = new Map([
        ["root", { type: CrdtType.OBJECT, data: { x: 1, y: 2 } }],
      ]);

      const ops = engine.getTreesDiffOperations(items, items);
      expect(ops).toEqual([]);
    });

    test("nested object creation produces CREATE_OBJECT", () => {
      const current: NodeMap = new Map([
        ["root", { type: CrdtType.OBJECT, data: {} }],
      ]);
      const newItems: NodeMap = new Map([
        ["root", { type: CrdtType.OBJECT, data: {} }],
        [
          "0:1",
          {
            type: CrdtType.OBJECT,
            parentId: "root",
            parentKey: "child",
            data: { nested: true },
          },
        ],
      ]);

      const ops = engine.getTreesDiffOperations(current, newItems);
      expect(ops).toEqual([
        {
          type: OpCode.CREATE_OBJECT,
          id: "0:1",
          parentId: "root",
          parentKey: "child",
          data: { nested: true },
        },
      ]);
    });

    test("nested object deletion produces DELETE_CRDT", () => {
      const current: NodeMap = new Map([
        ["root", { type: CrdtType.OBJECT, data: {} }],
        [
          "0:1",
          {
            type: CrdtType.OBJECT,
            parentId: "root",
            parentKey: "child",
            data: { val: 42 },
          },
        ],
      ]);
      const newItems: NodeMap = new Map([
        ["root", { type: CrdtType.OBJECT, data: {} }],
      ]);

      const ops = engine.getTreesDiffOperations(current, newItems);
      expect(ops).toEqual([
        {
          type: OpCode.DELETE_CRDT,
          id: "0:1",
        },
      ]);
    });

    test("nested object property update produces UPDATE_OBJECT on child", () => {
      const current: NodeMap = new Map([
        ["root", { type: CrdtType.OBJECT, data: {} }],
        [
          "0:1",
          {
            type: CrdtType.OBJECT,
            parentId: "root",
            parentKey: "child",
            data: { val: 1 },
          },
        ],
      ]);
      const newItems: NodeMap = new Map([
        ["root", { type: CrdtType.OBJECT, data: {} }],
        [
          "0:1",
          {
            type: CrdtType.OBJECT,
            parentId: "root",
            parentKey: "child",
            data: { val: 99 },
          },
        ],
      ]);

      const ops = engine.getTreesDiffOperations(current, newItems);
      expect(ops).toEqual([
        {
          type: OpCode.UPDATE_OBJECT,
          id: "0:1",
          data: { val: 99 },
        },
      ]);
    });

    test("simultaneous root and child updates produce two UPDATE_OBJECT ops", () => {
      const current: NodeMap = new Map([
        ["root", { type: CrdtType.OBJECT, data: { x: 1 } }],
        [
          "0:1",
          {
            type: CrdtType.OBJECT,
            parentId: "root",
            parentKey: "child",
            data: { y: 2 },
          },
        ],
      ]);
      const newItems: NodeMap = new Map([
        ["root", { type: CrdtType.OBJECT, data: { x: 10 } }],
        [
          "0:1",
          {
            type: CrdtType.OBJECT,
            parentId: "root",
            parentKey: "child",
            data: { y: 20 },
          },
        ],
      ]);

      const ops = engine.getTreesDiffOperations(current, newItems);
      expect(ops).toHaveLength(2);
      expect(ops).toContainEqual({
        type: OpCode.UPDATE_OBJECT,
        id: "root",
        data: { x: 10 },
      });
      expect(ops).toContainEqual({
        type: OpCode.UPDATE_OBJECT,
        id: "0:1",
        data: { y: 20 },
      });
    });

    test("adding list child to object produces CREATE_LIST", () => {
      const current: NodeMap = new Map([
        ["root", { type: CrdtType.OBJECT, data: {} }],
      ]);
      const newItems: NodeMap = new Map([
        ["root", { type: CrdtType.OBJECT, data: {} }],
        [
          "0:1",
          { type: CrdtType.LIST, parentId: "root", parentKey: "items" },
        ],
      ]);

      const ops = engine.getTreesDiffOperations(current, newItems);
      expect(ops).toEqual([
        {
          type: OpCode.CREATE_LIST,
          id: "0:1",
          parentId: "root",
          parentKey: "items",
        },
      ]);
    });

    test("adding map child to object produces CREATE_MAP", () => {
      const current: NodeMap = new Map([
        ["root", { type: CrdtType.OBJECT, data: {} }],
      ]);
      const newItems: NodeMap = new Map([
        ["root", { type: CrdtType.OBJECT, data: {} }],
        [
          "0:1",
          { type: CrdtType.MAP, parentId: "root", parentKey: "metadata" },
        ],
      ]);

      const ops = engine.getTreesDiffOperations(current, newItems);
      expect(ops).toEqual([
        {
          type: OpCode.CREATE_MAP,
          id: "0:1",
          parentId: "root",
          parentKey: "metadata",
        },
      ]);
    });

    test("replacing object child with register produces DELETE + CREATE", () => {
      const current: NodeMap = new Map([
        ["root", { type: CrdtType.OBJECT, data: {} }],
        [
          "0:1",
          {
            type: CrdtType.OBJECT,
            parentId: "root",
            parentKey: "child",
            data: { nested: true },
          },
        ],
      ]);
      const newItems: NodeMap = new Map([
        ["root", { type: CrdtType.OBJECT, data: {} }],
        [
          "1:0",
          {
            type: CrdtType.REGISTER,
            parentId: "root",
            parentKey: "child",
            data: "replaced",
          },
        ],
      ]);

      const ops = engine.getTreesDiffOperations(current, newItems);
      expect(ops.length).toBeGreaterThanOrEqual(2);
      expect(ops).toContainEqual({
        type: OpCode.DELETE_CRDT,
        id: "0:1",
      });
      expect(ops).toContainEqual({
        type: OpCode.CREATE_REGISTER,
        id: "1:0",
        parentId: "root",
        parentKey: "child",
        data: "replaced",
      });
    });

    test("deeply nested object chain updates correctly", () => {
      const current: NodeMap = new Map([
        ["root", { type: CrdtType.OBJECT, data: {} }],
        [
          "0:1",
          {
            type: CrdtType.OBJECT,
            parentId: "root",
            parentKey: "level1",
            data: {},
          },
        ],
        [
          "0:2",
          {
            type: CrdtType.OBJECT,
            parentId: "0:1",
            parentKey: "level2",
            data: { deep: "old" },
          },
        ],
      ]);
      const newItems: NodeMap = new Map([
        ["root", { type: CrdtType.OBJECT, data: {} }],
        [
          "0:1",
          {
            type: CrdtType.OBJECT,
            parentId: "root",
            parentKey: "level1",
            data: {},
          },
        ],
        [
          "0:2",
          {
            type: CrdtType.OBJECT,
            parentId: "0:1",
            parentKey: "level2",
            data: { deep: "new" },
          },
        ],
      ]);

      const ops = engine.getTreesDiffOperations(current, newItems);
      expect(ops).toEqual([
        {
          type: OpCode.UPDATE_OBJECT,
          id: "0:2",
          data: { deep: "new" },
        },
      ]);
    });
  });
}

describe("LiveObject cross-engine equivalence", () => {
  const engines = getTestEngines();

  test("complex nested object diff identical across engines", () => {
    const current: NodeMap = new Map([
      ["root", { type: CrdtType.OBJECT, data: { version: 1 } }],
      [
        "0:1",
        {
          type: CrdtType.OBJECT,
          parentId: "root",
          parentKey: "settings",
          data: { theme: "dark", lang: "en" },
        },
      ],
      [
        "0:2",
        {
          type: CrdtType.LIST,
          parentId: "root",
          parentKey: "items",
        },
      ],
      [
        "0:3",
        {
          type: CrdtType.REGISTER,
          parentId: "0:2",
          parentKey: FIRST_POSITION,
          data: "item1",
        },
      ],
    ]);

    const newItems: NodeMap = new Map([
      ["root", { type: CrdtType.OBJECT, data: { version: 2 } }],
      [
        "0:1",
        {
          type: CrdtType.OBJECT,
          parentId: "root",
          parentKey: "settings",
          data: { theme: "light", lang: "en" },
        },
      ],
      [
        "0:2",
        {
          type: CrdtType.LIST,
          parentId: "root",
          parentKey: "items",
        },
      ],
      [
        "1:0",
        {
          type: CrdtType.MAP,
          parentId: "root",
          parentKey: "metadata",
        },
      ],
    ]);

    const results = engines.map((e) =>
      e.getTreesDiffOperations(current, newItems)
    );

    for (let i = 1; i < results.length; i++) {
      expect(results[i]).toEqual(results[0]);
    }
  });
});
