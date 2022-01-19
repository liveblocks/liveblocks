import { LiveList } from ".";
import {
  createSerializedList,
  createSerializedObject,
  prepareStorageImmutableTest,
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
  test("should sync LiveObject", async () => {
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

    patchLiveObjectKey<{ syncObj: { a: number } }>(
      storage.root,
      "syncObj",
      oldState["syncObj"],
      newState["syncObj"]
    );

    assert({ syncObj: { a: 1 } });
  });

  test("should sync LiveList", async () => {
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

    patchLiveObjectKey<{ syncList: LiveList<string> }>(
      storage.root,
      "syncList",
      oldState["syncList"],
      newState["syncList"]
    );

    assert({ syncList: ["a"] });
  });
});

describe("patchLiveObjectKey", () => {
  test("should update object value", () => {
    const state = { a: 0 };

    const updates: StorageUpdate[] = [
      { type: "LiveObject", node: new LiveObject({ a: 1 }) },
    ];

    const newState = patchImmutableObject(state, updates);

    expect(newState).toEqual({ a: 1 });
  });
});
