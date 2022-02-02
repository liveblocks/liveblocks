import { LiveList, LiveMap } from ".";
import {
  createSerializedList,
  createSerializedObject,
  createSerializedRegister,
  prepareStorageImmutableTest,
  FIRST_POSITION,
  SECOND_POSITION,
  THIRD_POSITION,
  FOURTH_POSITION,
} from "../test/utils";
import { patchLiveObjectKey, patchImmutableObject } from "./immutable";
import { LiveObject } from "./LiveObject";
import { StorageUpdate } from "./types";

function applyStateChanges(state: any, applyChanges: () => void) {
  const oldState = JSON.parse(JSON.stringify(state));
  applyChanges();
  let newState = JSON.parse(JSON.stringify(state));

  return { oldState, newState };
}

describe("patchLiveObjectKey", () => {
  test("should set string", () => {
    const liveObject = new LiveObject();
    patchLiveObjectKey(liveObject, "key", undefined, "value");
    expect(liveObject.get("key")).toBe("value");
  });

  test("should set number", () => {
    const liveObject = new LiveObject();
    patchLiveObjectKey(liveObject, "key", undefined, 0);
    expect(liveObject.get("key")).toBe(0);
  });

  test("should set LiveObject if next is object", () => {
    const liveObject = new LiveObject();
    patchLiveObjectKey(liveObject, "key", undefined, { a: 0 });
    const value = liveObject.get("key");
    expect(value instanceof LiveObject).toBe(true);
    expect(value.toObject()).toEqual({ a: 0 });
  });

  test("should delete key if next is undefined", () => {
    const liveObject = new LiveObject({ key: "value" });
    patchLiveObjectKey(liveObject, "key", "value", undefined);
    expect(liveObject.toObject()).toEqual({});
  });
});

