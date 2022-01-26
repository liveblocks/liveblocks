import { LiveList } from ".";
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

describe("immutable tests with ref machine", () => {
  test("create object/LiveObject", async () => {
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

  test("update object/LiveObject", async () => {
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

  test("add nested object/LiveObject", async () => {
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

  test("add item to array/LiveList", async () => {
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

  test("insert item to beginning of array/LiveList", async () => {
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

  test("swap items in array/LiveList", async () => {
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

  test("liveList of LiveObject", async () => {
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

    // assert({ syncList: [{ a: 1 }, { a: 2 }] }, 4, 1);
  });
});

describe("patchLiveObjectKey", () => {
  test("should update object value", () => {
    const state = { a: 0 };

    const updates: StorageUpdate[] = [
      { type: "LiveObject", node: new LiveObject({ a: 1 }), updates: {} },
    ];

    const newState = patchImmutableObject(state, updates);

    expect(newState).toEqual({ a: 1 });
  });
});
