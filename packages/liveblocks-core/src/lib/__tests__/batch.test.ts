import { assertEq, assertSame } from "tosti";
import { describe, expect, test, vi } from "vitest";

import { Batch, createBatchStore } from "../batch";
import { wait } from "../utils";

const SOME_TIME = 5;
const ERROR_MESSAGE = "error";
const ERROR = new Error(ERROR_MESSAGE);

const synchronousCallback = (inputs: string[]) => {
  return inputs.map((userId) => userId);
};

const asynchronousCallback = async (inputs: string[]) => {
  await wait(SOME_TIME);
  return inputs.map((userId) => userId);
};

describe("Batch", () => {
  test("should batch synchronous calls", async () => {
    const callback = vi.fn(synchronousCallback);
    const batch = new Batch<string, string>(callback, { delay: SOME_TIME });

    const a$ = batch.get("a");
    const b$ = batch.get("b");

    await assertEq(a$, "a");
    await assertEq(b$, "b");

    // Callback should be called only once for both "a" and "b".
    assertEq(callback.mock.calls, [
      [["a", "b"]], // One call, with one param (the array of inputs)
    ]);
  });

  test("should batch asynchronous calls", async () => {
    const callback = vi.fn(asynchronousCallback);
    const batch = new Batch<string, string>(callback, { delay: SOME_TIME });

    const a$ = batch.get("a");
    const b$ = batch.get("b");

    await assertEq(a$, "a");
    await assertEq(b$, "b");

    // Callback should be called only once for both "a" and "b".
    assertEq(callback.mock.calls, [
      [["a", "b"]], // One call, with one param (the array of inputs)
    ]);
  });

  test("should batch based on delay", async () => {
    const callback = vi.fn(synchronousCallback);
    const batch = new Batch<string, string>(callback, { delay: SOME_TIME });

    const a$ = batch.get("a");
    await wait(SOME_TIME * 1.5);
    const b$ = batch.get("b");

    await assertEq(a$, "a");
    await assertEq(b$, "b");

    assertEq(callback.mock.calls, [
      [["a"]], // Two calls, once for "a" and once for "b"
      [["b"]],
    ]);
  });

  test("should batch based on size", async () => {
    const callback = vi.fn(synchronousCallback);
    const batch = new Batch<string, string>(callback, {
      delay: SOME_TIME,
      size: 1,
    });

    const a$ = batch.get("a");
    const b$ = batch.get("b");

    await assertEq(a$, "a");
    await assertEq(b$, "b");

    assertEq(callback.mock.calls, [
      [["a"]], // Two calls, once for "a" and once for "b"
      [["b"]],
    ]);
  });

  test("should reject batch errors", async () => {
    const callback = vi.fn(() => {
      throw ERROR;
    });
    const batch = new Batch<string, string>(callback, { delay: SOME_TIME });

    const a$ = batch.get("a");
    const b$ = batch.get("b");

    // All calls should reject with the error thrown by the callback.
    await expect(a$).rejects.toEqual(ERROR);
    await expect(b$).rejects.toEqual(ERROR);
  });

  test("should reject batch rejections", async () => {
    const callback = vi.fn(() => {
      return Promise.reject(ERROR_MESSAGE);
    });
    const batch = new Batch<string, string>(callback, { delay: SOME_TIME });

    const a$ = batch.get("a");
    const b$ = batch.get("b");

    // All calls should reject with the rejection reason returned by the callback.
    await expect(a$).rejects.toEqual(ERROR_MESSAGE);
    await expect(b$).rejects.toEqual(ERROR_MESSAGE);
  });

  test("should reject individual errors", async () => {
    const callback = vi.fn(() => {
      return ["a", ERROR];
    });
    const batch = new Batch<string, string>(callback, { delay: SOME_TIME });

    const a$ = batch.get("a");
    const b$ = batch.get("b");

    // "a" should resolve, "b" should reject.
    await assertEq(a$, "a");
    await expect(b$).rejects.toEqual(ERROR);
  });

  test("should reject if callback doesn't return an array", async () => {
    const callback = vi.fn();
    const batch = new Batch<string, string>(callback, { delay: SOME_TIME });

    await expect(batch.get("a")).rejects.toEqual(
      new Error("Callback must return an array.")
    );
  });

  test("should reject if callback doesn't return an array of the same length as batch", async () => {
    const callback = vi.fn(() => []);
    const batch = new Batch<string, string>(callback, { delay: SOME_TIME });

    await expect(batch.get("a")).rejects.toEqual(
      new Error(
        "Callback must return an array of the same length as the number of provided items. Expected 1, but got 0."
      )
    );
  });

  test("should deduplicate identical calls", async () => {
    const callback = vi.fn(synchronousCallback);
    const batch = new Batch<string, string>(callback, { delay: SOME_TIME });

    const a$ = batch.get("a");
    const b$ = batch.get("b");
    const duplicatedA = batch.get("a");

    await assertEq(a$, "a");
    await assertEq(b$, "b");
    await assertEq(duplicatedA, "a");

    // Callback should be called only once for ["a", "b"].
    assertEq(callback.mock.calls, [
      [["a", "b"]], // One call, with one param (the array of inputs)
    ]);
  });

  test("should not deduplicate identical calls if they're not in the same batch", async () => {
    const callback = vi.fn(synchronousCallback);
    const batch = new Batch<string, string>(callback, { delay: SOME_TIME });

    const a$ = batch.get("a");
    const b$ = batch.get("b");
    await wait(SOME_TIME * 1.5);
    const duplicatedA$ = batch.get("a");

    await assertEq(a$, "a");
    await assertEq(b$, "b");
    await assertEq(duplicatedA$, "a");

    assertEq(callback.mock.calls, [
      // Callback should be called twice, once for ["a", "b"] and once for ["a"] again.
      [["a", "b"]],
      [["a"]],
    ]);
  });
});

