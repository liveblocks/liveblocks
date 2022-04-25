import each from "jest-each";

import { FIRST_POSITION, SECOND_POSITION, withDateNow } from "../test/utils";
import { CrdtType, OpType, SerializedCrdt } from "./live";
import {
  getTreesDiffOperations,
  findNonSerializableValue,
  isTokenValid,
  compact,
} from "./utils";

describe("compact", () => {
  it("compact w/ empty list", () => {
    expect(compact([])).toEqual([]);
  });

  it("icompact removes nulls and undefined values", () => {
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

describe("isTokenValid", () => {
  const tokenExpiredDate = 1649190106;
  const token =
    "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb29tSWQiOiJvcG5NVEpZVTYtZDlxYXliSGRJcmciLCJhcHBJZCI6IjYwOWRiZjA2ZWEzZTUxZDQxM2NkM2UxZCIsImFjdG9yIjoxMDQsInNjb3BlcyI6WyJyb29tOnJlYWQiLCJyb29tOndyaXRlIiwid2Vic29ja2V0OnByZXNlbmNlIiwid2Vic29ja2V0OnN0b3JhZ2UiXSwibWF4Q29ubmVjdGlvbnNQZXJSb29tIjoyMCwibWF4Q29ubmVjdGlvbnMiOjIwMDAsImlhdCI6MTY0OTE4NjUwNiwiZXhwIjoxNjQ5MTkwMTA2fQ.WU3EPGN31ApmBh295ANMc42OlpQ2jqQyKoqN7hyxwgquN6IS6p3T_BUVtuu453e8FLwOTmC5OtLqdNb-YhmMZBnjonPjCkCZcgb7JwlexjIK70rELtm74JMYIZZ2hb3syY0Ib5lUtGZ4kYrKk11QK_FPnQzHfh_Es14V82xMLWB0Xi31Bi4bRWgMbi7oNsmEW43xBHdjosvWDiZ5db0jX8H24PscaGyR3Ce-ZUZXb3Ozm--XBc3HNpM9AAf8J5-WRIBJgzMzqCSuUybSUQvd8rEWu49o64PDQvMLdKieRxu2f-FYvI0Y59hS__p0EiSfQDdjfvHA-yKu56K9tbLLug";

  test("token is valid", () => {
    // 5 minutes and 1 second before the expiration date.
    const now = (tokenExpiredDate - 301) * 1000;

    withDateNow(now, () => {
      expect(isTokenValid(token)).toBeTruthy();
    });
  });

  test("token is expired", () => {
    // 4 minutes before the expiration date
    const now = (tokenExpiredDate - 240) * 1000;

    withDateNow(now, () => {
      expect(isTokenValid(token)).toBeFalsy();
    });
  });
});