describe("2 ways tests with two clients", () => {
  describe("Object/LiveObject", () => {
    test("create object", async () => {
      const { storage, state, assert } = await prepareStorageImmutableTest<
        {
          syncObj: { a: number };
        },
        { syncObj: { a: number } }
      >([createSerializedObject("0:0", {})], 1);

      expect(state).toEqual({});

      const { oldState, newState } = applyStateChanges(state, () => {
        state.syncObj = { a: 1 };
      });

      patchLiveObjectKey(
        storage.root,
        "syncObj",
        oldState["syncObj"],
        newState["syncObj"]
      );

      assert({ syncObj: { a: 1 } }, 2, 1);
    });

    test("update object", async () => {
      const { storage, state, assert } = await prepareStorageImmutableTest<
        {
          syncObj: { a: number };
        },
        { syncObj: { a: number } }
      >(
        [
          createSerializedObject("0:0", {}),
          createSerializedObject("0:1", { a: 0 }, "0:0", "syncObj"),
        ],
        1
      );

      expect(state).toEqual({ syncObj: { a: 0 } });

      const { oldState, newState } = applyStateChanges(state, () => {
        state.syncObj.a = 1;
      });

      patchLiveObjectKey(
        storage.root,
        "syncObj",
        oldState["syncObj"],
        newState["syncObj"]
      );

      assert({ syncObj: { a: 1 } }, 2, 1);
    });

    test("add nested object", async () => {
      const { storage, state, assert } = await prepareStorageImmutableTest<
        {
          syncObj: { a: any };
        },
        {
          syncObj: { a: any };
        }
      >(
        [
          createSerializedObject("0:0", {}),
          createSerializedObject("0:1", { a: 0 }, "0:0", "syncObj"),
        ],
        1
      );

      expect(state).toEqual({ syncObj: { a: 0 } });

      const { oldState, newState } = applyStateChanges(state, () => {
        state.syncObj.a = { subA: "ok" };
      });

      patchLiveObjectKey(
        storage.root,
        "syncObj",
        oldState["syncObj"],
        newState["syncObj"]
      );

      assert({ syncObj: { a: { subA: "ok" } } }, 3, 1);
    });

    test("delete object key", async () => {
      const { storage, state, assert } = await prepareStorageImmutableTest<
        {
          syncObj: { a?: number };
        },
        { syncObj: { a?: number } }
      >(
        [
          createSerializedObject("0:0", {}),
          createSerializedObject("0:1", { a: 0 }, "0:0", "syncObj"),
        ],
        1
      );

      expect(state).toEqual({ syncObj: { a: 0 } });

      const { oldState, newState } = applyStateChanges(state, () => {
        delete state.syncObj.a;
      });

      patchLiveObjectKey(
        storage.root,
        "syncObj",
        oldState["syncObj"],
        newState["syncObj"]
      );

      assert({ syncObj: {} }, 2, 1);
    });
  });

  describe("Array/LiveList", () => {
    test("add item to array", async () => {
      const { storage, state, assert } = await prepareStorageImmutableTest<
        {
          syncList: LiveList<string>;
        },
        { syncList: string[] }
      >(
        [
          createSerializedObject("0:0", {}),
          createSerializedList("0:1", "0:0", "syncList"),
        ],
        1
      );

      const { oldState, newState } = applyStateChanges(state, () => {
        state.syncList.push("a");
      });

      patchLiveObjectKey(
        storage.root,
        "syncList",
        oldState["syncList"],
        newState["syncList"]
      );

      assert({ syncList: ["a"] }, 3, 1);
    });

    test("insert item at beginning of array", async () => {
      const { storage, state, assert } = await prepareStorageImmutableTest<
        {
          syncList: LiveList<string>;
        },
        { syncList: string[] }
      >(
        [
          createSerializedObject("0:0", {}),
          createSerializedList("0:1", "0:0", "syncList"),
          createSerializedRegister("0:2", "0:1", FIRST_POSITION, "a"),
        ],
        1
      );

      const { oldState, newState } = applyStateChanges(state, () => {
        state.syncList.unshift("b");
      });

      patchLiveObjectKey(
        storage.root,
        "syncList",
        oldState["syncList"],
        newState["syncList"]
      );

      assert({ syncList: ["b", "a"] }, 4, 1);
    });

    test("swap items in array", async () => {
      const { storage, state, assert } = await prepareStorageImmutableTest<
        {
          syncList: LiveList<string>;
        },
        { syncList: string[] }
      >(
        [
          createSerializedObject("0:0", {}),
          createSerializedList("0:1", "0:0", "syncList"),
          createSerializedRegister("0:2", "0:1", FIRST_POSITION, "a"),
          createSerializedRegister("0:3", "0:1", SECOND_POSITION, "b"),
          createSerializedRegister("0:4", "0:1", THIRD_POSITION, "c"),
          createSerializedRegister("0:5", "0:1", FOURTH_POSITION, "d"),
        ],
        1
      );

      const { oldState, newState } = applyStateChanges(state, () => {
        state.syncList = ["d", "b", "c", "a"];
      });

      patchLiveObjectKey(
        storage.root,
        "syncList",
        oldState["syncList"],
        newState["syncList"]
      );

      assert({ syncList: ["d", "b", "c", "a"] }, 6, 8);
    });

    test("array of objects", async () => {
      const { storage, state, assert } = await prepareStorageImmutableTest<
        {
          syncList: LiveList<LiveObject<{ a: number }>>;
        },
        { syncList: any[] }
      >(
        [
          createSerializedObject("0:0", {}),
          createSerializedList("0:1", "0:0", "syncList"),
          createSerializedObject("0:2", { a: 1 }, "0:1", FIRST_POSITION),
        ],
        1
      );

      const { oldState, newState } = applyStateChanges(state, () => {
        state.syncList[0].a = 2;
      });

      patchLiveObjectKey(
        storage.root,
        "syncList",
        oldState["syncList"],
        newState["syncList"]
      );

      assert({ syncList: [{ a: 2 }] }, 3, 1);
    });

    test("remove item from array", async () => {
      const { storage, state, assert } = await prepareStorageImmutableTest<
        {
          syncList: LiveList<string>;
        },
        { syncList: string[] }
      >(
        [
          createSerializedObject("0:0", {}),
          createSerializedList("0:1", "0:0", "syncList"),
          createSerializedRegister("0:2", "0:1", FIRST_POSITION, "a"),
          createSerializedRegister("0:3", "0:1", SECOND_POSITION, "b"),
        ],
        1
      );

      const { oldState, newState } = applyStateChanges(state, () => {
        state.syncList.pop();
      });

      patchLiveObjectKey(
        storage.root,
        "syncList",
        oldState["syncList"],
        newState["syncList"]
      );

      assert({ syncList: ["a"] }, 3, 1);
    });
  });

  describe("Map/LiveMap", () => {
    // TODO
  });
});

