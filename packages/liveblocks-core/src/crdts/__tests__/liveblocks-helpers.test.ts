import fc from "fast-check";
import { describe, expect, test } from "vitest";

import {
  FIFTH_POSITION,
  FIRST_POSITION,
  FOURTH_POSITION,
  SECOND_POSITION,
  THIRD_POSITION,
} from "../../__tests__/_MockWebSocketServer.setup";
import { stableStringify } from "../../lib/stringify";
import { OpCode } from "../../protocol/Op";
import type { NodeMap } from "../../protocol/StorageNode";
import { CrdtType } from "../../protocol/StorageNode";
import {
  diffNodeMap,
  isJsonEq,
  liveObjectFromNodeStream,
} from "../liveblocks-helpers";
import { LiveList } from "../LiveList";
import { LiveMap } from "../LiveMap";
import { LiveObject } from "../LiveObject";
import { toPlainLson } from "../utils";

test("Common first positions", () => {
  expect.soft(FIRST_POSITION).toBe("!");
  expect.soft(SECOND_POSITION).toBe("!!"); // V=2+3 algo jumps it to two chars immediately
  expect.soft(THIRD_POSITION).toBe('!"');
  expect.soft(FOURTH_POSITION).toBe("!#");
  expect.soft(FIFTH_POSITION).toBe("!$");
});

