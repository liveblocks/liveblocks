/**
 * Behavioral equivalence tests for liveblocks-helpers functions.
 *
 * Runs the same getTreesDiffOperations test cases against both
 * the direct JS implementation and the wasm-adapter, verifying
 * identical results.
 */
import { afterEach, describe, expect, test } from "vitest";

import { OpCode } from "../../protocol/Op";
import { CrdtType } from "../../protocol/SerializedCrdt";
import type { NodeMap } from "../../types/NodeMap";
import { FIRST_POSITION, SECOND_POSITION } from "../_utils";
import {
  getTestEngines,
  resetEngine,
} from "./setup";

afterEach(() => {
  resetEngine();
});

for (const engine of getTestEngines()) {
  describe(`getTreesDiffOperations [${engine.name}]`, () => {
    test("new liveList Register item", () => {
      const currentItems: NodeMap = new Map([
        ["root", { type: CrdtType.OBJECT, data: {} }],
        [
          "0:1",
          { type: CrdtType.LIST, parentId: "root", parentKey: "items" },
        ],
        [
          "0:2",
          {
            type: CrdtType.REGISTER,
            parentId: "0:1",
            parentKey: FIRST_POSITION,
            data: "A",
          },
        ],
      ]);

      const newItems = new Map(currentItems);
      newItems.set("1:1", {
        type: CrdtType.REGISTER,
        parentId: "0:1",
        parentKey: SECOND_POSITION,
        data: "B",
      });

      const ops = engine.getTreesDiffOperations(currentItems, newItems);

      expect(ops).toEqual([
        {
          type: OpCode.CREATE_REGISTER,
          id: "1:1",
          parentId: "0:1",
          parentKey: SECOND_POSITION,
          data: "B",
        },
      ]);
    });

    test("delete liveList item", () => {
      const currentItems: NodeMap = new Map([
        ["root", { type: CrdtType.OBJECT, data: {} }],
        [
          "0:1",
          { type: CrdtType.LIST, parentId: "root", parentKey: "items" },
        ],
        [
          "0:2",
          {
            type: CrdtType.REGISTER,
            parentId: "0:1",
            parentKey: FIRST_POSITION,
            data: "A",
          },
        ],
        [
          "0:3",
          {
            type: CrdtType.REGISTER,
            parentId: "0:1",
            parentKey: SECOND_POSITION,
            data: "B",
          },
        ],
      ]);

      const newItems = new Map(currentItems);
      newItems.delete("0:2");

      const ops = engine.getTreesDiffOperations(currentItems, newItems);

      expect(ops).toEqual([
        {
          type: OpCode.DELETE_CRDT,
          id: "0:2",
        },
      ]);
    });

    test("liveList item moved, added and deleted", () => {
      const currentItems: NodeMap = new Map([
        ["root", { type: CrdtType.OBJECT, data: {} }],
        [
          "0:1",
          { type: CrdtType.LIST, parentId: "root", parentKey: "items" },
        ],
        [
          "0:2",
          {
            type: CrdtType.REGISTER,
            parentId: "0:1",
            parentKey: FIRST_POSITION,
            data: "A",
          },
        ],
        [
          "0:3",
          {
            type: CrdtType.REGISTER,
            parentId: "0:1",
            parentKey: SECOND_POSITION,
            data: "B",
          },
        ],
      ]);

      const newItems: NodeMap = new Map([
        ["root", { type: CrdtType.OBJECT, data: {} }],
        [
          "0:1",
          { type: CrdtType.LIST, parentId: "root", parentKey: "items" },
        ],
        [
          "0:3",
          {
            type: CrdtType.REGISTER,
            parentId: "0:1",
            parentKey: FIRST_POSITION,
            data: "B",
          },
        ],
        [
          "1:0",
          {
            type: CrdtType.REGISTER,
            parentId: "0:1",
            parentKey: SECOND_POSITION,
            data: "C",
          },
        ],
      ]);

      const ops = engine.getTreesDiffOperations(currentItems, newItems);

      expect(ops).toEqual([
        {
          type: OpCode.DELETE_CRDT,
          id: "0:2",
        },
        {
          type: OpCode.SET_PARENT_KEY,
          id: "0:3",
          parentKey: FIRST_POSITION,
        },
        {
          type: OpCode.CREATE_REGISTER,
          id: "1:0",
          parentId: "0:1",
          parentKey: SECOND_POSITION,
          data: "C",
        },
      ]);
    });

    test("liveObject update", () => {
      const currentItems: NodeMap = new Map([
        ["root", { type: CrdtType.OBJECT, data: {} }],
        [
          "0:1",
          {
            type: CrdtType.OBJECT,
            parentId: "root",
            parentKey: "item",
            data: { a: 1 },
          },
        ],
        [
          "0:2",
          {
            type: CrdtType.OBJECT,
            parentId: "0:1",
            parentKey: "subItem",
            data: { b: 1 },
          },
        ],
        [
          "0:3",
          {
            type: CrdtType.OBJECT,
            parentId: "root",
            parentKey: "item2",
            data: { a: 1 },
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
            parentKey: "item",
            data: { a: 2 },
          },
        ],
        [
          "0:2",
          {
            type: CrdtType.OBJECT,
            parentId: "0:1",
            parentKey: "subItem",
            data: { c: 1 },
          },
        ],
        [
          "0:3",
          {
            type: CrdtType.OBJECT,
            parentId: "root",
            parentKey: "item2",
            data: { a: 1 },
          },
        ],
      ]);

      const ops = engine.getTreesDiffOperations(currentItems, newItems);

      expect(ops).toEqual([
        {
          type: OpCode.UPDATE_OBJECT,
          id: "0:1",
          data: { a: 2 },
        },
        {
          type: OpCode.UPDATE_OBJECT,
          id: "0:2",
          data: { c: 1 },
        },
      ]);
    });

    test("identical trees produce no ops", () => {
      const items: NodeMap = new Map([
        ["root", { type: CrdtType.OBJECT, data: { x: 1 } }],
        [
          "0:1",
          { type: CrdtType.LIST, parentId: "root", parentKey: "list" },
        ],
      ]);

      const ops = engine.getTreesDiffOperations(items, items);
      expect(ops).toEqual([]);
    });

    test("new list node produces CREATE_LIST", () => {
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

    test("new map node produces CREATE_MAP", () => {
      const current: NodeMap = new Map([
        ["root", { type: CrdtType.OBJECT, data: {} }],
      ]);
      const newItems: NodeMap = new Map([
        ["root", { type: CrdtType.OBJECT, data: {} }],
        [
          "0:1",
          { type: CrdtType.MAP, parentId: "root", parentKey: "map" },
        ],
      ]);

      const ops = engine.getTreesDiffOperations(current, newItems);
      expect(ops).toEqual([
        {
          type: OpCode.CREATE_MAP,
          id: "0:1",
          parentId: "root",
          parentKey: "map",
        },
      ]);
    });

    test("new object node produces CREATE_OBJECT", () => {
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
            data: { a: 1 },
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
          data: { a: 1 },
        },
      ]);
    });
  });
}

