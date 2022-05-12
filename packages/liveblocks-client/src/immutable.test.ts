import {
  createSerializedList,
  createSerializedObject,
  createSerializedRegister,
  FIRST_POSITION,
  FOURTH_POSITION,
  prepareStorageImmutableTest,
  SECOND_POSITION,
  THIRD_POSITION,
} from "../test/utils";
import { LiveList, LiveMap } from ".";
import {
  patchImmutableObject,
  patchLiveObject,
  patchLiveObjectKey,
} from "./immutable";
import { LiveObject } from "./LiveObject";
import type { StorageUpdate } from "./types";

// TODO: Further improve this type
type fixme = unknown;

function applyStateChanges(state: fixme, applyChanges: () => void) {
  const oldState = JSON.parse(JSON.stringify(state));
  applyChanges();
  const newState = JSON.parse(JSON.stringify(state));
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
    const liveObject = new LiveObject<{ key: LiveObject<{ a: number }> }>();
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
      const { storage, state, assert } = await prepareStorageImmutableTest<{
        syncObj: { a: number };
      }>([createSerializedObject("0:0", {})], 1);

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
      const { storage, state, assert } = await prepareStorageImmutableTest<{
        syncObj: { a: number };
      }>(
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
      const { storage, state, assert } = await prepareStorageImmutableTest<{
        syncObj: { a: any };
      }>(
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

    test("create LiveList with one LiveRegister item in same batch", async () => {
      const { storage, state, assert } = await prepareStorageImmutableTest<{
        doc: any;
      }>(
        [
          createSerializedObject("0:0", {}),
          createSerializedObject("0:1", {}, "0:0", "doc"),
        ],
        1
      );

      expect(state).toEqual({ doc: {} });

      const { oldState, newState } = applyStateChanges(state, () => {
        state.doc = { sub: [0] };
      });

      patchLiveObjectKey(storage.root, "doc", oldState["doc"], newState["doc"]);

      assert({ doc: { sub: [0] } }, 4, 2);
    });

    test("create nested LiveList with one LiveObject item in same batch", async () => {
      const { storage, state, assert } = await prepareStorageImmutableTest<{
        doc: any;
      }>(
        [
          createSerializedObject("0:0", {}),
          createSerializedObject("0:1", {}, "0:0", "doc"),
        ],
        1
      );

      expect(state).toEqual({ doc: {} });

      const { oldState, newState } = applyStateChanges(state, () => {
        state.doc = { sub: { subSub: [{ a: 1 }] } };
      });

      patchLiveObjectKey(storage.root, "doc", oldState["doc"], newState["doc"]);

      assert({ doc: { sub: { subSub: [{ a: 1 }] } } }, 5, 3);
    });

    test("Add nested objects in same batch", async () => {
      const { storage, state, assert } = await prepareStorageImmutableTest<{
        doc: any;
      }>(
        [
          createSerializedObject("0:0", {}),
          createSerializedObject("0:1", {}, "0:0", "doc"),
        ],
        1
      );

      expect(state).toEqual({ doc: {} });

      const { oldState, newState } = applyStateChanges(state, () => {
        state.doc = { pos: { a: { b: 1 } } };
      });

      patchLiveObjectKey(storage.root, "doc", oldState["doc"], newState["doc"]);

      assert({ doc: { pos: { a: { b: 1 } } } }, 4, 2);
    });

    test("delete object key", async () => {
      const { storage, state, assert } = await prepareStorageImmutableTest<{
        syncObj: { a?: number };
      }>(
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
    test("replace array of 3 elements to 1 element", async () => {
      const { storage, state, assert } = await prepareStorageImmutableTest<{
        syncList: LiveList<number>;
      }>(
        [
          createSerializedObject("0:0", {}),
          createSerializedList("0:1", "0:0", "syncList"),
          createSerializedRegister("0:2", "0:1", FIRST_POSITION, 1),
          createSerializedRegister("0:3", "0:1", SECOND_POSITION, 1),
          createSerializedRegister("0:4", "0:1", THIRD_POSITION, 1),
        ],
        1
      );

      const { oldState, newState } = applyStateChanges(state, () => {
        state.syncList = [2];
      });

      patchLiveObjectKey(
        storage.root,
        "syncList",
        oldState["syncList"],
        newState["syncList"]
      );

      assert({ syncList: [2] });
    });

    test("add item to array", async () => {
      const { storage, state, assert } = await prepareStorageImmutableTest<{
        syncList: LiveList<string>;
      }>(
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

    test("replace first item in array", async () => {
      const { storage, state, assert } = await prepareStorageImmutableTest<{
        list: LiveList<string>;
      }>(
        [
          createSerializedObject("0:0", {}),
          createSerializedList("0:1", "0:0", "list"),
          createSerializedRegister("0:2", "0:1", FIRST_POSITION, "A"),
          createSerializedRegister("0:3", "0:1", SECOND_POSITION, "B"),
          createSerializedRegister("0:4", "0:1", THIRD_POSITION, "C"),
        ],
        1
      );

      const { oldState, newState } = applyStateChanges(state, () => {
        state.list[0] = "D";
      });

      patchLiveObject(storage.root, oldState, newState);

      assert({ list: ["D", "B", "C"] }, 5, 1);
    });

    test("replace last item in array", async () => {
      const { storage, state, assert } = await prepareStorageImmutableTest<{
        list: LiveList<string>;
      }>(
        [
          createSerializedObject("0:0", {}),
          createSerializedList("0:1", "0:0", "list"),
          createSerializedRegister("0:2", "0:1", FIRST_POSITION, "A"),
          createSerializedRegister("0:3", "0:1", SECOND_POSITION, "B"),
          createSerializedRegister("0:4", "0:1", THIRD_POSITION, "C"),
        ],
        1
      );

      const { oldState, newState } = applyStateChanges(state, () => {
        state.list[2] = "D";
      });

      patchLiveObject(storage.root, oldState, newState);

      assert({ list: ["A", "B", "D"] }, 5, 1);
    });

    test("insert item at beginning of array", async () => {
      const { storage, state, assert } = await prepareStorageImmutableTest<{
        syncList: LiveList<string>;
      }>(
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
      const { storage, state, assert } = await prepareStorageImmutableTest<{
        syncList: LiveList<string>;
      }>(
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

      assert({ syncList: ["d", "b", "c", "a"] }, 6, 4);
    });

    test("array of objects", async () => {
      const { storage, state, assert } = await prepareStorageImmutableTest<{
        syncList: LiveList<LiveObject<{ a: number }>>;
      }>(
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

    test("remove first item from array", async () => {
      const { storage, state, assert } = await prepareStorageImmutableTest<{
        syncList: LiveList<string>;
      }>(
        [
          createSerializedObject("0:0", {}),
          createSerializedList("0:1", "0:0", "syncList"),
          createSerializedRegister("0:2", "0:1", FIRST_POSITION, "a"),
          createSerializedRegister("0:3", "0:1", SECOND_POSITION, "b"),
        ],
        1
      );

      const { oldState, newState } = applyStateChanges(state, () => {
        state.syncList.shift();
      });

      patchLiveObjectKey(
        storage.root,
        "syncList",
        oldState["syncList"],
        newState["syncList"]
      );

      assert({ syncList: ["b"] }, 3, 1);
    });

    test("remove last item from array", async () => {
      const { storage, state, assert } = await prepareStorageImmutableTest<{
        syncList: LiveList<string>;
      }>(
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

    test("remove all elements of array except first", async () => {
      const { storage, state, assert } = await prepareStorageImmutableTest<{
        syncList: LiveList<string>;
      }>(
        [
          createSerializedObject("0:0", {}),
          createSerializedList("0:1", "0:0", "syncList"),
          createSerializedRegister("0:2", "0:1", FIRST_POSITION, "a"),
          createSerializedRegister("0:3", "0:1", SECOND_POSITION, "b"),
          createSerializedRegister("0:4", "0:1", THIRD_POSITION, "c"),
        ],
        1
      );

      const { oldState, newState } = applyStateChanges(state, () => {
        state.syncList = ["a"];
      });

      patchLiveObjectKey(
        storage.root,
        "syncList",
        oldState["syncList"],
        newState["syncList"]
      );

      assert({ syncList: ["a"] }, 3, 2);
    });
    test("remove all elements of array except last", async () => {
      const { storage, state, assert } = await prepareStorageImmutableTest<{
        syncList: LiveList<string>;
      }>(
        [
          createSerializedObject("0:0", {}),
          createSerializedList("0:1", "0:0", "syncList"),
          createSerializedRegister("0:2", "0:1", FIRST_POSITION, "a"),
          createSerializedRegister("0:3", "0:1", SECOND_POSITION, "b"),
          createSerializedRegister("0:4", "0:1", THIRD_POSITION, "c"),
        ],
        1
      );

      const { oldState, newState } = applyStateChanges(state, () => {
        state.syncList = ["c"];
      });

      patchLiveObjectKey(
        storage.root,
        "syncList",
        oldState["syncList"],
        newState["syncList"]
      );

      assert({ syncList: ["c"] }, 3, 2);
    });
    test("remove all elements of array", async () => {
      const { storage, state, assert } = await prepareStorageImmutableTest<{
        syncList: LiveList<string>;
      }>(
        [
          createSerializedObject("0:0", {}),
          createSerializedList("0:1", "0:0", "syncList"),
          createSerializedRegister("0:2", "0:1", FIRST_POSITION, "a"),
          createSerializedRegister("0:3", "0:1", SECOND_POSITION, "b"),
          createSerializedRegister("0:4", "0:1", THIRD_POSITION, "c"),
        ],
        1
      );

      const { oldState, newState } = applyStateChanges(state, () => {
        state.syncList = [];
      });

      patchLiveObjectKey(
        storage.root,
        "syncList",
        oldState["syncList"],
        newState["syncList"]
      );

      assert({ syncList: [] }, 2, 3);
    });
  });

  describe("unsupported types", () => {
    let originalEnv: NodeJS.ProcessEnv;
    let consoleErrorSpy: jest.SpyInstance;

    beforeAll(() => {
      originalEnv = process.env;
      consoleErrorSpy = jest.spyOn(console, "error");
    });

    afterEach(() => {
      process.env = originalEnv;
      consoleErrorSpy.mockRestore();
    });

    test("new state contains a function", async () => {
      const { storage, state, assertStorage } =
        await prepareStorageImmutableTest<{ syncObj: { a: any } }>(
          [
            createSerializedObject("0:0", {}),
            createSerializedObject("0:1", { a: 0 }, "0:0", "syncObj"),
          ],
          1
        );

      expect(state).toEqual({ syncObj: { a: 0 } });

      const oldState = JSON.parse(JSON.stringify(state));

      state.syncObj.a = () => {};

      patchLiveObjectKey(
        storage.root,
        "syncObj",
        oldState["syncObj"],
        state["syncObj"]
      );

      expect(consoleErrorSpy).toHaveBeenCalledTimes(1);

      assertStorage({ syncObj: { a: 0 } });
    });

    test("Production env - new state contains a function", async () => {
      const { storage, state } = await prepareStorageImmutableTest<{
        syncObj: { a: any };
      }>(
        [
          createSerializedObject("0:0", {}),
          createSerializedObject("0:1", { a: 0 }, "0:0", "syncObj"),
        ],
        1
      );

      expect(state).toEqual({ syncObj: { a: 0 } });

      process.env = {
        ...originalEnv,
        NODE_ENV: "production",
      };

      const oldState = JSON.parse(JSON.stringify(state));

      state.syncObj.a = () => {};

      patchLiveObjectKey(
        storage.root,
        "syncObj",
        oldState["syncObj"],
        state["syncObj"]
      );

      expect(consoleErrorSpy).toHaveBeenCalledTimes(0);
    });
  });

  describe("Map/LiveMap", () => {
    // TODO
  });
});

describe("patchImmutableObject", () => {
  test("update one sub object", () => {
    const state = { subA: { subsubA: { a: 1 } }, subB: { b: 1 } };

    const root = new LiveObject<{
      subA: LiveObject<{ subsubA: LiveObject<{ a: number }> }>;
      subB: LiveObject<{ b: number }>;
    }>();
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

    const root = new LiveObject<{
      subA: LiveObject<{
        subsubA: LiveObject<{ a: number }>;
        subsubB: LiveObject<{ b: number }>;
      }>;
      subB: LiveObject<{ b: number }>;
    }>();
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

    const root = new LiveObject<{
      subA: LiveObject<{
        subsubA: LiveObject<{ a: number }>;
        subsubB?: LiveObject<{ b: number }>;
      }>;
      subB: LiveObject<{ b: number }>;
    }>();
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

    const root = new LiveObject<{ map: typeof liveMap }>();
    const liveMap = new LiveMap<string, LiveObject<{ a: number }>>();
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

    const root = new LiveObject<{ map: typeof liveMap }>();
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

    const root = new LiveObject<{
      list: typeof liveList;
    }>();
    const liveList = new LiveList<LiveObject<{ a: number }>>();
    liveList.push(new LiveObject({ a: 1 }));
    liveList.push(new LiveObject({ a: 2 }));
    const obj1 = new LiveObject({ a: 3 });
    liveList.push(obj1);
    root.set("list", liveList);

    const updates: StorageUpdate[] = [
      {
        type: "LiveList",
        node: root.get("list"),
        updates: [{ index: 2, item: obj1, type: "insert" }],
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

    const root = new LiveObject<{
      list: typeof liveList;
    }>();
    const liveList = new LiveList<LiveObject<{ a: number }>>();
    const newObj = new LiveObject({ a: 0 });
    liveList.push(newObj);
    liveList.push(new LiveObject({ a: 1 }));
    root.set("list", liveList);

    const updates: StorageUpdate[] = [
      {
        type: "LiveList",
        node: root.get("list"),
        updates: [{ index: 0, item: newObj, type: "insert" }],
      },
    ];

    const newState = patchImmutableObject(state, updates);

    expect(newState.list[0] === state.list[0]).toBeFalsy();
    expect(newState.list[1] === state.list[1]).toBeFalsy();

    expect(newState).toEqual({
      list: [{ a: 0 }, { a: 1 }],
    });
  });

  test("insert 2 elements at the beginning of and Array/LiveList", () => {
    const state = {
      list: [{ a: 1 }],
    };

    const root = new LiveObject<{ list: typeof liveList }>();
    const liveList = new LiveList<LiveObject<{ a: number }>>();
    const newObj1 = new LiveObject({ a: 2 });
    const newObj2 = new LiveObject({ a: 3 });

    liveList.push(newObj2);
    liveList.push(newObj1);

    liveList.push(new LiveObject({ a: 1 }));
    root.set("list", liveList);

    const updates: StorageUpdate[] = [
      {
        type: "LiveList",
        node: root.get("list"),
        updates: [
          { index: 0, item: newObj1, type: "insert" },
          { index: 0, item: newObj2, type: "insert" },
        ],
      },
    ];

    const newState = patchImmutableObject(state, updates);

    expect(newState.list[2] === state.list[0]).toBeTruthy();

    expect(newState).toEqual({
      list: [{ a: 3 }, { a: 2 }, { a: 1 }],
    });
  });

  test("insert 2 elements at the end of and Array/LiveList", () => {
    const state = {
      list: [{ a: 1 }],
    };

    const root = new LiveObject<{ list: typeof liveList }>();
    const liveList = new LiveList<LiveObject<{ a: number }>>();
    const newObj1 = new LiveObject({ a: 2 });
    const newObj2 = new LiveObject({ a: 3 });

    liveList.push(new LiveObject({ a: 1 }));
    liveList.push(newObj1);
    liveList.push(newObj2);

    root.set("list", liveList);

    const updates: StorageUpdate[] = [
      {
        type: "LiveList",
        node: root.get("list"),
        updates: [
          { index: 1, item: newObj1, type: "insert" },
          { index: 2, item: newObj2, type: "insert" },
        ],
      },
    ];

    const newState = patchImmutableObject(state, updates);

    expect(newState.list[0] === state.list[0]).toBeTruthy();

    expect(newState).toEqual({
      list: [{ a: 1 }, { a: 2 }, { a: 3 }],
    });
  });

  test("insert element in the middle of Array/LiveList", () => {
    const state = {
      list: [{ a: 1 }, { a: 2 }],
    };

    const root = new LiveObject<{ list: typeof liveList }>();
    const liveList = new LiveList<LiveObject<{ a: number }>>();
    liveList.push(new LiveObject({ a: 1 }));
    const newObj = new LiveObject({ a: 15 });
    liveList.push(newObj);
    liveList.push(new LiveObject({ a: 2 }));
    root.set("list", liveList);

    const updates: StorageUpdate[] = [
      {
        type: "LiveList",
        node: root.get("list"),
        updates: [{ index: 1, item: newObj, type: "insert" }],
      },
    ];

    const newState = patchImmutableObject(state, updates);

    expect(newState.list[0] === state.list[0]).toBeTruthy();
    expect(newState.list[2] === state.list[1]).toBeTruthy();

    expect(newState).toEqual({
      list: [{ a: 1 }, { a: 15 }, { a: 2 }],
    });
  });

  test("delete element from the end of Array/LiveList", () => {
    const state = {
      list: [{ a: 1 }, { a: 2 }],
    };

    const root = new LiveObject<{ list: typeof liveList }>();
    const liveList = new LiveList<LiveObject<{ a: number }>>();
    liveList.push(new LiveObject({ a: 1 }));
    root.set("list", liveList);

    const updates: StorageUpdate[] = [
      {
        type: "LiveList",
        node: root.get("list"),
        updates: [{ index: 1, type: "delete" }],
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

    const root = new LiveObject<{ list: typeof liveList }>();
    const liveList = new LiveList<LiveObject<{ a: number }>>();
    liveList.push(new LiveObject({ a: 1 }));
    liveList.push(new LiveObject({ a: 2 }));
    liveList.delete(0);
    root.set("list", liveList);

    const updates: StorageUpdate[] = [
      {
        type: "LiveList",
        node: root.get("list"),
        updates: [{ index: 0, type: "delete" }],
      },
    ];

    const newState = patchImmutableObject(state, updates);

    expect(newState.list[0] === state.list[1]).toBeTruthy();

    expect(newState).toEqual({
      list: [{ a: 2 }],
    });
  });

  test("delete 2 elements from the beginning of Array/LiveList", () => {
    const state = {
      list: [{ a: 1 }, { a: 2 }, { a: 3 }],
    };

    const root = new LiveObject<{ list: typeof liveList }>();
    const liveList = new LiveList<LiveObject<{ a: number }>>();
    liveList.push(new LiveObject({ a: 1 }));
    liveList.push(new LiveObject({ a: 2 }));
    liveList.push(new LiveObject({ a: 3 }));
    liveList.delete(0);
    liveList.delete(0);
    root.set("list", liveList);

    const updates: StorageUpdate[] = [
      {
        type: "LiveList",
        node: root.get("list"),
        updates: [
          { index: 0, type: "delete" },
          { index: 0, type: "delete" },
        ],
      },
    ];

    const newState = patchImmutableObject(state, updates);

    expect(newState.list[0] === state.list[2]).toBeTruthy();

    expect(newState).toEqual({
      list: [{ a: 3 }],
    });
  });

  describe("move items in array/LiveList", () => {
    test("move index 2 to 0", () => {
      const state = {
        list: [{ i: "a" }, { i: "b" }, { i: "c" }, { i: "d" }],
      };

      const root = new LiveObject<{ list: typeof liveList }>();
      const liveList = new LiveList<LiveObject<{ i: string }>>();
      const movedObj = new LiveObject({ i: "c" });
      liveList.push(movedObj);
      liveList.push(new LiveObject({ i: "a" }));
      liveList.push(new LiveObject({ i: "b" }));
      liveList.push(new LiveObject({ i: "d" }));

      root.set("list", liveList);

      const updates: StorageUpdate[] = [
        {
          type: "LiveList",
          node: root.get("list"),
          updates: [
            { index: 0, previousIndex: 2, item: movedObj, type: "move" },
          ],
        },
      ];

      const newState = patchImmutableObject(state, updates);

      expect(newState.list[1] === state.list[0]).toBeTruthy();
      expect(newState.list[2] === state.list[1]).toBeTruthy();
      expect(newState.list[3] === state.list[3]).toBeTruthy();

      expect(newState).toEqual({
        list: [{ i: "c" }, { i: "a" }, { i: "b" }, { i: "d" }],
      });
    });

    test("move index 0 to 3", () => {
      const state = {
        list: [{ i: "a" }, { i: "b" }, { i: "c" }, { i: "d" }],
      };

      const root = new LiveObject<{ list: typeof liveList }>();
      const liveList = new LiveList<LiveObject<{ i: string }>>();
      liveList.push(new LiveObject({ i: "b" }));
      liveList.push(new LiveObject({ i: "c" }));
      liveList.push(new LiveObject({ i: "d" }));
      const movedObj = new LiveObject({ i: "a" });
      liveList.push(movedObj);

      root.set("list", liveList);

      const updates: StorageUpdate[] = [
        {
          type: "LiveList",
          node: root.get("list"),
          updates: [
            { index: 3, previousIndex: 0, item: movedObj, type: "move" },
          ],
        },
      ];

      const newState = patchImmutableObject(state, updates);

      expect(newState.list[0] === state.list[1]).toBeTruthy();
      expect(newState.list[1] === state.list[2]).toBeTruthy();
      expect(newState.list[2] === state.list[3]).toBeTruthy();

      expect(newState).toEqual({
        list: [{ i: "b" }, { i: "c" }, { i: "d" }, { i: "a" }],
      });
    });

    test("move index 1 to 3", () => {
      const state = {
        list: [{ i: "a" }, { i: "b" }, { i: "c" }, { i: "d" }],
      };

      const root = new LiveObject<{ list: typeof liveList }>();
      const liveList = new LiveList<LiveObject<{ i: string }>>();
      liveList.push(new LiveObject({ i: "a" }));
      liveList.push(new LiveObject({ i: "c" }));
      liveList.push(new LiveObject({ i: "d" }));
      const movedObj = new LiveObject({ i: "b" });
      liveList.push(movedObj);

      root.set("list", liveList);

      const updates: StorageUpdate[] = [
        {
          type: "LiveList",
          node: root.get("list"),
          updates: [
            { index: 3, previousIndex: 1, item: movedObj, type: "move" },
          ],
        },
      ];

      const newState = patchImmutableObject(state, updates);

      expect(newState.list[0] === state.list[0]).toBeTruthy();
      expect(newState.list[1] === state.list[2]).toBeTruthy();
      expect(newState.list[2] === state.list[3]).toBeTruthy();

      expect(newState).toEqual({
        list: [{ i: "a" }, { i: "c" }, { i: "d" }, { i: "b" }],
      });
    });

    test("move index 1 to 2", () => {
      const state = {
        list: [{ i: "a" }, { i: "b" }, { i: "c" }, { i: "d" }],
      };

      const root = new LiveObject<{ list: typeof liveList }>();
      const liveList = new LiveList<LiveObject<{ i: string }>>();
      liveList.push(new LiveObject({ i: "a" }));
      liveList.push(new LiveObject({ i: "c" }));
      const movedObj = new LiveObject({ i: "b" });
      liveList.push(movedObj);
      liveList.push(new LiveObject({ i: "d" }));

      root.set("list", liveList);

      const updates: StorageUpdate[] = [
        {
          type: "LiveList",
          node: root.get("list"),
          updates: [
            { index: 2, previousIndex: 1, item: movedObj, type: "move" },
          ],
        },
      ];

      const newState = patchImmutableObject(state, updates);

      expect(newState.list[0] === state.list[0]).toBeTruthy();
      expect(newState.list[1] === state.list[2]).toBeTruthy();
      expect(newState.list[3] === state.list[3]).toBeTruthy();

      expect(newState).toEqual({
        list: [{ i: "a" }, { i: "c" }, { i: "b" }, { i: "d" }],
      });
    });

    test("2 moves different places", () => {
      const state = {
        list: [{ i: "a" }, { i: "b" }, { i: "c" }, { i: "d" }],
      };

      const root = new LiveObject<{ list: typeof liveList }>();
      const liveList = new LiveList<LiveObject<{ i: string }>>();
      const objA = new LiveObject({ i: "a" });
      const objB = new LiveObject({ i: "b" });
      const objC = new LiveObject({ i: "c" });
      const objD = new LiveObject({ i: "d" });

      liveList.push(objB);
      liveList.push(objA);
      liveList.push(objD);
      liveList.push(objC);

      root.set("list", liveList);

      const updates: StorageUpdate[] = [
        {
          type: "LiveList",
          node: root.get("list"),
          updates: [
            { index: 1, previousIndex: 0, item: objA, type: "move" },
            { index: 3, previousIndex: 2, item: objC, type: "move" },
          ],
        },
      ];

      const newState = patchImmutableObject(state, updates);

      expect(newState.list[0] === state.list[1]).toBeTruthy();
      expect(newState.list[2] === state.list[3]).toBeTruthy();

      expect(newState).toEqual({
        list: [{ i: "b" }, { i: "a" }, { i: "d" }, { i: "c" }],
      });
    });

    test("2 moves same place ([a b c d] => [b a c d] => [c b a d])", () => {
      const state = {
        list: [{ i: "a" }, { i: "b" }, { i: "c" }, { i: "d" }],
      };

      const root = new LiveObject<{ list: typeof liveList }>();
      const liveList = new LiveList<LiveObject<{ i: string }>>();
      const objA = new LiveObject({ i: "a" });
      const objB = new LiveObject({ i: "b" });
      const objC = new LiveObject({ i: "c" });
      const objD = new LiveObject({ i: "d" });

      liveList.push(objC);
      liveList.push(objB);
      liveList.push(objA);
      liveList.push(objD);

      root.set("list", liveList);

      const updates: StorageUpdate[] = [
        {
          type: "LiveList",
          node: root.get("list"),
          updates: [
            { index: 0, previousIndex: 1, item: objB, type: "move" },
            { index: 0, previousIndex: 2, item: objC, type: "move" },
          ],
        },
      ];

      const newState = patchImmutableObject(state, updates);

      expect(newState.list[2] === state.list[0]).toBeTruthy();
      expect(newState.list[3] === state.list[3]).toBeTruthy();

      expect(newState).toEqual({
        list: [{ i: "c" }, { i: "b" }, { i: "a" }, { i: "d" }],
      });
    });
  });
});
