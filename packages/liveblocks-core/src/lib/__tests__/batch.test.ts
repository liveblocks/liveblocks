import { sleep } from "../../__tests__/_waitUtils";
import { Batch, BatchCache } from "../batch";

const SOME_TIME = 5;
const ERROR_MESSAGE = "error";
const ERROR = new Error(ERROR_MESSAGE);

const synchronousCallback = (args: [string][]) => {
  return args.map(([userId]) => userId);
};

const asynchronousCallback = async (args: [string][]) => {
  await sleep(SOME_TIME);

  return args.map(([userId]) => userId);
};

describe("Batch", () => {
  test("should batch synchronous calls", async () => {
    const callback = jest.fn(synchronousCallback);
    const batch = new Batch<string, [string]>(callback, { delay: SOME_TIME });

    const a = batch.add("a");
    const b = batch.add("b");

    await expect(a).resolves.toEqual("a");
    await expect(b).resolves.toEqual("b");

    // Callback should be called only once for both "a" and "b".
    expect(callback).toHaveBeenCalledWith([["a"], ["b"]]);
  });

  test("should batch asynchronous calls", async () => {
    const callback = jest.fn(asynchronousCallback);
    const batch = new Batch<string, [string]>(callback, { delay: SOME_TIME });

    const a = batch.add("a");
    const b = batch.add("b");

    await expect(a).resolves.toEqual("a");
    await expect(b).resolves.toEqual("b");

    // Callback should be called only once for both "a" and "b".
    expect(callback).toHaveBeenCalledWith([["a"], ["b"]]);
  });

  test("should batch based on delay", async () => {
    const callback = jest.fn(synchronousCallback);
    const batch = new Batch<string, [string]>(callback, { delay: SOME_TIME });

    const a = batch.add("a");
    await sleep(SOME_TIME * 1.5);
    const b = batch.add("b");

    await expect(a).resolves.toEqual("a");
    await expect(b).resolves.toEqual("b");

    // Callback should be called twice, once for "a" and once for "b".
    expect(callback).toHaveBeenCalledTimes(2);
    expect(callback).toHaveBeenNthCalledWith(1, [["a"]]);
    expect(callback).toHaveBeenNthCalledWith(2, [["b"]]);
  });

  test("should batch based on size", async () => {
    const callback = jest.fn(synchronousCallback);
    const batch = new Batch<string, [string]>(callback, {
      delay: SOME_TIME,
      size: 1,
    });

    const a = batch.add("a");
    const b = batch.add("b");

    await expect(a).resolves.toEqual("a");
    await expect(b).resolves.toEqual("b");

    // Callback should be called twice, once for "a" and once for "b".
    expect(callback).toHaveBeenNthCalledWith(1, [["a"]]);
    expect(callback).toHaveBeenNthCalledWith(2, [["b"]]);
  });

  test("should reject batch errors", async () => {
    const callback = jest.fn(() => {
      throw ERROR;
    });
    const batch = new Batch<string, [string]>(callback, { delay: SOME_TIME });

    const a = batch.add("a");
    const b = batch.add("b");

    // All calls should reject with the error thrown by the callback.
    await expect(a).rejects.toEqual(ERROR);
    await expect(b).rejects.toEqual(ERROR);
  });

  test("should reject batch rejections", async () => {
    const callback = jest.fn(() => {
      return Promise.reject(ERROR_MESSAGE);
    });
    const batch = new Batch<string, [string]>(callback, { delay: SOME_TIME });

    const a = batch.add("a");
    const b = batch.add("b");

    // All calls should reject with the rejection reason returned by the callback.
    await expect(a).rejects.toEqual(ERROR_MESSAGE);
    await expect(b).rejects.toEqual(ERROR_MESSAGE);
  });

  test("should reject individual errors", async () => {
    const callback = jest.fn(() => {
      return ["a", ERROR];
    });
    const batch = new Batch<string, [string]>(callback, { delay: SOME_TIME });

    const a = batch.add("a");
    const b = batch.add("b");

    // "a" should resolve, "b" should reject.
    await expect(a).resolves.toEqual("a");
    await expect(b).rejects.toEqual(ERROR);
  });

  test("should reject if callback doesn't return an array", async () => {
    const callback = jest.fn();
    const batch = new Batch<string, [string]>(callback, { delay: SOME_TIME });

    await expect(batch.add("a")).rejects.toEqual(
      new Error("Batch callback must return an array.")
    );
  });

  test("should reject if callback doesn't return an array of the same length as batch", async () => {
    const callback = jest.fn(() => []);
    const batch = new Batch<string, [string]>(callback, { delay: SOME_TIME });

    await expect(batch.add("a")).rejects.toEqual(
      new Error(
        "Batch callback must return an array of the same length as the number of calls in the batch. Expected 1, but got 0."
      )
    );
  });
});