describe("patchImmutableObject", () => {
  test("update one sub object", () => {
    const state = { subA: { subsubA: { a: 1 } }, subB: { b: 1 } };

    const root = new LiveObject();
    root.set("subA", new LiveObject({ subsubA: new LiveObject({ a: 1 }) }));
    root.set("subB", new LiveObject({ b: 2 }));

    const updates: StorageUpdate[] = [
      {
        type: "LiveObject",
        node: root,
        updates: { subB: { type: "update" } },
      },
    ];

    const newState = patchImmutableObject(state, updates);

    expect(newState.subB === state.subB).toBeFalsy();
    expect(newState.subA === state.subA).toBeTruthy();
    expect(newState).toEqual({ subA: { subsubA: { a: 1 } }, subB: { b: 2 } });
  });

  test("update one sub object of sub object", () => {
    const state = {
      subA: { subsubA: { a: 1 }, subsubB: { b: 1 } },
      subB: { b: 1 },
    };

    const root = new LiveObject();
    root.set(
      "subA",
      new LiveObject({
        subsubA: new LiveObject({ a: 2 }),
        subsubB: new LiveObject({ b: 1 }),
      })
    );
    root.set("subB", new LiveObject({ b: 1 }));

    const updates: StorageUpdate[] = [
      {
        type: "LiveObject",
        node: root.get("subA"),
        updates: { subsubA: { type: "update" } },
      },
    ];

    const newState = patchImmutableObject(state, updates);

    expect(newState.subB === state.subB).toBeTruthy();
    expect(newState.subA === state.subA).toBeFalsy();
    expect(newState.subA.subsubB === state.subA.subsubB).toBeTruthy();
    expect(newState.subA.subsubA === state.subA.subsubA).toBeFalsy();
    expect(newState).toEqual({
      subA: { subsubA: { a: 2 }, subsubB: { b: 1 } },
      subB: { b: 1 },
    });
  });

  test("multiple updates", () => {
    const state = {
      subA: { subsubA: { a: 1 }, subsubB: { b: 1 } },
      subB: { b: 1 },
    };

    const root = new LiveObject();
    root.set(
      "subA",
      new LiveObject({
        subsubA: new LiveObject({ a: 2 }),
      })
    );
    root.set("subB", new LiveObject({ b: 2 }));

    const updates: StorageUpdate[] = [
      {
        type: "LiveObject",
        node: root.get("subA"),
        updates: { subsubA: { type: "update" } },
      },
      {
        type: "LiveObject",
        node: root.get("subA"),
        updates: { subsubB: { type: "delete" } },
      },
      {
        type: "LiveObject",
        node: root.get("subB"),
        updates: { b: { type: "update" } },
      },
    ];

    const newState = patchImmutableObject(state, updates);

    expect(newState.subB === state.subB).toBeFalsy();
    expect(newState.subA === state.subA).toBeFalsy();
    expect(newState.subA.subsubA === state.subA.subsubA).toBeFalsy();
    expect(newState).toEqual({
      subA: { subsubA: { a: 2 } },
      subB: { b: 2 },
    });
  });

  test("add element to Map/LiveMap", () => {
    const state = {
      map: { el1: { a: 1 } },
    };

    const root = new LiveObject();
    const liveMap = new LiveMap();
    liveMap.set("el1", new LiveObject({ a: 1 }));
    liveMap.set("el2", new LiveObject({ a: 2 }));

    root.set("map", liveMap);

    const updates: StorageUpdate[] = [
      {
        type: "LiveMap",
        node: root.get("map"),
        updates: { el2: { type: "update" } },
      },
    ];

    const newState = patchImmutableObject(state, updates);

    expect(newState.map.el1 === state.map.el1).toBeTruthy();

    expect(newState).toEqual({
      map: { el1: { a: 1 }, el2: { a: 2 } },
    });
  });

  test("remove element from Map/LiveMap", () => {
    const state = {
      map: { el1: { a: 1 }, el2: { a: 2 } },
    };

    const root = new LiveObject();
    const liveMap = new LiveMap();
    liveMap.set("el1", new LiveObject({ a: 1 }));

    root.set("map", liveMap);

    const updates: StorageUpdate[] = [
      {
        type: "LiveMap",
        node: root.get("map"),
        updates: { el2: { type: "delete" } },
      },
    ];

    const newState = patchImmutableObject(state, updates);

    expect(newState.map.el1 === state.map.el1).toBeTruthy();

    expect(newState).toEqual({
      map: { el1: { a: 1 } },
    });
  });

  test("insert element at the end of Array/LiveList", () => {
    const state = {
      list: [{ a: 1 }, { a: 2 }],
    };

    const root = new LiveObject();
    const liveList = new LiveList();
    liveList.push(new LiveObject({ a: 1 }));
    liveList.push(new LiveObject({ a: 2 }));
    liveList.push(new LiveObject({ a: 3 }));
    root.set("list", liveList);

    const updates: StorageUpdate[] = [
      {
        type: "LiveList",
        node: root.get("list"),
        updates: { [THIRD_POSITION]: { type: "update" } },
      },
    ];

    const newState = patchImmutableObject(state, updates);

    expect(newState.list[0] === state.list[0]).toBeTruthy();
    expect(newState.list[1] === state.list[1]).toBeTruthy();

    expect(newState).toEqual({
      list: [{ a: 1 }, { a: 2 }, { a: 3 }],
    });
  });

  test("insert element at the beginning of and Array/LiveList", () => {
    const state = {
      list: [{ a: 1 }],
    };

    const root = new LiveObject();
    const liveList = new LiveList();
    liveList.push(new LiveObject({ a: 0 }));
    liveList.push(new LiveObject({ a: 1 }));
    root.set("list", liveList);

    const updates: StorageUpdate[] = [
      {
        type: "LiveList",
        node: root.get("list"),
        updates: { [FIRST_POSITION]: { type: "update" } },
      },
    ];

    const newState = patchImmutableObject(state, updates);

    expect(newState.list[0] === state.list[0]).toBeFalsy();
    expect(newState.list[1] === state.list[1]).toBeFalsy();

    expect(newState).toEqual({
      list: [{ a: 0 }, { a: 1 }],
    });
  });

  test("delete element from the end of Array/LiveList", () => {
    const state = {
      list: [{ a: 1 }, { a: 2 }],
    };

    const root = new LiveObject();
    const liveList = new LiveList();
    liveList.push(new LiveObject({ a: 1 }));
    root.set("list", liveList);

    const updates: StorageUpdate[] = [
      {
        type: "LiveList",
        node: root.get("list"),
        updates: { [SECOND_POSITION]: { type: "delete" } },
      },
    ];

    const newState = patchImmutableObject(state, updates);

    expect(newState.list[0] === state.list[0]).toBeTruthy();

    expect(newState).toEqual({
      list: [{ a: 1 }],
    });
  });

  test("delete element from the beginning of Array/LiveList", () => {
    const state = {
      list: [{ a: 1 }, { a: 2 }],
    };

    const root = new LiveObject();
    const liveList = new LiveList();
    liveList.push(new LiveObject({ a: 1 }));
    liveList.push(new LiveObject({ a: 2 }));
    liveList.delete(0);
    root.set("list", liveList);

    const updates: StorageUpdate[] = [
      {
        type: "LiveList",
        node: root.get("list"),
        updates: { [FIRST_POSITION]: { type: "delete" } },
      },
    ];

    const newState = patchImmutableObject(state, updates);

    expect(newState.list[0] === state.list[1]).toBeFalsy();

    expect(newState).toEqual({
      list: [{ a: 2 }],
    });
  });

  test("remove item and add new item at new position but same index", () => {
    const state = {
      list: [{ a: 1 }, { a: 2 }],
    };

    const root = new LiveObject();
    const liveList = new LiveList();
    liveList.push(new LiveObject({ a: 1 }));
    liveList.push(new LiveObject({ a: 2 }));
    liveList.push(new LiveObject({ a: 3 }));
    liveList.delete(1);
    root.set("list", liveList);

    const updates: StorageUpdate[] = [
      {
        type: "LiveList",
        node: root.get("list"),
        updates: {
          [SECOND_POSITION]: { type: "delete" },
          [THIRD_POSITION]: { type: "update" },
        },
      },
    ];

    const newState = patchImmutableObject(state, updates);

    expect(newState.list[0] === state.list[0]).toBeTruthy();

    expect(newState).toEqual({
      list: [{ a: 1 }, { a: 3 }],
    });
  });
});