describe("getTreesDiffOperations cross-engine equivalence", () => {
  const engines = getTestEngines();

  test("all engines produce identical results for complex diff", () => {
    const currentItems: NodeMap = new Map([
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
      [
        "0:2",
        { type: CrdtType.LIST, parentId: "root", parentKey: "list" },
      ],
      [
        "0:3",
        {
          type: CrdtType.REGISTER,
          parentId: "0:2",
          parentKey: FIRST_POSITION,
          data: "A",
        },
      ],
    ]);

    const newItems: NodeMap = new Map([
      ["root", { type: CrdtType.OBJECT, data: { x: 99 } }],
      [
        "0:2",
        { type: CrdtType.LIST, parentId: "root", parentKey: "list" },
      ],
      [
        "0:3",
        {
          type: CrdtType.REGISTER,
          parentId: "0:2",
          parentKey: SECOND_POSITION,
          data: "A",
        },
      ],
      [
        "1:0",
        {
          type: CrdtType.MAP,
          parentId: "root",
          parentKey: "map",
        },
      ],
    ]);

    const results = engines.map((e) =>
      e.getTreesDiffOperations(currentItems, newItems)
    );

    // All engines must produce the same result
    for (let i = 1; i < results.length; i++) {
      expect(results[i]).toEqual(results[0]);
    }
  });
});
