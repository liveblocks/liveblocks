import each from "jest-each";

import type { NodeMap } from "../types";
import { CrdtType, OpCode } from "../types";
import {
  b64decode,
  compact,
  findNonSerializableValue,
  getTreesDiffOperations,
  tryParseJson,
} from "../utils";
import { FIRST_POSITION, SECOND_POSITION } from "./_utils";

describe("compact", () => {
  it("compact w/ empty list", () => {
    expect(compact([])).toEqual([]);
  });

  it("compact removes nulls and undefined values", () => {
    expect(compact(["a", "b", "c"])).toEqual(["a", "b", "c"]);
    expect(compact(["x", undefined])).toEqual(["x"]);
    expect(compact([0, null, undefined, NaN, Infinity])).toEqual([
      0,
      NaN,
      Infinity,
    ]);
  });
});

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
  each([
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
  ]).test(
    "findNonSerializableValue should return path and value of non serializable value",
    (value, expectedPath) => {
      const result = findNonSerializableValue(value);

      if (result) {
        expect(result.path).toEqual(expectedPath);
      } else {
        expect(result).toEqual(false);
      }
    }
  );
});

describe("b64decode", () => {
  test("payload contains characters with accents", () => {
    const tokenPayload =
      "eyJyb29tSWQiOiJNaDNtTGQ1OUxWSjdLQTJlVWIwTWUiLCJhcHBJZCI6IjYxNDBlMzMyMjliY2ExNWQxNDYxMzBhOSIsImFjdG9yIjo5LCJzY29wZXMiOlsicm9vbTpyZWFkIiwicm9vbTp3cml0ZSIsIndlYnNvY2tldDpwcmVzZW5jZSIsIndlYnNvY2tldDpzdG9yYWdlIl0sImluZm8iOnsibmFtZSI6IkNoYXJsacOpIExheW5lIiwicGljdHVyZSI6Ii9hdmF0YXJzLzcucG5nIn0sImlhdCI6MTY1MzUxNjA4NiwiZXhwIjoxNjUzNTE5Njg2fQ";
    const json = tryParseJson(b64decode(tokenPayload));

    expect(json).toEqual({
      actor: 9,
      appId: "6140e33229bca15d146130a9",
      exp: 1653519686,
      iat: 1653516086,
      info: {
        name: "Charlié Layne",
        picture: "/avatars/7.png",
      },
      roomId: "Mh3mLd59LVJ7KA2eUb0Me",
      scopes: [
        "room:read",
        "room:write",
        "websocket:presence",
        "websocket:storage",
      ],
    });
  });
});