describe("BatchCache", () => {
  test("should cache and return results for synchronous calls", async () => {
    const callback = jest.fn(synchronousCallback);
    const batch = new BatchCache<string, [string]>(callback, {
      delay: SOME_TIME,
    });

    const a = batch.add("a");
    const b = batch.add("b");

    await expect(a).resolves.toEqual("a");
    await expect(b).resolves.toEqual("b");

    // Callback should be called only once for both "a" and "b".
    expect(callback).toHaveBeenCalledTimes(1);
    expect(callback).toHaveBeenCalledWith([["a"], ["b"]]);

    await sleep(SOME_TIME * 1.5);

    // Subsequent calls should return the cached results.
    const subsequentA = batch.add("a");
    const subsequentB = batch.add("b");

    await expect(subsequentA).resolves.toEqual("a");
    await expect(subsequentB).resolves.toEqual("b");

    // Callback should not be called again.
    expect(callback).toHaveBeenCalledTimes(1);

    // Unless a non-cached call is made.
    const c = batch.add("c");

    // Callback should be called again for "c".
    await expect(c).resolves.toEqual("c");
    expect(callback).toHaveBeenCalledTimes(2);
    expect(callback).toHaveBeenNthCalledWith(2, [["c"]]);
  });

  test("should cache and return results for asynchronous calls", async () => {
    const callback = jest.fn(asynchronousCallback);
    const batch = new BatchCache<string, [string]>(callback, {
      delay: SOME_TIME,
    });

    const a = batch.add("a");
    const b = batch.add("b");

    await expect(a).resolves.toEqual("a");
    await expect(b).resolves.toEqual("b");

    // Callback should be called only once for both "a" and "b".
    expect(callback).toHaveBeenCalledTimes(1);
    expect(callback).toHaveBeenCalledWith([["a"], ["b"]]);

    await sleep(SOME_TIME * 1.5);

    // Subsequent calls should return the cached results.
    const subsequentA = batch.add("a");
    const subsequentB = batch.add("b");

    await expect(subsequentA).resolves.toEqual("a");
    await expect(subsequentB).resolves.toEqual("b");

    // Callback should not be called again.
    expect(callback).toHaveBeenCalledTimes(1);

    await sleep(SOME_TIME * 1.5);

    // Unless a non-cached call is made.
    const c = batch.add("c");

    // Callback should be called again for "c".
    await expect(c).resolves.toEqual("c");
    expect(callback).toHaveBeenCalledTimes(2);
    expect(callback).toHaveBeenNthCalledWith(2, [["c"]]);
  });

  test("should not cache batch errors", async () => {
    const callback = jest.fn(() => {
      throw ERROR;
    });
    const batch = new BatchCache<string, [string]>(callback, {
      delay: SOME_TIME,
    });

    const a = batch.add("a");
    const b = batch.add("b");

    await expect(a).rejects.toEqual(ERROR);
    await expect(b).rejects.toEqual(ERROR);

    // Callback should be called only once for both "a" and "b".
    expect(callback).toHaveBeenCalledTimes(1);
    expect(callback).toHaveBeenCalledWith([["a"], ["b"]]);

    // Subsequent calls should create a new batch since the first one errored.
    const subsequentA = batch.add("a");
    const subsequentB = batch.add("b");

    await expect(subsequentA).rejects.toEqual(ERROR);
    await expect(subsequentB).rejects.toEqual(ERROR);

    // Callback should be called again for both "a" and "b".
    expect(callback).toHaveBeenCalledTimes(2);
    expect(callback).toHaveBeenNthCalledWith(2, [["a"], ["b"]]);
  });

  test("should cache individual errors", async () => {
    const callback = jest.fn(() => ["a", ERROR]);
    const batch = new BatchCache<string, [string]>(callback, {
      delay: SOME_TIME,
    });

    const a = batch.add("a");
    const b = batch.add("b");

    await expect(a).resolves.toEqual("a");
    await expect(b).rejects.toEqual(ERROR);

    // Callback should be called only once for both "a" and "b".
    expect(callback).toHaveBeenCalledTimes(1);
    expect(callback).toHaveBeenCalledWith([["a"], ["b"]]);

    // Subsequent calls should return the cached results (including errors).
    const subsequentA = batch.add("a");
    const subsequentB = batch.add("b");

    await expect(subsequentA).resolves.toEqual("a");
    await expect(subsequentB).rejects.toEqual(ERROR);

    // Callback should not be called again.
    expect(callback).toHaveBeenCalledTimes(1);
  });

  test("should remove calls from the cache", async () => {
    const callback = jest.fn(synchronousCallback);
    const batch = new BatchCache<string, [string]>(callback, {
      delay: SOME_TIME,
    });

    const a = batch.add("a");
    const b = batch.add("b");

    await expect(a).resolves.toEqual("a");
    await expect(b).resolves.toEqual("b");

    // Callback should be called only once for both "a" and "b".
    expect(callback).toHaveBeenCalledTimes(1);
    expect(callback).toHaveBeenCalledWith([["a"], ["b"]]);

    // "a" should be removed from the cache.
    batch.remove("a");

    // Subsequent call for "a" should trigger the callback again.
    const subsequentA = batch.add("a");
    await expect(subsequentA).resolves.toEqual("a");

    // Callback should be called twice now.
    expect(callback).toHaveBeenCalledTimes(2);
    expect(callback).toHaveBeenNthCalledWith(2, [["a"]]);

    // "b" should still be in the cache.
    const subsequentB = batch.add("b");
    await expect(subsequentB).resolves.toEqual("b");

    // Callback should not be called again.
    expect(callback).toHaveBeenCalledTimes(2);
  });

  test("should clear the cache", async () => {
    const callback = jest.fn(synchronousCallback);
    const batch = new BatchCache<string, [string]>(callback, {
      delay: SOME_TIME,
    });

    const a = batch.add("a");
    const b = batch.add("b");

    await expect(a).resolves.toEqual("a");
    await expect(b).resolves.toEqual("b");

    // Callback should be called only once for both "a" and "b".
    expect(callback).toHaveBeenCalledTimes(1);
    expect(callback).toHaveBeenCalledWith([["a"], ["b"]]);

    // The cache should be cleared.
    batch.clear();

    // Subsequent calls should trigger the callback again.
    const subsequentA = batch.add("a");
    const subsequentB = batch.add("b");

    await expect(subsequentA).resolves.toEqual("a");
    await expect(subsequentB).resolves.toEqual("b");

    // Callback should be called twice now.
    expect(callback).toHaveBeenCalledTimes(2);
    expect(callback).toHaveBeenNthCalledWith(2, [["a"], ["b"]]);
  });
});
