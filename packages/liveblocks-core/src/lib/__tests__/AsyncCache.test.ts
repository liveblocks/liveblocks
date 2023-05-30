import type { AsyncState } from "../AsyncCache";
import { createAsyncCache, isDifferentState } from "../AsyncCache";

const REQUEST_DELAY = 20;
const KEY_ABC = "abc";
const KEY_XYZ = "xyz";
const ERROR = new Error("error");

type AsyncStateDataError<TData, TError> = Pick<
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

function createAsyncMock<T = string>(
  errorPredicate: (index: number, key: string) => boolean = () => false,
  returnValue: (index: number, key: string) => T = (_, key) =>
    key as unknown as T
) {
  let index = 0;

  return jest.fn(async (key: string) => {
    const isError = errorPredicate(index, key);
    index += 1;

    await sleep(REQUEST_DELAY);

    if (isError) {
      throw ERROR;
    } else {
      return returnValue(index, key);
    }
  });
}

function createIndices(length: number) {
  return [...Array(length).keys()];
}

describe("AsyncCache", () => {
  test("getting the same key", async () => {
    const mock = createAsyncMock();
    const cache = createAsyncCache(mock, { deduplicationInterval: 0 });

    // 🚀 Called
    expect(await cache.get(KEY_ABC)).toMatchObject<
      AsyncStateDataError<string, Error>
    >({
      data: KEY_ABC,
      error: undefined,
    });

    // ✨ Cached
    expect(await cache.get(KEY_ABC)).toMatchObject<
      AsyncStateDataError<string, Error>
    >({
      data: KEY_ABC,
      error: undefined,
    });

    // ✨ Cached
    expect(await cache.get(KEY_ABC)).toMatchObject<
      AsyncStateDataError<string, Error>
    >({
      data: KEY_ABC,
      error: undefined,
    });

    expect(mock).toHaveBeenCalledTimes(1);
    expect(mock).toHaveBeenCalledWith(KEY_ABC);
  });

  test("getting the same key in parallel", async () => {
    const mock = createAsyncMock();
    const cache = createAsyncCache(mock, { deduplicationInterval: 0 });

    await Promise.all([
      // 🚀 Called
      cache.get(KEY_ABC),
      // 🔜 Waiting on the first call's promise
      cache.get(KEY_ABC),
      // 🔜 Waiting on the first call's promise
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

    expect(abc).toMatchObject<AsyncStateDataError<string, Error>>({
      data: KEY_ABC,
      error: undefined,
    });
    expect(xyz).toMatchObject<AsyncStateDataError<string, Error>>({
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
    expect(await cache.get(KEY_ABC)).toMatchObject<
      AsyncStateDataError<string, Error>
    >({
      data: undefined,
      error: ERROR,
    });

    // 🚀 Called again because the first call errored
    expect(await cache.get(KEY_ABC)).toMatchObject<
      AsyncStateDataError<string, Error>
    >({
      data: KEY_ABC,
      error: undefined,
    });

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
    expect(await cache.get(KEY_ABC)).toMatchObject<
      AsyncStateDataError<string, Error>
    >({
      data: KEY_ABC,
      error: undefined,
    });

    expect(mock).toHaveBeenCalledTimes(2);
  });

  test("invalidating without clearing the cache", async () => {
    const mock = createAsyncMock();
    const cache = createAsyncCache(mock, { deduplicationInterval: 0 });

    // 🚀 Called
    await cache.get(KEY_ABC);

    expect(cache.getState(KEY_ABC)?.data).not.toBeUndefined();

    // 🗑️ Doesn't clear the cache for "abc"
    cache.invalidate(KEY_ABC, { clearData: false });

    expect(cache.getState(KEY_ABC)?.data).not.toBeUndefined();

    // 🚀 Called because invalidated
    expect(await cache.get(KEY_ABC)).toMatchObject<
      AsyncStateDataError<string, Error>
    >({
      data: KEY_ABC,
      error: undefined,
    });

    expect(mock).toHaveBeenCalledTimes(2);
  });

  test("revalidating", async () => {
    const mock = createAsyncMock();
    const cache = createAsyncCache(mock, { deduplicationInterval: 0 });

    // 🚀 Called
    await cache.get(KEY_ABC);

    // 🗑️ Clears the cache for "abc" and 🚀 called again because invalidated
    expect(await cache.revalidate(KEY_ABC)).toMatchObject<
      AsyncStateDataError<string, Error>
    >({
      data: KEY_ABC,
      error: undefined,
    });

    expect(mock).toHaveBeenCalledTimes(2);
  });

  test("revalidating with optimistic data", async () => {
    const mock = createAsyncMock(
      () => false,
      (index) => createIndices(index)
    );
    const cache = createAsyncCache(mock, { deduplicationInterval: 0 });

    const callback = jest.fn();
    const unsubscribe = cache.subscribe(KEY_ABC, callback);

    // 🚀 Called and returned [0]
    await cache.get(KEY_ABC);

    // 🗑️ Invalidated with [0, 1] as optimistic data, then 🚀 called and returned [0, 1]
    await cache.revalidate(KEY_ABC, {
      optimisticData: (data) => {
        return data ? createIndices(data.length + 1) : undefined;
      },
    });

    unsubscribe();

    expect(callback).toHaveBeenCalledTimes(4);

    // 1️⃣ Triggered when the first call started
    expect(callback).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining<AsyncState<number[], Error>>({
        isLoading: true,
        data: undefined,
        error: undefined,
      })
    );
    // 2️⃣ Triggered when the first call finished
    expect(callback).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining<AsyncState<number[], Error>>({
        isLoading: false,
        data: [0],
        error: undefined,
      })
    );
    // 3️⃣ Triggered when revalidated with optimistic data
    expect(callback).toHaveBeenNthCalledWith(
      3,
      expect.objectContaining<AsyncState<number[], Error>>({
        isLoading: true,
        data: [0, 1],
        error: undefined,
      })
    );
    // 4️⃣ Triggered when revalidation finished
    expect(callback).toHaveBeenNthCalledWith(
      4,
      expect.objectContaining<AsyncState<number[], Error>>({
        isLoading: false,
        data: [0, 1],
        error: undefined,
      })
    );
  });

  test("revalidating with optimistic data and reverting on error", async () => {
    const mock = createAsyncMock(
      (index) => index === 1,
      (index) => createIndices(index)
    );
    const cache = createAsyncCache(mock, { deduplicationInterval: 0 });

    const callback = jest.fn();
    const unsubscribe = cache.subscribe(KEY_ABC, callback);

    // 🚀 Called and returned [0]
    await cache.get(KEY_ABC);

    // 🗑️ Invalidated with [0, 1] as optimistic data, then ❌ errored so the data was rollbacked to [0]
    await cache.revalidate(KEY_ABC, {
      optimisticData: (data) => {
        return data ? createIndices(data.length + 1) : undefined;
      },
    });

    unsubscribe();

    expect(callback).toHaveBeenCalledTimes(4);

    // 1️⃣ Triggered when the first call started
    expect(callback).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining<AsyncState<number[], Error>>({
        isLoading: true,
        data: undefined,
        error: undefined,
      })
    );
    // 2️⃣ Triggered when the first call finished
    expect(callback).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining<AsyncState<number[], Error>>({
        isLoading: false,
        data: [0],
        error: undefined,
      })
    );
    // 3️⃣ Triggered when revalidated with optimistic data
    expect(callback).toHaveBeenNthCalledWith(
      3,
      expect.objectContaining<AsyncState<number[], Error>>({
        isLoading: true,
        data: [0, 1],
        error: undefined,
      })
    );
    // 4️⃣❌ Triggered when revalidation errored and 🔙 rollbacked the optimistic data
    expect(callback).toHaveBeenNthCalledWith(
      4,
      expect.objectContaining<AsyncState<number[], Error>>({
        isLoading: false,
        data: [0],
        error: expect.any(Error),
      })
    );
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

  test("clearing the cache while pending", async () => {
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
    expect(state).toMatchObject<AsyncStateDataError<string, Error>>({
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

    expect(cache.getState(KEY_ABC)).toMatchObject<
      AsyncStateDataError<string, Error>
    >({
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

    const unsubscribe = cache.subscribe(KEY_ABC, callback);

    // 🚀 Called and ❌ errored
    await cache.get(KEY_ABC);

    // 🚀 Called and ✅ fulfilled
    await cache.get(KEY_ABC);

    unsubscribe();

    // 🚀 Called but 🔜 the subscriber won't be notified because it unsubscribed
    await cache.get(KEY_ABC);

    expect(callback).toHaveBeenCalledTimes(4);

    // 1️⃣ Triggered when the first call started
    expect(callback).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining<AsyncState<string, Error>>({
        isLoading: true,
        data: undefined,
        error: undefined,
      })
    );
    // 2️⃣❌ Triggered when the first call resolved
    expect(callback).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining<AsyncState<string, Error>>({
        isLoading: false,
        data: undefined,
        error: ERROR,
      })
    );
    // 3️⃣ Triggered when the second call started
    expect(callback).toHaveBeenNthCalledWith(
      3,
      expect.objectContaining<AsyncState<string, Error>>({
        isLoading: true,
        data: undefined,
        error: undefined,
      })
    );
    // 4️⃣✅ Triggered when the second call resolved
    expect(callback).toHaveBeenNthCalledWith(
      4,
      expect.objectContaining<AsyncState<string, Error>>({
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

    const unsubscribe = cache.subscribe(KEY_ABC, callback);

    // 🚀 Called
    await cache.get(KEY_ABC);

    // 🗑️ Invalidated
    cache.invalidate(KEY_ABC);

    unsubscribe();

    expect(callback).toHaveBeenCalledTimes(3);

    // 1️⃣ Triggered when the first call started
    expect(callback).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining<AsyncState<string, Error>>({
        isLoading: true,
        data: undefined,
        error: undefined,
      })
    );
    // 2️⃣✅ Triggered when the first call finished
    expect(callback).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining<AsyncState<string, Error>>({
        isLoading: false,
        data: KEY_ABC,
        error: undefined,
      })
    );
    // 3️⃣🗑️ Triggered when invalidated
    expect(callback).toHaveBeenNthCalledWith(
      3,
      expect.objectContaining<AsyncState<string, Error>>({
        isLoading: false,
        data: undefined,
        error: undefined,
      })
    );
  });

  test("subscribing and invalidating while pending", async () => {
    const mock = createAsyncMock();
    const cache = createAsyncCache(mock, {
      deduplicationInterval: 0,
    });
    const callback = jest.fn();

    const unsubscribe = cache.subscribe(KEY_ABC, callback);

    // 🚀 Called
    const promise = cache.get(KEY_ABC);

    // 🗑️ Invalidated before the call finished
    cache.invalidate(KEY_ABC);

    await promise;

    unsubscribe();

    expect(callback).toHaveBeenCalledTimes(2);

    // 1️⃣ Triggered when the first call starts
    expect(callback).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining<AsyncState<string, Error>>({
        isLoading: true,
        data: undefined,
        error: undefined,
      })
    );
    // 2️⃣✅🗑️ Triggered when the first call finished but was invalidated in the meantime
    expect(callback).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining<AsyncState<string, Error>>({
        isLoading: false,
        data: undefined,
        error: undefined,
      })
    );
  });

  test("only notifying subscribers when there's a change", async () => {
    const mock = createAsyncMock();
    const cache = createAsyncCache(mock, {
      deduplicationInterval: 0,
    });
    const callback = jest.fn();

    const unsubscribe = cache.subscribe(KEY_ABC, callback);

    // 🚀 Called
    await cache.get(KEY_ABC);

    // 🗑️ Invalidated but without clearing the cache for "abc"
    cache.invalidate(KEY_ABC, { clearData: false });
    // 🗑️ Invalidated
    cache.invalidate(KEY_ABC);
    // 🗑️ Invalidated
    cache.invalidate(KEY_ABC);

    unsubscribe();

    expect(callback).toHaveBeenCalledTimes(3);

    // 1️⃣ Triggered when the first call starts
    expect(callback).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining<AsyncState<string, Error>>({
        isLoading: true,
        data: undefined,
        error: undefined,
      })
    );
    // 2️⃣✅ Triggered when the first call finished
    expect(callback).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining<AsyncState<string, Error>>({
        isLoading: false,
        data: KEY_ABC,
        error: undefined,
      })
    );
    // 3️⃣🗑️ Triggered when invalidated and cleared
    expect(callback).toHaveBeenNthCalledWith(
      3,
      expect.objectContaining<AsyncState<string, Error>>({
        isLoading: false,
        data: undefined,
        error: undefined,
      })
    );
  });
});

describe("AsyncCache use cases", () => {
  test("token with expiration", async () => {
    const TOKEN_EXPIRATION = REQUEST_DELAY * 2;

    type Token = {
      token: string;
      expiresAt: number;
    };

    let index = 0;
    const mock = jest.fn(async (key: string): Promise<Token> => {
      await sleep(REQUEST_DELAY);

      const isError = index === 1;
      const expiresAt = Date.now() + TOKEN_EXPIRATION;
      index += 1;

      if (isError) {
        throw new Error("Couldn't generate a token");
      } else {
        return {
          token: JSON.stringify({ key, expiresAt }),
          expiresAt,
        };
      }
    });
    const cache = createAsyncCache(mock, {
      deduplicationInterval: 0,
    });

    const callback = jest.fn();
    const unsubscribe = cache.subscribe(KEY_ABC, callback);

    async function getToken(): Promise<string> {
      const state = cache.getState(KEY_ABC);

      if (state?.data && state.data.expiresAt > Date.now()) {
        return state.data.token;
      }

      if (state?.data && !state.isLoading) {
        cache.invalidate(KEY_ABC);
      }

      const { data } = await cache.get(KEY_ABC);

      if (data) {
        return data.token;
      } else {
        return await getToken();
      }
    }

    // 🚀 Generating a first token
    expect(Number(JSON.parse(await getToken()).expiresAt)).toBeGreaterThan(
      Date.now()
    );

    // ✨ Cached because the first token is still valid
    expect(Number(JSON.parse(await getToken()).expiresAt)).toBeGreaterThan(
      Date.now()
    );

    await sleep(TOKEN_EXPIRATION * 1.5);

    const tokens = await Promise.all([
      // 🚀 Generating a new token because the cached one expired
      // ❌ Errors, retries, and ✅ succeeds the second time
      getToken(),
      // 🔜 Waiting on the first call's promises
      getToken(),
      // 🔜 Waiting on the first call's promises
      getToken(),
    ]);

    for (const token of tokens) {
      expect(Number(JSON.parse(token).expiresAt)).toBeGreaterThan(Date.now());
    }

    unsubscribe();

    expect(mock).toHaveBeenCalledTimes(3);

    expect(callback).toHaveBeenCalledTimes(7);

    // 1️⃣ Triggered when generating the first token started
    expect(callback).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining<AsyncState<string, Error>>({
        isLoading: true,
        data: undefined,
        error: undefined,
      })
    );
    // 2️⃣✅ Triggered when generating the first token finished
    expect(callback).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining<AsyncState<string, Error>>({
        isLoading: false,
        data: expect.any(Object),
        error: undefined,
      })
    );
    // 3️⃣🗑️ Triggered when invalidated because expired
    expect(callback).toHaveBeenNthCalledWith(
      3,
      expect.objectContaining<AsyncState<string, Error>>({
        isLoading: false,
        data: undefined,
        error: undefined,
      })
    );
    // 4️⃣ Triggered when generating the second token
    expect(callback).toHaveBeenNthCalledWith(
      4,
      expect.objectContaining<AsyncState<string, Error>>({
        isLoading: true,
        data: undefined,
        error: undefined,
      })
    );
    // 5️⃣❌ Triggered when generating the second token errored
    expect(callback).toHaveBeenNthCalledWith(
      5,
      expect.objectContaining<AsyncState<string, Error>>({
        isLoading: false,
        data: undefined,
        error: expect.any(Error),
      })
    );
    // 6️⃣ Triggered when generating the third token started
    expect(callback).toHaveBeenNthCalledWith(
      6,
      expect.objectContaining<AsyncState<string, Error>>({
        isLoading: true,
        data: undefined,
        error: undefined,
      })
    );
    // 7️⃣✅ Triggered when generating the third token finished
    expect(callback).toHaveBeenNthCalledWith(
      7,
      expect.objectContaining<AsyncState<string, Error>>({
        isLoading: false,
        data: expect.any(Object),
        error: undefined,
      })
    );
  });
});

