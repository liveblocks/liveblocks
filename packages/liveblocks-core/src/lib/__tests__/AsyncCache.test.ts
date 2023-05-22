import type { AsyncState } from "../AsyncCache";
import { createAsyncCache } from "../AsyncCache";

const REQUEST_DELAY = 20;
const KEY_ABC = "abc";
const KEY_XYZ = "xyz";
const ERROR = new Error("error");

type AsyncStateDataError<TData = any, TError = any> = Pick<
  AsyncState<TData, TError>,
  "data" | "error"
>;

async function sleep(ms: number): Promise<42> {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(42);
    }, ms);
  });
}

function createAsyncMock(
  errorPredicate: (index: number, key: string) => boolean = () => false
) {
  let index = 0;

  return jest.fn(async (key: string) => {
    const isError = errorPredicate(index, key);
    index += 1;

    await sleep(REQUEST_DELAY);

    if (isError) {
      throw ERROR;
    } else {
      return key;
    }
  });
}

describe("AsyncCache", () => {
  test("getting the same key", async () => {
    const mock = createAsyncMock();
    const cache = createAsyncCache(mock, { deduplicationInterval: 0 });

    // 🚀 Called
    expect(await cache.get(KEY_ABC)).toMatchObject<AsyncStateDataError<string>>(
      {
        data: KEY_ABC,
        error: undefined,
      }
    );

    // ✨ Cached
    expect(await cache.get(KEY_ABC)).toMatchObject<AsyncStateDataError<string>>(
      {
        data: KEY_ABC,
        error: undefined,
      }
    );

    // ✨ Cached
    expect(await cache.get(KEY_ABC)).toMatchObject<AsyncStateDataError<string>>(
      {
        data: KEY_ABC,
        error: undefined,
      }
    );

    expect(mock).toHaveBeenCalledTimes(1);
    expect(mock).toHaveBeenCalledWith(KEY_ABC);
  });

  test("getting the same key in parallel", async () => {
    const mock = createAsyncMock();
    const cache = createAsyncCache(mock, { deduplicationInterval: 0 });

    await Promise.all([
      // 🚀 Called
      cache.get(KEY_ABC),
      // 🔜 Waiting on the first promise
      cache.get(KEY_ABC),
      // 🔜 Waiting on the first promise
      cache.get(KEY_ABC),
    ]);

    expect(mock).toHaveBeenCalledTimes(1);
  });

  test("getting multiple keys", async () => {
    const mock = createAsyncMock((_, key) => key === KEY_XYZ);
    const cache = createAsyncCache(mock, { deduplicationInterval: 0 });

    // 🚀 Called with "abc"
    const abc = await cache.get(KEY_ABC);
    // 🚀 Called with "xyz"
    const xyz = await cache.get(KEY_XYZ);

    expect(abc).toMatchObject<AsyncStateDataError<string>>({
      data: KEY_ABC,
      error: undefined,
    });
    expect(xyz).toMatchObject<AsyncStateDataError<string>>({
      data: undefined,
      error: ERROR,
    });

    expect(mock).toHaveBeenCalledTimes(2);
  });

  test("staying invalid when erroring", async () => {
    const mock = createAsyncMock((index) => index === 0);
    const cache = createAsyncCache(mock, {
      deduplicationInterval: 0,
    });

    // 🚀 Called and ❌ errored
    expect(await cache.get(KEY_ABC)).toMatchObject<AsyncStateDataError<string>>(
      {
        data: undefined,
        error: ERROR,
      }
    );

    // 🚀 Called again because the first call errored
    expect(await cache.get(KEY_ABC)).toMatchObject<AsyncStateDataError<string>>(
      {
        data: KEY_ABC,
        error: undefined,
      }
    );

    expect(mock).toHaveBeenCalledTimes(2);
  });

  test("deduplicating", async () => {
    const mock = createAsyncMock();
    const cache = createAsyncCache(mock, {
      deduplicationInterval: REQUEST_DELAY * 1.5,
    });

    // 🚀 Called
    await cache.get(KEY_ABC);
    // 🔜 Deduplicated
    await cache.get(KEY_ABC);

    cache.invalidate(KEY_ABC);
    // 🔜 Still deduplicated, regardless of invalidation
    await cache.get(KEY_ABC);

    await sleep(REQUEST_DELAY);

    cache.invalidate(KEY_ABC);

    // 🚀 Called because the last non-deduplicated call was older than the deduplication interval
    await cache.get(KEY_ABC);

    expect(mock).toHaveBeenCalledTimes(2);
  });

  test("invalidating", async () => {
    const mock = createAsyncMock();
    const cache = createAsyncCache(mock, { deduplicationInterval: 0 });

    // 🚀 Called
    await cache.get(KEY_ABC);

    // 🗑️ Clears the cache for "abc"
    cache.invalidate(KEY_ABC);

    expect(cache.getState(KEY_ABC)?.data).toBeUndefined();

    // 🚀 Called because invalidated
    expect(await cache.get(KEY_ABC)).toMatchObject<AsyncStateDataError<string>>(
      {
        data: KEY_ABC,
        error: undefined,
      }
    );

    expect(mock).toHaveBeenCalledTimes(2);
  });

  test("invalidating without clearing the cache", async () => {
    const mock = createAsyncMock();
    const cache = createAsyncCache(mock, { deduplicationInterval: 0 });

    // 🚀 Called
    await cache.get(KEY_ABC);

    expect(cache.getState(KEY_ABC)?.data).not.toBeUndefined();

    // 🗑️ Doesn't clear the cache for "abc"
    cache.invalidate(KEY_ABC, { keepPreviousData: true });

    expect(cache.getState(KEY_ABC)?.data).not.toBeUndefined();

    // 🚀 Called because invalidated
    expect(await cache.get(KEY_ABC)).toMatchObject<AsyncStateDataError<string>>(
      {
        data: KEY_ABC,
        error: undefined,
      }
    );

    expect(mock).toHaveBeenCalledTimes(2);
  });

  test("clearing the cache", async () => {
    const mock = createAsyncMock();
    const cache = createAsyncCache(mock, {
      deduplicationInterval: 0,
    });

    // 🚀 Called
    await cache.get(KEY_ABC);

    // 🗑️ Cleared
    cache.clear();

    expect(cache.has(KEY_ABC)).toBe(false);

    // 🚀 Called because the cache was cleared
    await cache.get(KEY_ABC);

    expect(mock).toHaveBeenCalledTimes(2);
  });

  test("clearing the cache while running", async () => {
    const mock = createAsyncMock();
    const cache = createAsyncCache(mock, {
      deduplicationInterval: 0,
    });

    // 🚀 Called with "abc"
    await cache.get(KEY_ABC);

    // 🚀 Called with "xyz"
    const promise = cache.get(KEY_XYZ);

    // 🗑️ Cleared
    cache.clear();

    // 🔙 Despite the cache being cleared, the promise is still resolved
    const state = await promise;

    expect(cache.has(KEY_ABC)).toBe(false);
    expect(cache.has(KEY_XYZ)).toBe(false);
    expect(state).toMatchObject<AsyncStateDataError<string>>({
      data: KEY_XYZ,
      error: undefined,
    });
  });

  test("checking if a key exists", async () => {
    const mock = createAsyncMock();
    const cache = createAsyncCache(mock, {
      deduplicationInterval: 0,
    });

    expect(cache.has(KEY_ABC)).toBe(false);

    // 🚀 Called
    await cache.get(KEY_ABC);

    expect(cache.has(KEY_ABC)).toBe(true);
  });

  test("getting the cache of a key", async () => {
    const mock = createAsyncMock();
    const cache = createAsyncCache(mock, {
      deduplicationInterval: 0,
    });

    // 🚀 Called
    await cache.get(KEY_ABC);

    expect(cache.getState(KEY_ABC)).toMatchObject<AsyncStateDataError<string>>({
      data: KEY_ABC,
      error: undefined,
    });
  });

  test("getting the cache of a non-existing key", () => {
    const mock = createAsyncMock();
    const cache = createAsyncCache(mock, {
      deduplicationInterval: 0,
    });

    expect(cache.getState(KEY_ABC)).toBeUndefined();
  });

  test("subscribing to a key", async () => {
    const mock = createAsyncMock((index) => index === 0);
    const cache = createAsyncCache(mock, {
      deduplicationInterval: 0,
    });
    const callback = jest.fn();

    const cacheItem = cache.create(KEY_ABC);
    const unsubscribe = cacheItem.subscribe(callback);

    // 🚀 Called and ❌ errored
    await cacheItem.get();

    // 🚀 Called and ✅ fulfilled
    await cacheItem.get();

    unsubscribe();

    // 🚀 Called but 🔜 the subscriber won't be notified because it unsubscribed
    await cacheItem.get();

    expect(callback).toHaveBeenCalledTimes(4);

    // 1️⃣ Triggered when the first call starts
    expect(callback).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining<AsyncState<string>>({
        isLoading: true,
        data: undefined,
        error: undefined,
      })
    );
    // 2️⃣❌ Triggered when the first call resolved
    expect(callback).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining<AsyncState<string>>({
        isLoading: false,
        data: undefined,
        error: ERROR,
      })
    );
    // 3️⃣ Triggered when the second call starts
    expect(callback).toHaveBeenNthCalledWith(
      3,
      expect.objectContaining<AsyncState<string>>({
        isLoading: true,
        data: undefined,
        error: undefined,
      })
    );
    // 4️⃣✅ Triggered when the second call resolved
    expect(callback).toHaveBeenNthCalledWith(
      4,
      expect.objectContaining<AsyncState<string>>({
        isLoading: false,
        data: KEY_ABC,
        error: undefined,
      })
    );
  });

  test("subscribing a non-existing key", async () => {
    const mock = createAsyncMock();
    const cache = createAsyncCache(mock, {
      deduplicationInterval: 0,
    });
    const callback = jest.fn();

    // 🛎️ Subscribes to a key that doesn't exist yet
    const unsubscribe = cache.subscribe(KEY_ABC, callback);

    // 🚀 Called and 🛎️ the subscriber will be notified
    await cache.get(KEY_ABC);

    unsubscribe();

    expect(callback).toHaveBeenCalled();
  });

  test("subscribing and invalidating", async () => {
    const mock = createAsyncMock();
    const cache = createAsyncCache(mock, {
      deduplicationInterval: 0,
    });
    const callback = jest.fn();

    const cacheItem = cache.create(KEY_ABC);
    const unsubscribe = cacheItem.subscribe(callback);

    // 🚀 Called
    await cacheItem.get();

    // 🗑️ Invalidated
    cache.invalidate(KEY_ABC);

    unsubscribe();

    expect(callback).toHaveBeenCalledTimes(3);

    // 1️⃣ Triggered when the first call starts
    expect(callback).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining<AsyncState<string>>({
        isLoading: true,
        data: undefined,
        error: undefined,
      })
    );
    // 2️⃣✅ Triggered when the first call finished
    expect(callback).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining<AsyncState<string>>({
        isLoading: false,
        data: KEY_ABC,
        error: undefined,
      })
    );
    // 3️⃣🗑️ Triggered when invalidated
    expect(callback).toHaveBeenNthCalledWith(
      3,
      expect.objectContaining<AsyncState<string>>({
        isLoading: false,
        data: undefined,
        error: undefined,
      })
    );
  });

  test("subscribing and invalidating while running", async () => {
    const mock = createAsyncMock();
    const cache = createAsyncCache(mock, {
      deduplicationInterval: 0,
    });
    const callback = jest.fn();

    const cacheItem = cache.create(KEY_ABC);
    const unsubscribe = cacheItem.subscribe(callback);

    // 🚀 Called
    const promise = cacheItem.get();

    // 🗑️ Invalidated before the call finished
    cacheItem.invalidate();

    await promise;

    unsubscribe();

    expect(callback).toHaveBeenCalledTimes(2);

    // 1️⃣ Triggered when the first call starts
    expect(callback).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining<AsyncState<string>>({
        isLoading: true,
        data: undefined,
        error: undefined,
      })
    );
    // 2️⃣✅🗑️ Triggered when the first call finished but was invalidated in the meantime
    expect(callback).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining<AsyncState<string>>({
        isLoading: false,
        data: undefined,
        error: undefined,
      })
    );
  });
});
