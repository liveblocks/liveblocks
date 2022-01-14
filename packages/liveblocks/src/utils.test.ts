import { FIRST_POSITION, SECOND_POSITION } from "../test/utils";
import { CrdtType, OpType, SerializedCrdt } from "./live";
import { getTreesDiffOperations } from "./utils";

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
});
