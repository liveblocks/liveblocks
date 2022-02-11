import each from "jest-each";
import { FIRST_POSITION, SECOND_POSITION } from "../test/utils";
import { CrdtType, OpType, SerializedCrdt } from "./live";
import { getTreesDiffOperations, findNonSerializableValue } from "./utils";

describe("getTreesDiffOperations", () => {
  test("new liveList Register item", () => {
    const currentItems = new Map<string, SerializedCrdt>([
      ["0:0", { type: CrdtType.Object, data: {} }],
      ["0:1", { type: CrdtType.List, parentId: "0:0", parentKey: "items" }],
      [
        "0:2",
        {
          type: CrdtType.Register,
          parentId: "0:1",
          parentKey: FIRST_POSITION,
          data: "A",
        },
      ],
    ]);

    const newItems = new Map(currentItems);
    newItems.set("1:1", {
      type: CrdtType.Register,
      parentId: "0:1",
      parentKey: SECOND_POSITION,
      data: "B",
    });

    const ops = getTreesDiffOperations(currentItems, newItems);

    expect(ops).toEqual([
      {
        type: OpType.CreateRegister,
        id: "1:1",
        parentId: "0:1",
        parentKey: SECOND_POSITION,
        data: "B",
      },
    ]);
  });

  test("delete liveList item", () => {
    const currentItems = new Map<string, SerializedCrdt>([
      ["0:0", { type: CrdtType.Object, data: {} }],
      ["0:1", { type: CrdtType.List, parentId: "0:0", parentKey: "items" }],
      [
        "0:2",
        {
          type: CrdtType.Register,
          parentId: "0:1",
          parentKey: FIRST_POSITION,
          data: "A",
        },
      ],
      [
        "0:3",
        {
          type: CrdtType.Register,
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
        type: OpType.DeleteCrdt,
        id: "0:2",
      },
    ]);
  });

  test("liveList item moved, added and deleted", () => {
    const currentItems = new Map<string, SerializedCrdt>([
      ["0:0", { type: CrdtType.Object, data: {} }],
      ["0:1", { type: CrdtType.List, parentId: "0:0", parentKey: "items" }],
      [
        "0:2",
        {
          type: CrdtType.Register,
          parentId: "0:1",
          parentKey: FIRST_POSITION,
          data: "A",
        },
      ],
      [
        "0:3",
        {
          type: CrdtType.Register,
          parentId: "0:1",
          parentKey: SECOND_POSITION,
          data: "B",
        },
      ],
    ]);

    const newItems = new Map<string, SerializedCrdt>([
      ["0:0", { type: CrdtType.Object, data: {} }],
      ["0:1", { type: CrdtType.List, parentId: "0:0", parentKey: "items" }],
      [
        "0:3",
        {
          type: CrdtType.Register,
          parentId: "0:1",
          parentKey: FIRST_POSITION,
          data: "B",
        },
      ],
      [
        "1:0",
        {
          type: CrdtType.Register,
          parentId: "0:1",
          parentKey: SECOND_POSITION,
          data: "C",
        },
      ],
    ]);

    const ops = getTreesDiffOperations(currentItems, newItems);

    expect(ops).toEqual([
      {
        type: OpType.DeleteCrdt,
        id: "0:2",
      },
      {
        type: OpType.SetParentKey,
        id: "0:3",
        parentKey: FIRST_POSITION,
      },
      {
        type: OpType.CreateRegister,
        id: "1:0",
        parentId: "0:1",
        parentKey: SECOND_POSITION,
        data: "C",
      },
    ]);
  });

  test("liveObject update", () => {
    const currentItems = new Map<string, SerializedCrdt>([
      ["0:0", { type: CrdtType.Object, data: {} }],
      [
        "0:1",
        {
          type: CrdtType.Object,
          parentId: "0:0",
          parentKey: "item",
          data: { a: 1 },
        },
      ],
      [
        "0:2",
        {
          type: CrdtType.Object,
          parentId: "0:1",
          parentKey: "subItem",
          data: { b: 1 },
        },
      ],
      [
        "0:3",
        {
          type: CrdtType.Object,
          parentId: "0:0",
          parentKey: "item2",
          data: { a: 1 },
        },
      ],
    ]);

    const newItems = new Map<string, SerializedCrdt>([
      ["0:0", { type: CrdtType.Object, data: {} }],
      [
        // different value
        "0:1",
        {
          type: CrdtType.Object,
          parentId: "0:0",
          parentKey: "item",
          data: { a: 2 },
        },
      ],
      [
        // Different key
        "0:2",
        {
          type: CrdtType.Object,
          parentId: "0:1",
          parentKey: "subItem",
          data: { c: 1 },
        },
      ],
      [
        // Same object
        "0:3",
        {
          type: CrdtType.Object,
          parentId: "0:0",
          parentKey: "item2",
          data: { a: 1 },
        },
      ],
    ]);

    const ops = getTreesDiffOperations(currentItems, newItems);

    expect(ops).toEqual([
      {
        type: OpType.UpdateObject,
        id: "0:1",
        data: { a: 2 },
      },
      {
        type: OpType.UpdateObject,
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
