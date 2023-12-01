import { sleep } from "../../__tests__/_waitUtils";
import { Batch } from "../batch";

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
    expect(callback).toHaveBeenCalledWith([["a"], ["b"]]);
  });

  test("should batch asynchronous calls", async () => {
    const callback = jest.fn(asynchronousCallback);
    const batch = new Batch<string, [string]>(callback, { delay: SOME_TIME });

    const a = batch.add("a");
    const b = batch.add("b");

    await expect(a).resolves.toEqual("a");
    await expect(b).resolves.toEqual("b");
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
    expect(callback).toHaveBeenNthCalledWith(1, [["a"]]);
    expect(callback).toHaveBeenNthCalledWith(2, [["b"]]);
  });

  test("should reject erroring batch", async () => {
    const callback = jest.fn(() => {
      throw ERROR;
    });
    const batch = new Batch<string, [string]>(callback, { delay: SOME_TIME });

    const a = batch.add("a");
    const b = batch.add("b");

    await expect(a).rejects.toEqual(ERROR);
    await expect(b).rejects.toEqual(ERROR);
  });

  test("should reject rejected batch", async () => {
    const callback = jest.fn(() => {
      return Promise.reject(ERROR_MESSAGE);
    });
    const batch = new Batch<string, [string]>(callback, { delay: SOME_TIME });

    const a = batch.add("a");
    const b = batch.add("b");

    await expect(a).rejects.toEqual(ERROR_MESSAGE);
    await expect(b).rejects.toEqual(ERROR_MESSAGE);
  });

  test("should reject individual calls", async () => {
    const callback = jest.fn(() => {
      return ["a", ERROR];
    });
    const batch = new Batch<string, [string]>(callback, { delay: SOME_TIME });

    const a = batch.add("a");
    const b = batch.add("b");

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
        "Batch callback must return an array of the same length as the number of items in the batch. Expected 1, but got 0."
      )
    );
  });
});