describe("createBatchStore", () => {
  test("should set state to loading then result with `enqueue`", async () => {
    const callback = vi.fn((inputs: string[]) => inputs);
    const batch = new Batch<string, string>(callback, { delay: SOME_TIME });
    const store = createBatchStore<string, string>(batch);
    const listener = vi.fn();
    const unsubscribe = store.subscribe(listener);

    const promise$ = store.enqueue("a");

    assertEq(store.getItemState("a"), { isLoading: true });
    assertEq(store.getData("a"), undefined);

    await promise$;

    assertEq(store.getItemState("a"), { isLoading: false, data: "a" });
    assertSame(store.getData("a"), "a");
    assertEq(listener.mock.calls.length, 2);

    unsubscribe();
  });

  test("should not re-enqueue duplicate calls with `enqueue`", async () => {
    const callback = vi.fn((inputs: string[]) => inputs);
    const batch = new Batch<string, string>(callback, { delay: SOME_TIME });
    const store = createBatchStore<string, string>(batch);
    const listener = vi.fn();
    const unsubscribe = store.subscribe(listener);

    const promise1$ = store.enqueue("a");
    const promise2$ = store.enqueue("a");

    await Promise.all([promise1$, promise2$]);

    assertSame(store.getData("a"), "a");
    assertEq(listener.mock.calls.length, 2);

    unsubscribe();
  });

  test("should not change the state with `enqueue` if the entry was already resolved", async () => {
    const callback = vi.fn((inputs: string[]) => inputs);
    const batch = new Batch<string, string>(callback, { delay: SOME_TIME });
    const store = createBatchStore<string, string>(batch);
    const listener = vi.fn();

    // Set an initial value
    store.setData([["a", "A"]]);

    const unsubscribe = store.subscribe(listener);

    await store.enqueue("a");
    assertEq(listener.mock.calls, []);
    assertSame(store.getData("a"), "A");

    unsubscribe();
  });

  test("should set error state with `enqueue` when batch rejects an item", async () => {
    const callback = vi.fn(() => [new Error("boom")]);
    const batch = new Batch<string, string>(callback, { delay: SOME_TIME });
    const store = createBatchStore<string, string>(batch);
    const listener = vi.fn();
    const unsubscribe = store.subscribe(listener);

    await store.enqueue("a");

    assertSame(store.getItemState("a")?.isLoading, false);
    assertSame((store.getItemState("a") as any).error?.message, "boom");
    assertEq(store.getData("a"), undefined);
    assertEq(listener.mock.calls, [[undefined], [undefined]]);

    unsubscribe();
  });

  test("should remove specific entries with `invalidate`", () => {
    const batch = new Batch<string, string>(() => [], { delay: SOME_TIME });
    const store = createBatchStore<string, string>(batch);
    const listener = vi.fn();

    store.setData([
      ["a", "A"],
      ["b", "B"],
    ]);

    const unsubscribe = store.subscribe(listener);

    store.invalidate(["a"]);

    assertEq(store.getData("a"), undefined);
    assertSame(store.getData("b"), "B");
    assertEq(listener.mock.calls.length, 1);

    unsubscribe();
  });

  test("should clear cache with `invalidate`", () => {
    const batch = new Batch<string, string>(() => [], { delay: SOME_TIME });
    const store = createBatchStore<string, string>(batch);
    const listener = vi.fn();

    store.setData([
      ["a", "A"],
      ["b", "B"],
    ]);

    const unsubscribe = store.subscribe(listener);

    store.invalidate();

    assertEq(store.getData("a"), undefined);
    assertEq(store.getData("b"), undefined);
    assertEq(listener.mock.calls.length, 1);

    unsubscribe();
  });

  test("should return undefined for unknown input with `getItemState`", () => {
    const batch = new Batch<string, string>(() => [], { delay: SOME_TIME });
    const store = createBatchStore<string, string>(batch);

    assertEq(store.getItemState("unknown"), undefined);
  });

  test("should set a single entry with `setData` and update the store's signal only once", () => {
    const batch = new Batch<string, string>(() => [], { delay: SOME_TIME });
    const store = createBatchStore<string, string>(batch);
    const listener = vi.fn();
    const unsubscribe = store.subscribe(listener);

    store.setData([["a", "A"]]);

    assertSame(store.getData("a"), "A");
    assertEq(store.getItemState("a"), { isLoading: false, data: "A" });
    assertEq(listener.mock.calls.length, 1);

    unsubscribe();
  });

  test("should set multiple entries with `setData` and update the store's signal only once", () => {
    const batch = new Batch<string, string>(() => [], { delay: SOME_TIME });
    const store = createBatchStore<string, string>(batch);
    const listener = vi.fn();
    const unsubscribe = store.subscribe(listener);

    store.setData([
      ["a", "A"],
      ["b", "B"],
      ["c", "C"],
    ]);

    assertSame(store.getData("a"), "A");
    assertSame(store.getData("b"), "B");
    assertSame(store.getData("c"), "C");
    assertEq(listener.mock.calls.length, 1);

    unsubscribe();
  });

  test("should batch when overwriting multiple entries with `setData`", () => {
    const batch = new Batch<string, string>(() => [], { delay: SOME_TIME });
    const store = createBatchStore<string, string>(batch);
    const listener = vi.fn();

    // Set initial values
    store.setData([
      ["a", "A"],
      ["b", "B"],
    ]);

    const unsubscribe = store.subscribe(listener);

    store.setData([
      ["a", "A2"],
      ["b", "B2"],
    ]);

    assertSame(store.getData("a"), "A2");
    assertSame(store.getData("b"), "B2");
    assertEq(listener.mock.calls.length, 1);

    unsubscribe();
  });
});
