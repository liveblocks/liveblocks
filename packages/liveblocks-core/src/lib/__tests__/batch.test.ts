import { describe, expect, test, vi } from "vitest";

import { Batch } from "../batch";
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