describe("isDifferentState", () => {
  test("loading", () => {
    const a: AsyncState<undefined, Error> = {
      isLoading: false,
      data: undefined,
      error: undefined,
    };
    const b: AsyncState<undefined, Error> = {
      isLoading: true,
      data: undefined,
      error: undefined,
    };
    const c: AsyncState<undefined, Error> = {
      isLoading: false,
      data: undefined,
      error: undefined,
    };

    expect(isDifferentState(a, b)).toBe(true);
    expect(isDifferentState(b, a)).toBe(true);
    expect(isDifferentState(a, c)).toBe(false);
    expect(isDifferentState(c, a)).toBe(false);
  });

  test("data", () => {
    const a: AsyncState<{ key: string }, Error> = {
      isLoading: false,
      data: undefined,
      error: undefined,
    };
    const b: AsyncState<{ key: string }, Error> = {
      isLoading: false,
      data: { key: KEY_ABC },
      error: undefined,
    };

    expect(isDifferentState(a, b)).toBe(true);
    expect(isDifferentState(b, a)).toBe(true);
  });

  test("error", () => {
    const a: AsyncState<string, Error> = {
      isLoading: false,
      data: undefined,
      error: undefined,
    };
    const b: AsyncState<string, Error> = {
      isLoading: false,
      data: undefined,
      error: ERROR,
    };

    expect(isDifferentState(a, b)).toBe(true);
    expect(isDifferentState(b, a)).toBe(true);
  });
});
