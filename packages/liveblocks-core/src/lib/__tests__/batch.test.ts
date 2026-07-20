import { describe, expect, test, vi } from "vitest";

import { Batch, createBatchStore } from "../batch";
import { Promise_withResolvers } from "../controlledPromise";
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

    const a = batch.get("a");
    const b = batch.get("b");

    await expect(a).resolves.toEqual("a");
    await expect(b).resolves.toEqual("b");

    // Callback should be called only once for both "a" and "b".
    expect(callback).toHaveBeenCalledWith(["a", "b"]);
  });

  test("should batch asynchronous calls", async () => {
    const callback = vi.fn(asynchronousCallback);
    const batch = new Batch<string, string>(callback, { delay: SOME_TIME });

    const a = batch.get("a");
    const b = batch.get("b");

    await expect(a).resolves.toEqual("a");
    await expect(b).resolves.toEqual("b");

    // Callback should be called only once for both "a" and "b".
    expect(callback).toHaveBeenCalledWith(["a", "b"]);
  });

  test("should batch based on delay", async () => {
    const callback = vi.fn(synchronousCallback);
    const batch = new Batch<string, string>(callback, { delay: SOME_TIME });

    const a = batch.get("a");
    await wait(SOME_TIME * 1.5);
    const b = batch.get("b");

    await expect(a).resolves.toEqual("a");
    await expect(b).resolves.toEqual("b");

    // Callback should be called twice, once for "a" and once for "b".
    expect(callback).toHaveBeenCalledTimes(2);
    expect(callback).toHaveBeenNthCalledWith(1, ["a"]);
    expect(callback).toHaveBeenNthCalledWith(2, ["b"]);
  });

  test("should batch based on size", async () => {
    const callback = vi.fn(synchronousCallback);
    const batch = new Batch<string, string>(callback, {
      delay: SOME_TIME,
      size: 1,
    });

    const a = batch.get("a");
    const b = batch.get("b");

    await expect(a).resolves.toEqual("a");
    await expect(b).resolves.toEqual("b");

    // Callback should be called twice, once for "a" and once for "b".
    expect(callback).toHaveBeenCalledTimes(2);
    expect(callback).toHaveBeenNthCalledWith(1, ["a"]);
    expect(callback).toHaveBeenNthCalledWith(2, ["b"]);
  });

  test("should reject batch errors", async () => {
    const callback = vi.fn(() => {
      throw ERROR;
    });
    const batch = new Batch<string, string>(callback, { delay: SOME_TIME });

    const a = batch.get("a");
    const b = batch.get("b");

    // All calls should reject with the error thrown by the callback.
    await expect(a).rejects.toEqual(ERROR);
    await expect(b).rejects.toEqual(ERROR);
  });

  test("should reject batch rejections", async () => {
    const callback = vi.fn(() => {
      return Promise.reject(ERROR_MESSAGE);
    });
    const batch = new Batch<string, string>(callback, { delay: SOME_TIME });

    const a = batch.get("a");
    const b = batch.get("b");

    // All calls should reject with the rejection reason returned by the callback.
    await expect(a).rejects.toEqual(ERROR_MESSAGE);
    await expect(b).rejects.toEqual(ERROR_MESSAGE);
  });

  test("should reject individual errors", async () => {
    const callback = vi.fn(() => {
      return ["a", ERROR];
    });
    const batch = new Batch<string, string>(callback, { delay: SOME_TIME });

    const a = batch.get("a");
    const b = batch.get("b");

    // "a" should resolve, "b" should reject.
    await expect(a).resolves.toEqual("a");
    await expect(b).rejects.toEqual(ERROR);
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

    const a = batch.get("a");
    const b = batch.get("b");
    const duplicatedA = batch.get("a");

    await expect(a).resolves.toEqual("a");
    await expect(b).resolves.toEqual("b");
    await expect(duplicatedA).resolves.toEqual("a");

    // Callback should be called only once for ["a", "b"].
    expect(callback).toHaveBeenCalledTimes(1);
    expect(callback).toHaveBeenCalledWith(["a", "b"]);
  });

  test("should not deduplicate identical calls if they're not in the same batch", async () => {
    const callback = vi.fn(synchronousCallback);
    const batch = new Batch<string, string>(callback, { delay: SOME_TIME });

    const a = batch.get("a");
    const b = batch.get("b");
    await wait(SOME_TIME * 1.5);
    const duplicatedA = batch.get("a");

    await expect(a).resolves.toEqual("a");
    await expect(b).resolves.toEqual("b");
    await expect(duplicatedA).resolves.toEqual("a");

    // Callback should be called twice, once for ["a", "b"] and once for ["a"] again.
    expect(callback).toHaveBeenCalledTimes(2);
    expect(callback).toHaveBeenNthCalledWith(1, ["a", "b"]);
    expect(callback).toHaveBeenNthCalledWith(2, ["a"]);
  });
});

