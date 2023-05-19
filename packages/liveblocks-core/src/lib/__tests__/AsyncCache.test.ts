import type { AsyncState } from "../AsyncCache";
import { createAsyncCache } from "../AsyncCache";

const REQUEST_DELAY = 100;
const KEY_ABC = "abc";
const KEY_XYZ = "xyz";
const ERROR_MESSAGE = "error";

async function sleep(ms: number): Promise<42> {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(42);
    }, ms);
  });
}

describe("AsyncCache", () => {
  test("getting the same key", async () => {
    const asyncFunction = jest.fn(async (key: string) => {
      await sleep(REQUEST_DELAY);

      return key;
    });
    const cache = createAsyncCache(asyncFunction);

    const successState: AsyncState<string> = {
      status: "success",
      data: KEY_ABC,
      error: undefined,
    };

    expect(await cache.get(KEY_ABC)).toMatchObject(successState);
    expect(await cache.get(KEY_ABC)).toMatchObject(successState);
    expect(await cache.get(KEY_ABC)).toMatchObject(successState);

    expect(asyncFunction).toHaveBeenCalledTimes(1);
    expect(asyncFunction).toHaveBeenCalledWith(KEY_ABC);
  });

  test("getting multiple keys", async () => {
    const asyncFunction = jest.fn(async (key: string) => {
      await sleep(REQUEST_DELAY);

      return key;
    });
    const asyncCache = createAsyncCache(asyncFunction);

    const abc = await asyncCache.get(KEY_ABC);
    const xyz = await asyncCache.get(KEY_XYZ);

    expect(abc.data).toEqual(KEY_ABC);
    expect(xyz.data).toEqual(KEY_XYZ);
    expect(asyncFunction).toHaveBeenCalledTimes(2);
  });

  test("getting an error then a success", async () => {
    let index = 0;
    const asyncFunction = jest.fn(async (key: string) => {
      const isError = index === 0;
      index += 1;

      await sleep(REQUEST_DELAY);

      if (isError) {
        throw new Error(ERROR_MESSAGE);
      } else {
        return key;
      }
    });
    const asyncCache = createAsyncCache<string, Error>(asyncFunction);

    const firstState = await asyncCache.get(KEY_ABC);
    expect(firstState).toMatchObject({
      status: "error",
      data: undefined,
      error: new Error(ERROR_MESSAGE),
    });

    const secondState = await asyncCache.get(KEY_ABC);
    expect(secondState).toMatchObject({
      status: "success",
      data: KEY_ABC,
      error: undefined,
    });

    expect(asyncFunction).toHaveBeenCalledTimes(2);
  });

  test("getting a success then an error", async () => {
    let index = 0;
    const asyncFunction = jest.fn(async (key: string) => {
      const isError = index > 0;
      index += 1;

      await sleep(REQUEST_DELAY);

      if (isError) {
        throw new Error(ERROR_MESSAGE);
      } else {
        return key;
      }
    });

    const asyncCache = createAsyncCache<string, Error>(asyncFunction);

    const firstState = await asyncCache.get(KEY_ABC);
    expect(firstState).toMatchObject({
      status: "success",
      data: KEY_ABC,
      error: undefined,
    });

    await asyncCache.revalidate(KEY_ABC);

    // TODO: Option to hold onto the last success state if there's an error?
    const secondState = await asyncCache.get(KEY_ABC);
    expect(secondState).toMatchObject({
      status: "error",
      data: undefined,
      error: new Error(ERROR_MESSAGE),
    });

    expect(asyncFunction).toHaveBeenCalledTimes(3);
  });

  test("subscribing to a key", async () => {
    const asyncFunction = jest.fn(async (key: string) => {
      await sleep(REQUEST_DELAY);

      return key;
    });
    const asyncCache = createAsyncCache(asyncFunction);
    const subscribeCallback = jest.fn();

    const cacheItem = asyncCache.create(KEY_ABC);
    const unsubscribe = cacheItem.subscribe(subscribeCallback);

    await cacheItem.get();

    unsubscribe();

    await cacheItem.revalidate();

    expect(subscribeCallback).toHaveBeenCalledTimes(2);
    expect(subscribeCallback).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        status: "loading",
        data: undefined,
        error: undefined,
      })
    );
    expect(subscribeCallback).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        status: "success",
        data: KEY_ABC,
        error: undefined,
      })
    );
  });

  test("using a non-existing key", async () => {
    const asyncFunction = jest.fn(async (key: string) => {
      await sleep(REQUEST_DELAY);

      return key;
    });
    const asyncCache = createAsyncCache(asyncFunction);
    const subscribeCallback = jest.fn();

    const unsubscribe = asyncCache.subscribe(KEY_ABC, subscribeCallback);
    expect(unsubscribe).toEqual(expect.any(Function));

    await asyncCache.revalidate(KEY_ABC);

    expect(asyncCache.getState(KEY_ABC)).toBeUndefined();

    await asyncCache.get(KEY_ABC);

    expect(subscribeCallback).not.toHaveBeenCalled();
  });

  test("clearing the cache", async () => {
    const asyncFunction = jest.fn(async (key: string) => {
      await sleep(REQUEST_DELAY);

      return key;
    });
    const asyncCache = createAsyncCache(asyncFunction);

    await asyncCache.get(KEY_ABC);

    asyncCache.clear();

    await asyncCache.get(KEY_ABC);

    expect(asyncFunction).toHaveBeenCalledTimes(2);
  });

  test("statuses", async () => {
    let index = 0;
    const asyncFunction = jest.fn(async () => {
      const isError = index === 0;
      index += 1;

      await sleep(REQUEST_DELAY);

      if (isError) {
        throw new Error(ERROR_MESSAGE);
      } else {
        return index;
      }
    });
    const asyncCache = createAsyncCache(asyncFunction);

    const cacheItem = asyncCache.create(KEY_ABC);

    expect(asyncFunction).not.toHaveBeenCalled();
    expect(cacheItem.getState()).toMatchObject({
      status: "idle",
      data: undefined,
      error: undefined,
    });

    void cacheItem.get();

    expect(cacheItem.getState()).toMatchObject({
      status: "loading",
      data: undefined,
      error: undefined,
    });

    await sleep(REQUEST_DELAY);

    expect(cacheItem.getState()).toMatchObject({
      status: "error",
      data: undefined,
      error: new Error(ERROR_MESSAGE),
    });

    // Will revalidate because there's no data yet
    await cacheItem.get();

    expect(cacheItem.getState()).toMatchObject({
      status: "success",
      data: 2,
      error: undefined,
    });

    // Will not revalidate because there's data
    await cacheItem.get();

    expect(cacheItem.getState()).toMatchObject({
      status: "success",
      data: 2,
      error: undefined,
    });

    // Will revalidate even if there's data already
    await cacheItem.revalidate();

    expect(cacheItem.getState()).toMatchObject({
      status: "success",
      data: 3,
      error: undefined,
    });
  });
});
