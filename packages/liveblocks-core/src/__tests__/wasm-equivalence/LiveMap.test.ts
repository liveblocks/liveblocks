/**
 * LiveMap behavioral equivalence tests.
 *
 * Exercises getTreesDiffOperations with LiveMap-specific scenarios
 * (key-value insertion/deletion/replacement, nested structures)
 * and verifies identical results across JS and Adapter engines.
 */
import { afterEach, describe, expect, test } from "vitest";

import { OpCode } from "../../protocol/Op";
import { CrdtType } from "../../protocol/StorageNode";
import type { NodeMap } from "../../protocol/StorageNode";
import { FIRST_POSITION } from "../_utils";
import { getTestEngines, resetEngine } from "./setup";

afterEach(() => {
  resetEngine();
});

for (const engine of getTestEngines()) {
  describe(`LiveMap operations [${engine.name}]`, () => {
    test("new map child produces CREATE_MAP", () => {
      const current: NodeMap = new Map([
        ["root", { type: CrdtType.OBJECT, data: {} }],
      ]);
      const newItems: NodeMap = new Map([
        ["root", { type: CrdtType.OBJECT, data: {} }],
        [
          "0:1",
          { type: CrdtType.MAP, parentId: "root", parentKey: "data" },
        ],
      ]);

      const ops = engine.getTreesDiffOperations(current, newItems);
      expect(ops).toEqual([
        {
          type: OpCode.CREATE_MAP,
          id: "0:1",
          parentId: "root",
          parentKey: "data",
        },
      ]);
    });

    test("deleting map produces DELETE_CRDT", () => {
      const current: NodeMap = new Map([
        ["root", { type: CrdtType.OBJECT, data: {} }],
        [
          "0:1",
          { type: CrdtType.MAP, parentId: "root", parentKey: "data" },
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

    test("map with register children - adding entry", () => {
      const current: NodeMap = new Map([
        ["root", { type: CrdtType.OBJECT, data: {} }],
        [
          "0:1",
          { type: CrdtType.MAP, parentId: "root", parentKey: "data" },
        ],
        [
          "0:2",
          {
            type: CrdtType.REGISTER,
            parentId: "0:1",
            parentKey: "key1",
            data: "value1",
          },
        ],
      ]);
      const newItems = new Map(current);
      newItems.set("1:0", {
        type: CrdtType.REGISTER,
        parentId: "0:1",
        parentKey: "key2",
        data: "value2",
      });

      const ops = engine.getTreesDiffOperations(current, newItems);
      expect(ops).toEqual([
        {
          type: OpCode.CREATE_REGISTER,
          id: "1:0",
          parentId: "0:1",
          parentKey: "key2",
          data: "value2",
        },
      ]);
    });

    test("map with register children - deleting entry", () => {
      const current: NodeMap = new Map([
        ["root", { type: CrdtType.OBJECT, data: {} }],
        [
          "0:1",
          { type: CrdtType.MAP, parentId: "root", parentKey: "data" },
        ],
        [
          "0:2",
          {
            type: CrdtType.REGISTER,
            parentId: "0:1",
            parentKey: "key1",
            data: "value1",
          },
        ],
        [
          "0:3",
          {
            type: CrdtType.REGISTER,
            parentId: "0:1",
            parentKey: "key2",
            data: "value2",
          },
        ],
      ]);
      const newItems = new Map(current);
      newItems.delete("0:2");

      const ops = engine.getTreesDiffOperations(current, newItems);
      expect(ops).toEqual([
        {
          type: OpCode.DELETE_CRDT,
          id: "0:2",
        },
      ]);
    });

    test("map with nested object values", () => {
      const current: NodeMap = new Map([
        ["root", { type: CrdtType.OBJECT, data: {} }],
        [
          "0:1",
          { type: CrdtType.MAP, parentId: "root", parentKey: "users" },
        ],
      ]);
      const newItems: NodeMap = new Map([
        ["root", { type: CrdtType.OBJECT, data: {} }],
        [
          "0:1",
          { type: CrdtType.MAP, parentId: "root", parentKey: "users" },
        ],
        [
          "1:0",
          {
            type: CrdtType.OBJECT,
            parentId: "0:1",
            parentKey: "alice",
            data: { name: "Alice", age: 30 },
          },
        ],
      ]);

      const ops = engine.getTreesDiffOperations(current, newItems);
      expect(ops).toEqual([
        {
          type: OpCode.CREATE_OBJECT,
          id: "1:0",
          parentId: "0:1",
          parentKey: "alice",
          data: { name: "Alice", age: 30 },
        },
      ]);
    });

    test("map nested object data change produces UPDATE_OBJECT", () => {
      const current: NodeMap = new Map([
        ["root", { type: CrdtType.OBJECT, data: {} }],
        [
          "0:1",
          { type: CrdtType.MAP, parentId: "root", parentKey: "users" },
        ],
        [
          "0:2",
          {
            type: CrdtType.OBJECT,
            parentId: "0:1",
            parentKey: "alice",
            data: { name: "Alice", age: 30 },
          },
        ],
      ]);
      const newItems: NodeMap = new Map([
        ["root", { type: CrdtType.OBJECT, data: {} }],
        [
          "0:1",
          { type: CrdtType.MAP, parentId: "root", parentKey: "users" },
        ],
        [
          "0:2",
          {
            type: CrdtType.OBJECT,
            parentId: "0:1",
            parentKey: "alice",
            data: { name: "Alice", age: 31 },
          },
        ],
      ]);

      const ops = engine.getTreesDiffOperations(current, newItems);
      expect(ops).toEqual([
        {
          type: OpCode.UPDATE_OBJECT,
          id: "0:2",
          data: { name: "Alice", age: 31 },
        },
      ]);
    });

    test("empty map unchanged produces no ops", () => {
      const items: NodeMap = new Map([
        ["root", { type: CrdtType.OBJECT, data: {} }],
        [
          "0:1",
          { type: CrdtType.MAP, parentId: "root", parentKey: "data" },
        ],
      ]);

      const ops = engine.getTreesDiffOperations(items, items);
      expect(ops).toEqual([]);
    });

    test("map containing list children", () => {
      const current: NodeMap = new Map([
        ["root", { type: CrdtType.OBJECT, data: {} }],
        [
          "0:1",
          { type: CrdtType.MAP, parentId: "root", parentKey: "channels" },
        ],
      ]);
      const newItems: NodeMap = new Map([
        ["root", { type: CrdtType.OBJECT, data: {} }],
        [
          "0:1",
          { type: CrdtType.MAP, parentId: "root", parentKey: "channels" },
        ],
        [
          "1:0",
          {
            type: CrdtType.LIST,
            parentId: "0:1",
            parentKey: "general",
          },
        ],
        [
          "1:1",
          {
            type: CrdtType.REGISTER,
            parentId: "1:0",
            parentKey: FIRST_POSITION,
            data: "hello",
          },
        ],
      ]);

      const ops = engine.getTreesDiffOperations(current, newItems);
      expect(ops).toContainEqual({
        type: OpCode.CREATE_LIST,
        id: "1:0",
        parentId: "0:1",
        parentKey: "general",
      });
      expect(ops).toContainEqual({
        type: OpCode.CREATE_REGISTER,
        id: "1:1",
        parentId: "1:0",
        parentKey: FIRST_POSITION,
        data: "hello",
      });
    });

    test("complex map operations: add, delete, and update simultaneously", () => {
      const current: NodeMap = new Map([
        ["root", { type: CrdtType.OBJECT, data: {} }],
        [
          "0:1",
          { type: CrdtType.MAP, parentId: "root", parentKey: "data" },
        ],
        [
          "0:2",
          {
            type: CrdtType.REGISTER,
            parentId: "0:1",
            parentKey: "toDelete",
            data: "gone",
          },
        ],
        [
          "0:3",
          {
            type: CrdtType.OBJECT,
            parentId: "0:1",
            parentKey: "toUpdate",
            data: { val: "old" },
          },
        ],
      ]);
      const newItems: NodeMap = new Map([
        ["root", { type: CrdtType.OBJECT, data: {} }],
        [
          "0:1",
          { type: CrdtType.MAP, parentId: "root", parentKey: "data" },
        ],
        // 0:2 deleted
        // 0:3 updated
        [
          "0:3",
          {
            type: CrdtType.OBJECT,
            parentId: "0:1",
            parentKey: "toUpdate",
            data: { val: "new" },
          },
        ],
        // 1:0 added
        [
          "1:0",
          {
            type: CrdtType.REGISTER,
            parentId: "0:1",
            parentKey: "newKey",
            data: 42,
          },
        ],
      ]);

      const ops = engine.getTreesDiffOperations(current, newItems);

      expect(ops).toContainEqual({
        type: OpCode.DELETE_CRDT,
        id: "0:2",
      });
      expect(ops).toContainEqual({
        type: OpCode.UPDATE_OBJECT,
        id: "0:3",
        data: { val: "new" },
      });
      expect(ops).toContainEqual({
        type: OpCode.CREATE_REGISTER,
        id: "1:0",
        parentId: "0:1",
        parentKey: "newKey",
        data: 42,
      });
    });
  });
}

describe("LiveMap cross-engine equivalence", () => {
  const engines = getTestEngines();

  test("map diff operations identical across engines", () => {
    const current: NodeMap = new Map([
      ["root", { type: CrdtType.OBJECT, data: {} }],
      [
        "0:1",
        { type: CrdtType.MAP, parentId: "root", parentKey: "store" },
      ],
      [
        "0:2",
        {
          type: CrdtType.REGISTER,
          parentId: "0:1",
          parentKey: "x",
          data: 1,
        },
      ],
      [
        "0:3",
        {
          type: CrdtType.OBJECT,
          parentId: "0:1",
          parentKey: "settings",
          data: { a: true },
        },
      ],
    ]);

    const newItems: NodeMap = new Map([
      ["root", { type: CrdtType.OBJECT, data: {} }],
      [
        "0:1",
        { type: CrdtType.MAP, parentId: "root", parentKey: "store" },
      ],
      [
        "0:3",
        {
          type: CrdtType.OBJECT,
          parentId: "0:1",
          parentKey: "settings",
          data: { a: false, b: true },
        },
      ],
      [
        "1:0",
        {
          type: CrdtType.LIST,
          parentId: "0:1",
          parentKey: "items",
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
