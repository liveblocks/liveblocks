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
import type { LiveList } from ".";
import { patchLiveObject, patchLiveObjectKey } from "./immutable";
import { LiveObject } from "./LiveObject";
import type { JsonObject } from "./types";

function applyStateChanges<T extends JsonObject>(
  state: T,
  applyChanges: () => void
): { oldState: T; newState: T } {
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
