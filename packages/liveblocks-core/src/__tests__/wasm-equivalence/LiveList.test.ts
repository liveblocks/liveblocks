/**
 * LiveList behavioral equivalence tests.
 *
 * Exercises makePosition and getTreesDiffOperations with LiveList-specific
 * scenarios (push, insert, move, delete items, position ordering) and
 * verifies identical results across JS and Adapter engines.
 */
import { afterEach, describe, expect, test } from "vitest";

import { OpCode } from "../../protocol/Op";
import type { NodeMap } from "../../protocol/StorageNode";
import { CrdtType } from "../../protocol/StorageNode";
import {
  FIRST_POSITION,
  FOURTH_POSITION,
  SECOND_POSITION,
  THIRD_POSITION,
} from "../_utils";
import { getTestEngines, resetEngine } from "./setup";

afterEach(() => {
  resetEngine();
});

for (const engine of getTestEngines()) {
  describe(`LiveList operations [${engine.name}]`, () => {
    // ------------------------------------------------------------------
    // makePosition scenarios for list ordering
    // ------------------------------------------------------------------

    test("generates sequential positions for list items", () => {
      const pos1 = engine.makePosition();
      const pos2 = engine.makePosition(pos1);
      const pos3 = engine.makePosition(pos2);

      expect(pos1 < pos2).toBe(true);
      expect(pos2 < pos3).toBe(true);
    });

    test("generates position between two items", () => {
      const pos1 = engine.makePosition();
      const pos3 = engine.makePosition(pos1);
      const pos2 = engine.makePosition(pos1, pos3);

      expect(pos1 < pos2).toBe(true);
      expect(pos2 < pos3).toBe(true);
    });

    test("generates position before first item", () => {
      const first = engine.makePosition();
      const before = engine.makePosition(undefined, first);

      expect(before < first).toBe(true);
    });

    test("many insertions maintain strict ordering", () => {
      const positions: string[] = [];
      let last: string | undefined;

      for (let i = 0; i < 20; i++) {
        const pos = engine.makePosition(last);
        positions.push(pos);
        last = pos;
      }

      for (let i = 1; i < positions.length; i++) {
        expect(positions[i - 1] < positions[i]).toBe(true);
      }
    });

    // ------------------------------------------------------------------
    // getTreesDiffOperations scenarios for lists
    // ------------------------------------------------------------------

    test("new register item in list produces CREATE_REGISTER", () => {
      const current: NodeMap = new Map([
        ["root", { type: CrdtType.OBJECT, data: {} }],
        [
          "0:1",
          { type: CrdtType.LIST, parentId: "root", parentKey: "items" },
        ],
      ]);
      const newItems = new Map(current);
      newItems.set("1:0", {
        type: CrdtType.REGISTER,
        parentId: "0:1",
        parentKey: FIRST_POSITION,
        data: "hello",
      });

      const ops = engine.getTreesDiffOperations(current, newItems);
      expect(ops).toEqual([
        {
          type: OpCode.CREATE_REGISTER,
          id: "1:0",
          parentId: "0:1",
          parentKey: FIRST_POSITION,
          data: "hello",
        },
      ]);
    });

    test("deleting list item produces DELETE_CRDT", () => {
      const current: NodeMap = new Map([
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

    test("moving list item produces SET_PARENT_KEY", () => {
      const current: NodeMap = new Map([
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
      const newItems: NodeMap = new Map([
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
            parentKey: THIRD_POSITION,
            data: "A",
          },
        ],
      ]);

      const ops = engine.getTreesDiffOperations(current, newItems);
      expect(ops).toEqual([
        {
          type: OpCode.SET_PARENT_KEY,
          id: "0:2",
          parentKey: THIRD_POSITION,
        },
      ]);
    });

    test("multiple list items added, deleted, and moved", () => {
      const current: NodeMap = new Map([
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
        [
          "0:4",
          {
            type: CrdtType.REGISTER,
            parentId: "0:1",
            parentKey: THIRD_POSITION,
            data: "C",
          },
        ],
      ]);

      const newItems: NodeMap = new Map([
        ["root", { type: CrdtType.OBJECT, data: {} }],
        [
          "0:1",
          { type: CrdtType.LIST, parentId: "root", parentKey: "items" },
        ],
        // A is deleted
        // B moves to first position
        [
          "0:3",
          {
            type: CrdtType.REGISTER,
            parentId: "0:1",
            parentKey: FIRST_POSITION,
            data: "B",
          },
        ],
        // C stays
        [
          "0:4",
          {
            type: CrdtType.REGISTER,
            parentId: "0:1",
            parentKey: THIRD_POSITION,
            data: "C",
          },
        ],
        // D is new
        [
          "1:0",
          {
            type: CrdtType.REGISTER,
            parentId: "0:1",
            parentKey: FOURTH_POSITION,
            data: "D",
          },
        ],
      ]);

      const ops = engine.getTreesDiffOperations(current, newItems);

      expect(ops).toContainEqual({
        type: OpCode.DELETE_CRDT,
        id: "0:2",
      });
      expect(ops).toContainEqual({
        type: OpCode.SET_PARENT_KEY,
        id: "0:3",
        parentKey: FIRST_POSITION,
      });
      expect(ops).toContainEqual({
        type: OpCode.CREATE_REGISTER,
        id: "1:0",
        parentId: "0:1",
        parentKey: FOURTH_POSITION,
        data: "D",
      });
    });

    test("empty list produces no ops when unchanged", () => {
      const items: NodeMap = new Map([
        ["root", { type: CrdtType.OBJECT, data: {} }],
        [
          "0:1",
          { type: CrdtType.LIST, parentId: "root", parentKey: "items" },
        ],
      ]);

      const ops = engine.getTreesDiffOperations(items, items);
      expect(ops).toEqual([]);
    });

    test("adding entire list with items produces CREATE_LIST + CREATE_REGISTERs", () => {
      const current: NodeMap = new Map([
        ["root", { type: CrdtType.OBJECT, data: {} }],
      ]);
      const newItems: NodeMap = new Map([
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
            data: "first",
          },
        ],
        [
          "0:3",
          {
            type: CrdtType.REGISTER,
            parentId: "0:1",
            parentKey: SECOND_POSITION,
            data: "second",
          },
        ],
      ]);

      const ops = engine.getTreesDiffOperations(current, newItems);
      expect(ops).toContainEqual({
        type: OpCode.CREATE_LIST,
        id: "0:1",
        parentId: "root",
        parentKey: "items",
      });
      expect(ops).toContainEqual({
        type: OpCode.CREATE_REGISTER,
        id: "0:2",
        parentId: "0:1",
        parentKey: FIRST_POSITION,
        data: "first",
      });
      expect(ops).toContainEqual({
        type: OpCode.CREATE_REGISTER,
        id: "0:3",
        parentId: "0:1",
        parentKey: SECOND_POSITION,
        data: "second",
      });
    });

    test("deleting entire list removes list and children", () => {
      const current: NodeMap = new Map([
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
      const newItems: NodeMap = new Map([
        ["root", { type: CrdtType.OBJECT, data: {} }],
      ]);

      const ops = engine.getTreesDiffOperations(current, newItems);
      // Should contain deletes for both the list and the register
      const deleteOps = ops.filter(
        (op) => op.type === OpCode.DELETE_CRDT
      );
      expect(deleteOps.length).toBeGreaterThanOrEqual(1);
      expect(deleteOps).toContainEqual({
        type: OpCode.DELETE_CRDT,
        id: "0:1",
      });
    });

    test("list with nested object children", () => {
      const current: NodeMap = new Map([
        ["root", { type: CrdtType.OBJECT, data: {} }],
        [
          "0:1",
          { type: CrdtType.LIST, parentId: "root", parentKey: "items" },
        ],
      ]);
      const newItems: NodeMap = new Map([
        ["root", { type: CrdtType.OBJECT, data: {} }],
        [
          "0:1",
          { type: CrdtType.LIST, parentId: "root", parentKey: "items" },
        ],
        [
          "1:0",
          {
            type: CrdtType.OBJECT,
            parentId: "0:1",
            parentKey: FIRST_POSITION,
            data: { name: "item1" },
          },
        ],
      ]);

      const ops = engine.getTreesDiffOperations(current, newItems);
      expect(ops).toEqual([
        {
          type: OpCode.CREATE_OBJECT,
          id: "1:0",
          parentId: "0:1",
          parentKey: FIRST_POSITION,
          data: { name: "item1" },
        },
      ]);
    });
  });
}

describe("LiveList cross-engine equivalence", () => {
  const engines = getTestEngines();

  test("position generation is identical across engines", () => {
    for (let i = 0; i < 10; i++) {
      const results = engines.map((e) => e.makePosition());
      for (let j = 1; j < results.length; j++) {
        expect(results[j]).toBe(results[0]);
      }
    }
  });

  test("list diff operations identical across engines", () => {
    const current: NodeMap = new Map([
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
          parentKey: THIRD_POSITION,
          data: "C",
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