describe("createBatchStore", () => {
  test("should invalidate cached data when it expires", async () => {
    vi.useFakeTimers();

    try {
      const callback = vi.fn((inputs: string[]) => inputs);
      const batch = new Batch<string, string>(callback, { delay: SOME_TIME });
      const store = createBatchStore<string, string>(batch, {
        getCacheExpiry: () => Date.now() + SOME_TIME,
      });

      const enqueuePromise = store.enqueue("a");
      await vi.advanceTimersByTimeAsync(SOME_TIME);
      await enqueuePromise;

      expect(store.getData("a")).toBe("a");

      await vi.advanceTimersByTimeAsync(SOME_TIME - 1);
      expect(store.getData("a")).toBe("a");

      await vi.advanceTimersByTimeAsync(1);
      expect(store.getData("a")).toBeUndefined();
    } finally {
      vi.useRealTimers();
    }
  });

  test("should resolve when a cached error expires", async () => {
    vi.useFakeTimers();

    try {
      const batch = new Batch<string, string>(() => [ERROR], {
        delay: SOME_TIME,
      });
      const store = createBatchStore<string, string>(batch, {
        getErrorCacheExpiry: () => Date.now() + SOME_TIME,
      });
      let cacheExpiryFromSubscription$: Promise<void> | undefined;
      const unsubscribe = store.subscribe(() => {
        if (store.getItemState("a")?.error) {
          cacheExpiryFromSubscription$ = store.waitUntilItemCacheExpires("a");
        }
      });

      const enqueue$ = store.enqueue("a");
      await vi.advanceTimersByTimeAsync(SOME_TIME);
      await enqueue$;

      expect(store.getItemState("a")).toEqual({
        isLoading: false,
        error: ERROR,
      });

      const cacheExpiry$ = store.waitUntilItemCacheExpires("a");
      expect(cacheExpiry$).toBeDefined();
      expect(cacheExpiryFromSubscription$).toBeDefined();

      await vi.advanceTimersByTimeAsync(SOME_TIME);
      await cacheExpiry$;
      await cacheExpiryFromSubscription$;
      unsubscribe();

      expect(store.getItemState("a")).toBeUndefined();
    } finally {
      vi.useRealTimers();
    }
  });

  test("should set state to loading then result with `enqueue`", async () => {
    const callback = vi.fn((inputs: string[]) => inputs);
    const batch = new Batch<string, string>(callback, { delay: SOME_TIME });
    const store = createBatchStore<string, string>(batch);
    const listener = vi.fn();
    const unsubscribe = store.subscribe(listener);

    const promise = store.enqueue("a");

    expect(store.getItemState("a")).toEqual({ isLoading: true });
    expect(store.getData("a")).toBeUndefined();

    await promise;

    expect(store.getItemState("a")).toEqual({ isLoading: false, data: "a" });
    expect(store.getData("a")).toBe("a");
    expect(listener).toHaveBeenCalledTimes(2);

    unsubscribe();
  });

  test("should return the pending promise for duplicate calls with `enqueue`", async () => {
    const { promise: callbackResult$, resolve: resolveCallback } =
      Promise_withResolvers<string[]>();
    const callback = vi.fn(() => callbackResult$);
    const batch = new Batch<string, string>(callback, {
      delay: SOME_TIME,
      size: 1,
    });
    const store = createBatchStore<string, string>(batch);
    const listener = vi.fn();
    const unsubscribe = store.subscribe(listener);

    const promise1 = store.enqueue("a");
    const promise2 = store.enqueue("a");

    expect(promise2).toBe(promise1);
    resolveCallback(["a"]);
    await Promise.all([promise1, promise2]);

    expect(store.getData("a")).toBe("a");
    expect(callback).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledTimes(2);

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
    expect(listener).toHaveBeenCalledTimes(0);
    expect(store.getData("a")).toBe("A");

    unsubscribe();
  });

  test("should set error state with `enqueue` when batch rejects an item", async () => {
    const callback = vi.fn(() => [new Error("boom")]);
    const batch = new Batch<string, string>(callback, { delay: SOME_TIME });
    const store = createBatchStore<string, string>(batch);
    const listener = vi.fn();
    const unsubscribe = store.subscribe(listener);

    await store.enqueue("a");

    expect(store.getItemState("a")?.isLoading).toBe(false);
    expect((store.getItemState("a") as any).error?.message).toBe("boom");
    expect(store.getData("a")).toBeUndefined();
    expect(listener).toHaveBeenCalledTimes(2);

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

    expect(store.getData("a")).toBeUndefined();
    expect(store.getData("b")).toBe("B");
    expect(listener).toHaveBeenCalledTimes(1);

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

    expect(store.getData("a")).toBeUndefined();
    expect(store.getData("b")).toBeUndefined();
    expect(listener).toHaveBeenCalledTimes(1);

    unsubscribe();
  });

  test("should return undefined for unknown input with `getItemState`", () => {
    const batch = new Batch<string, string>(() => [], { delay: SOME_TIME });
    const store = createBatchStore<string, string>(batch);

    expect(store.getItemState("unknown")).toBeUndefined();
  });

  test("should set a single entry with `setData` and update the store's signal only once", () => {
    const batch = new Batch<string, string>(() => [], { delay: SOME_TIME });
    const store = createBatchStore<string, string>(batch);
    const listener = vi.fn();
    const unsubscribe = store.subscribe(listener);

    store.setData([["a", "A"]]);

    expect(store.getData("a")).toBe("A");
    expect(store.getItemState("a")).toEqual({ isLoading: false, data: "A" });
    expect(listener).toHaveBeenCalledTimes(1);

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

    expect(store.getData("a")).toBe("A");
    expect(store.getData("b")).toBe("B");
    expect(store.getData("c")).toBe("C");
    expect(listener).toHaveBeenCalledTimes(1);

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

    expect(store.getData("a")).toBe("A2");
    expect(store.getData("b")).toBe("B2");
    expect(listener).toHaveBeenCalledTimes(1);

    unsubscribe();
  });
});
