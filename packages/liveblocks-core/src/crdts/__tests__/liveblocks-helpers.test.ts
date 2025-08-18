import { describe, expect, test } from "vitest";

import { FIRST_POSITION, SECOND_POSITION } from "../../__tests__/_utils";
import { OpCode } from "../../protocol/Op";
import { CrdtType } from "../../protocol/SerializedCrdt";
import type { NodeMap } from "../../types/NodeMap";
import {
  findNonSerializableValue,
  getTreesDiffOperations,
} from "../liveblocks-helpers";
import { LiveList } from "../LiveList";
import { LiveMap } from "../LiveMap";
import { LiveObject } from "../LiveObject";
import { toPlainLson } from "../utils";

describe("getTreesDiffOperations", () => {
  test("new liveList Register item", () => {
    const currentItems: NodeMap = new Map([
      ["0:0", { type: CrdtType.OBJECT, data: {} }],
      ["0:1", { type: CrdtType.LIST, parentId: "0:0", parentKey: "items" }],
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

    const ops = getTreesDiffOperations(currentItems, newItems);

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
      ["0:0", { type: CrdtType.OBJECT, data: {} }],
      ["0:1", { type: CrdtType.LIST, parentId: "0:0", parentKey: "items" }],
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

    const ops = getTreesDiffOperations(currentItems, newItems);

    expect(ops).toEqual([
      {
        type: OpCode.DELETE_CRDT,
        id: "0:2",
      },
    ]);
  });

  test("liveList item moved, added and deleted", () => {
    const currentItems: NodeMap = new Map([
      ["0:0", { type: CrdtType.OBJECT, data: {} }],
      ["0:1", { type: CrdtType.LIST, parentId: "0:0", parentKey: "items" }],
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
      ["0:0", { type: CrdtType.OBJECT, data: {} }],
      ["0:1", { type: CrdtType.LIST, parentId: "0:0", parentKey: "items" }],
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

    const ops = getTreesDiffOperations(currentItems, newItems);

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
      ["0:0", { type: CrdtType.OBJECT, data: {} }],
      [
        "0:1",
        {
          type: CrdtType.OBJECT,
          parentId: "0:0",
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
          parentId: "0:0",
          parentKey: "item2",
          data: { a: 1 },
        },
      ],
    ]);

    const newItems: NodeMap = new Map([
      ["0:0", { type: CrdtType.OBJECT, data: {} }],
      [
        // different value
        "0:1",
        {
          type: CrdtType.OBJECT,
          parentId: "0:0",
          parentKey: "item",
          data: { a: 2 },
        },
      ],
      [
        // Different key
        "0:2",
        {
          type: CrdtType.OBJECT,
          parentId: "0:1",
          parentKey: "subItem",
          data: { c: 1 },
        },
      ],
      [
        // Same object
        "0:3",
        {
          type: CrdtType.OBJECT,
          parentId: "0:0",
          parentKey: "item2",
          data: { a: 1 },
        },
      ],
    ]);

    const ops = getTreesDiffOperations(currentItems, newItems);

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
});

describe("findNonSerializableValue", () => {
  test("findNonSerializableValue should return path and value of non serializable value", () => {
    for (const [value, expectedPath] of [
      [null, false],
      [undefined, false],
      [1, false],
      [true, false],
      [[], false],
      ["a", false],
      [{ a: "a" }, false],
      [{ a: () => {} }, "a"],
      [() => {}, "root"],
      [[() => {}], "0"],
      [{ a: [() => {}] }, "a.0"],
      [{ a: new Map() }, "a"], // Map will be accepted in the future
    ]) {
      const result = findNonSerializableValue(value);
      if (result) {
        expect(result.path).toEqual(expectedPath);
      } else {
        expect(result).toEqual(false);
      }
    }
  });
});

describe("toPlainLson", () => {
  test("toPlainLson with a plain object should not change", () => {
    const mockPlainObject = {
      fruits: ["strawberry", "apple", "mango"],
      vegetables: { broccoli: "delicious", spinach: "also tasty" },
    };
    expect(toPlainLson(mockPlainObject)).toEqual(mockPlainObject);
  });

  test("toPlainLson with a liveStructure object should return plain lson object", () => {
    const mockLsonObject = new LiveObject({
      fruits: new LiveList(["strawberry", "apple", "mango"]),
      vegetables: new LiveMap([
        ["broccoli", "delicious"],
        ["spinach", "also tasty"],
      ]),
    });

    // What the Plain Lson should look like if the util works
    const plainLsonValue = {
      liveblocksType: "LiveObject",
      data: {
        fruits: {
          liveblocksType: "LiveList",
          data: ["strawberry", "apple", "mango"],
        },
        vegetables: {
          liveblocksType: "LiveMap",
          data: { broccoli: "delicious", spinach: "also tasty" },
        },
      },
    };

    expect(toPlainLson(mockLsonObject)).toEqual(plainLsonValue);
  });

  // See https://github.com/liveblocks/liveblocks/issues/1304
  test("toPlainLson regression #1", () => {
    const mockLsonObject = new LiveObject({
      a: null,
      b: 0,
      c: false,
      d: undefined,
    });

    // What the Plain Lson should look like if the util works
    const plainLsonValue = {
      liveblocksType: "LiveObject",
      data: {
        a: null,
        b: 0,
        c: false,
      },
    };

    expect(toPlainLson(mockLsonObject)).toEqual(plainLsonValue);
  });
});