describe("liveObjectFromNodeStream", () => {
  test("reconstructs an empty document", () => {
    const root = liveObjectFromNodeStream([
      ["root", { type: CrdtType.OBJECT, data: {} }],
    ]);
    expect(root.toJSON()).toEqual({});
  });

  test("reconstructs scalar fields and nested objects", () => {
    const root = liveObjectFromNodeStream([
      ["root", { type: CrdtType.OBJECT, data: { a: 1 } }],
      [
        "0:1",
        {
          type: CrdtType.OBJECT,
          parentId: "root",
          parentKey: "nested",
          data: { b: 2 },
        },
      ],
    ]);
    expect(root.toJSON()).toEqual({ a: 1, nested: { b: 2 } });
  });

  test("reconstructs lists (deserializing children must not mint fresh ids)", () => {
    const root = liveObjectFromNodeStream([
      ["root", { type: CrdtType.OBJECT, data: {} }],
      ["0:1", { type: CrdtType.LIST, parentId: "root", parentKey: "items" }],
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
    expect(root.toJSON()).toEqual({ items: ["A", "B"] });
  });

  test("refuses mutation -- it is a read-only snapshot", () => {
    const root = liveObjectFromNodeStream([
      ["root", { type: CrdtType.OBJECT, data: { a: 1 } }],
    ]);
    expect(() => root.set("b", 2)).toThrow("read-only snapshot");
  });
});

describe("diffNodeMap", () => {
  test("new liveList Register item", () => {
    const currentItems: NodeMap = new Map([
      ["root", { type: CrdtType.OBJECT, data: {} }],
      ["0:1", { type: CrdtType.LIST, parentId: "root", parentKey: "items" }],
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

    const ops = diffNodeMap(currentItems, newItems);

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
      ["0:1", { type: CrdtType.LIST, parentId: "root", parentKey: "items" }],
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

    const ops = diffNodeMap(currentItems, newItems);

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
      ["0:1", { type: CrdtType.LIST, parentId: "root", parentKey: "items" }],
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
      ["0:1", { type: CrdtType.LIST, parentId: "root", parentKey: "items" }],
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

    const ops = diffNodeMap(currentItems, newItems);

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
        // different value
        "0:1",
        {
          type: CrdtType.OBJECT,
          parentId: "root",
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
          parentId: "root",
          parentKey: "item2",
          data: { a: 1 },
        },
      ],
    ]);

    const ops = diffNodeMap(currentItems, newItems);

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
      {
        type: OpCode.DELETE_OBJECT_KEY,
        id: "0:2",
        key: "b",
      },
    ]);
  });

  test("liveObject replacing a non-object node of the same id", () => {
    const currentItems: NodeMap = new Map([
      ["root", { type: CrdtType.OBJECT, data: {} }],
      ["0:1", { type: CrdtType.LIST, parentId: "root", parentKey: "items" }],
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
      ["0:1", { type: CrdtType.LIST, parentId: "root", parentKey: "items" }],
      [
        "0:2",
        {
          type: CrdtType.OBJECT,
          parentId: "0:1",
          parentKey: FIRST_POSITION,
          data: { a: 1 },
        },
      ],
    ]);

    const ops = diffNodeMap(currentItems, newItems);

    expect(ops).toEqual([
      {
        type: OpCode.UPDATE_OBJECT,
        id: "0:2",
        data: { a: 1 },
      },
    ]);
  });

  test("new liveList", () => {
    const currentItems: NodeMap = new Map([
      ["root", { type: CrdtType.OBJECT, data: {} }],
    ]);

    const newItems = new Map(currentItems);
    newItems.set("0:1", {
      type: CrdtType.LIST,
      parentId: "root",
      parentKey: "items",
    });

    const ops = diffNodeMap(currentItems, newItems);

    expect(ops).toEqual([
      {
        type: OpCode.CREATE_LIST,
        id: "0:1",
        parentId: "root",
        parentKey: "items",
      },
    ]);
  });

  test("new liveMap", () => {
    const currentItems: NodeMap = new Map([
      ["root", { type: CrdtType.OBJECT, data: {} }],
    ]);

    const newItems = new Map(currentItems);
    newItems.set("0:1", {
      type: CrdtType.MAP,
      parentId: "root",
      parentKey: "map",
    });

    const ops = diffNodeMap(currentItems, newItems);

    expect(ops).toEqual([
      {
        type: OpCode.CREATE_MAP,
        id: "0:1",
        parentId: "root",
        parentKey: "map",
      },
    ]);
  });

  test("new liveObject", () => {
    const currentItems: NodeMap = new Map([
      ["root", { type: CrdtType.OBJECT, data: {} }],
    ]);

    const newItems = new Map(currentItems);
    newItems.set("0:1", {
      type: CrdtType.OBJECT,
      parentId: "root",
      parentKey: "item",
      data: { a: 1 },
    });

    const ops = diffNodeMap(currentItems, newItems);

    expect(ops).toEqual([
      {
        type: OpCode.CREATE_OBJECT,
        id: "0:1",
        parentId: "root",
        parentKey: "item",
        data: { a: 1 },
      },
    ]);
  });

  test("new liveObject without a parent throws", () => {
    const currentItems: NodeMap = new Map([
      ["root", { type: CrdtType.OBJECT, data: {} }],
    ]);

    const newItems = new Map(currentItems);
    newItems.set("0:1", { type: CrdtType.OBJECT, data: { a: 1 } });

    expect(() => diffNodeMap(currentItems, newItems)).toThrow(
      "Internal error. Cannot serialize storage root into an operation"
    );
  });

  test("emits parent creates before child creates even when target nodes are unordered", () => {
    const currentItems: NodeMap = new Map([
      ["root", { type: CrdtType.OBJECT, data: {} }],
    ]);

    // A node stream (e.g. iter_all) is unordered: here the register child comes
    // *before* its parent list. The diff must still emit the CREATE_LIST before
    // the CREATE_REGISTER, otherwise applying the ops drops the child (its
    // parent isn't in the pool yet).
    const newItems: NodeMap = new Map();
    newItems.set("root", { type: CrdtType.OBJECT, data: {} });
    newItems.set("0:2", {
      type: CrdtType.REGISTER,
      parentId: "0:1",
      parentKey: FIRST_POSITION,
      data: "A",
    });
    newItems.set("0:1", {
      type: CrdtType.LIST,
      parentId: "root",
      parentKey: "items",
    });

    const ops = diffNodeMap(currentItems, newItems);
    const listIdx = ops.findIndex(
      (op) => op.type === OpCode.CREATE_LIST && op.id === "0:1"
    );
    const regIdx = ops.findIndex(
      (op) => op.type === OpCode.CREATE_REGISTER && op.id === "0:2"
    );

    expect(listIdx).toBeGreaterThanOrEqual(0);
    expect(regIdx).toBeGreaterThanOrEqual(0);
    expect(listIdx).toBeLessThan(regIdx);
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

describe("isJsonEq", () => {
  test("[property] true iff the stable stringifications match", () => {
    fc.assert(
      fc.property(fc.jsonValue(), fc.jsonValue(), (j1, j2) => {
        expect(isJsonEq(j1, j2)).toBe(
          stableStringify(j1) === stableStringify(j2)
        );
      })
    );
  });

  test("[property] reflexive: a value always equals (a clone of) itself", () => {
    fc.assert(
      fc.property(fc.jsonValue(), (j) => {
        expect(isJsonEq(j, structuredClone(j))).toBe(true);
      })
    );
  });
});
