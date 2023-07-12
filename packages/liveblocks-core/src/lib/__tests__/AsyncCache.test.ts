import type { AsyncState } from "../AsyncCache";
import { createAsyncCache, isShallowEqual } from "../AsyncCache";

const REQUEST_DELAY = 20;
const KEY_ABC = "abc";
const KEY_XYZ = "xyz";
const ERROR = new Error("error");

type AsyncMockOptions<T> = {
  error: (index: number, key: string) => boolean;
  delay: (index: number, key: string) => number;
  value: (index: number, key: string) => T;
};

async function sleep(ms: number): Promise<42> {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(42);
    }, ms);
  });
}

const defaultAsyncMockOptions: AsyncMockOptions<unknown> = {
  error: () => false,
  delay: () => REQUEST_DELAY,
  value: (_, key) => key,
};

function createAsyncMock<T = string>(
  options: Partial<
    AsyncMockOptions<T>
  > = defaultAsyncMockOptions as AsyncMockOptions<T>
) {
  const error = options.error ?? defaultAsyncMockOptions.error;
  const delay = options.delay ?? defaultAsyncMockOptions.delay;
  const value = options.value ?? defaultAsyncMockOptions.value;

  let index = 0;

  return jest.fn(async (key: string) => {
    const isError = error(index, key);
    index += 1;

    await sleep(delay(index, key));

    if (isError) {
      throw ERROR;
    } else {
      return value(index, key) as T;
    }
  });
}

function createIndices(length: number) {
  return [...Array(length).keys()];
}

describe("AsyncCache", () => {
  test("getting", async () => {
    const mock = createAsyncMock();
    const cache = createAsyncCache(mock);

    // 🚀 Called
    expect(await cache.get(KEY_ABC)).toMatchObject<AsyncState<string, Error>>({
      isLoading: false,
      data: KEY_ABC,
    });

    // ✨ Cached
    expect(await cache.get(KEY_ABC)).toMatchObject<AsyncState<string, Error>>({
      isLoading: false,
      data: KEY_ABC,
    });

    // ✨ Cached
    expect(await cache.get(KEY_ABC)).toMatchObject<AsyncState<string, Error>>({
      isLoading: false,
      data: KEY_ABC,
    });

    expect(mock).toHaveBeenCalledTimes(1);
    expect(mock).toHaveBeenCalledWith(KEY_ABC);
  });

  test("getting in parallel", async () => {
    const mock = createAsyncMock({
      value: (index) => createIndices(index),
    });
    const cache = createAsyncCache(mock);

    await Promise.all([
      // 🚀 Called
      cache.get(KEY_ABC),
      // 🔜 Waiting on the first call
      cache.get(KEY_ABC),
      // 🔜 Waiting on the first call
      cache.get(KEY_ABC),
    ]);

    expect(cache.getState(KEY_ABC)).toMatchObject<AsyncState<number[], Error>>({
      isLoading: false,
      data: [0],
    });

    expect(mock).toHaveBeenCalledTimes(1);
  });

  test("getting multiple keys", async () => {
    const mock = createAsyncMock({
      error: (_, key) => key === KEY_XYZ,
    });
    const cache = createAsyncCache(mock);

    // 🚀 Called with "abc"
    const abc = await cache.get(KEY_ABC);
    // 🚀 Called with "xyz"
    const xyz = await cache.get(KEY_XYZ);

    expect(abc).toMatchObject<AsyncState<string, Error>>({
      isLoading: false,
      data: KEY_ABC,
    });
    expect(xyz).toMatchObject<AsyncState<string, Error>>({
      isLoading: false,
      error: ERROR,
    });

    expect(mock).toHaveBeenCalledTimes(2);
  });

  test("getting while revalidating", async () => {
    const mock = createAsyncMock({
      value: (index) => createIndices(index),
    });
    const cache = createAsyncCache(mock);
    const callback = jest.fn();

    const unsubscribe = cache.subscribe(KEY_ABC, callback);

    // 🗑️ Revalidated and 🚀 called
    const revalidatePromise = cache.revalidate(KEY_ABC);

    // 🔜 Skipped because revalidating
    const getPromise = cache.get(KEY_ABC);

    await revalidatePromise;
    await getPromise;

    // 🗑️ Revalidated
    await cache.revalidate(KEY_ABC);

    unsubscribe();

    expect(mock).toHaveBeenCalledTimes(2);

    expect(callback).toHaveBeenCalledTimes(4);

    // 1️⃣ Triggered when the first call starts
    expect(callback).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining<AsyncState<number[], Error>>({
        isLoading: true,
      })
    );
    // 2️⃣✅🗑️ Triggered when the first call finished
    expect(callback).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining<AsyncState<number[], Error>>({
        isLoading: false,
        data: [0],
      })
    );
    // 1️⃣ Triggered when the second revalidation call starts
    expect(callback).toHaveBeenNthCalledWith(
      3,
      expect.objectContaining<AsyncState<number[], Error>>({
        isLoading: true,
        data: [0],
      })
    );
    // 2️⃣✅🗑️ Triggered when the second revalidation call finished
    expect(callback).toHaveBeenNthCalledWith(
      4,
      expect.objectContaining<AsyncState<number[], Error>>({
        isLoading: false,
        data: [0, 1],
      })
    );
  });

  test("staying invalid when erroring", async () => {
    const mock = createAsyncMock({
      error: (index) => index === 0,
    });
    const cache = createAsyncCache(mock);

    // 🚀 Called and ❌ errored
    expect(await cache.get(KEY_ABC)).toMatchObject<AsyncState<string, Error>>({
      isLoading: false,
      error: ERROR,
    });

    // 🚀 Called again because the first call errored
    expect(await cache.get(KEY_ABC)).toMatchObject<AsyncState<string, Error>>({
      isLoading: false,
      data: KEY_ABC,
    });

    expect(mock).toHaveBeenCalledTimes(2);
  });

  test("revalidating", async () => {
    const mock = createAsyncMock({
      value: (index) => createIndices(index),
    });
    const cache = createAsyncCache(mock);

    const callback = jest.fn();
    const unsubscribe = cache.subscribe(KEY_ABC, callback);

    // 🚀 Called
    await cache.get(KEY_ABC);

    // 🗑️ Revalidated and 🚀 called again
    expect(await cache.revalidate(KEY_ABC)).toMatchObject<
      AsyncState<number[], Error>
    >({
      isLoading: false,
      data: [0, 1],
    });

    unsubscribe();

    expect(mock).toHaveBeenCalledTimes(2);

    // 1️⃣ Triggered when the first call started
    expect(callback).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining<AsyncState<number[], Error>>({
        isLoading: true,
      })
    );
    // 2️⃣ Triggered when the first call finished
    expect(callback).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining<AsyncState<number[], Error>>({
        isLoading: false,
        data: [0],
      })
    );
    // 3️⃣ Triggered when revalidated
    expect(callback).toHaveBeenNthCalledWith(
      3,
      expect.objectContaining<AsyncState<number[], Error>>({
        isLoading: true,
        data: [0],
      })
    );
    // 4️⃣ Triggered when revalidation finished
    expect(callback).toHaveBeenNthCalledWith(
      4,
      expect.objectContaining<AsyncState<number[], Error>>({
        isLoading: false,
        data: [0, 1],
      })
    );
  });

  test("revalidating a non-existing key", async () => {
    const mock = createAsyncMock({
      value: (index) => createIndices(index),
    });
    const cache = createAsyncCache(mock);

    const callback = jest.fn();
    const unsubscribe = cache.subscribe(KEY_ABC, callback);

    // 🚀 Called because revalidated
    expect(await cache.revalidate(KEY_ABC)).toMatchObject<
      AsyncState<number[], Error>
    >({
      isLoading: false,
      data: [0],
    });

    unsubscribe();

    expect(mock).toHaveBeenCalledTimes(1);

    // 1️⃣ Triggered when revalidated
    expect(callback).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining<AsyncState<number[], Error>>({
        isLoading: true,
      })
    );
    // 2️⃣ Triggered when revalidation finished
    expect(callback).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining<AsyncState<number[], Error>>({
        isLoading: false,
        data: [0],
      })
    );
  });

  test("revalidating while pending", async () => {
    const mock = createAsyncMock({
      value: (index) => createIndices(index),
    });
    const cache = createAsyncCache(mock);
    const callback = jest.fn();

    const unsubscribe = cache.subscribe(KEY_ABC, callback);

    // 🚀 Called
    const getPromise = cache.get(KEY_ABC);

    // 🗑️ Revalidated while pending
    const revalidatePromise = cache.revalidate(KEY_ABC);

    await getPromise;
    await revalidatePromise;

    unsubscribe();

    expect(mock).toHaveBeenCalledTimes(1);

    expect(callback).toHaveBeenCalledTimes(2);

    // 1️⃣ Triggered when the first call starts
    expect(callback).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining<AsyncState<number[], Error>>({
        isLoading: true,
      })
    );
    // 2️⃣✅🗑️ Triggered when the first call finished
    expect(callback).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining<AsyncState<number[], Error>>({
        isLoading: false,
        data: [0],
      })
    );
  });

  test("revalidating in parallel", async () => {
    const mock = createAsyncMock({
      value: (index) => createIndices(index),
    });
    const cache = createAsyncCache(mock);
    const callback = jest.fn();

    const unsubscribe = cache.subscribe(KEY_ABC, callback);

    // 🚀 Called
    await cache.get(KEY_ABC);

    await Promise.all([
      // 🚀 Revalidated
      cache.revalidate(KEY_ABC),
      // 🔜 Waiting on the first revalidation
      cache.revalidate(KEY_ABC),
      // 🔜 Waiting on the first revalidation
      cache.revalidate(KEY_ABC),
    ]);

    unsubscribe();

    expect(mock).toHaveBeenCalledTimes(2);

    expect(callback).toHaveBeenCalledTimes(4);

    // 1️⃣ Triggered when the first call starts
    expect(callback).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining<AsyncState<number[], Error>>({
        isLoading: true,
      })
    );
    // 2️⃣✅🗑️ Triggered when the first call finished
    expect(callback).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining<AsyncState<number[], Error>>({
        isLoading: false,
        data: [0],
      })
    );
    // 3️⃣ Triggered when the first revalidation call starts
    expect(callback).toHaveBeenNthCalledWith(
      3,
      expect.objectContaining<AsyncState<number[], Error>>({
        isLoading: true,
        data: [0],
      })
    );
    // 4️⃣✅🗑️ Triggered when the first revalidation call finished
    expect(callback).toHaveBeenNthCalledWith(
      4,
      expect.objectContaining<AsyncState<number[], Error>>({
        isLoading: false,
        data: [0, 1],
      })
    );
  });

  test("clearing the cache", async () => {
    const mock = createAsyncMock();
    const cache = createAsyncCache(mock);

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
    const cache = createAsyncCache(mock);

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
    expect(state).toMatchObject<AsyncState<string, Error>>({
      isLoading: false,
      data: KEY_XYZ,
    });
  });

  test("clearing the cache should unsubscribe active subscribers", async () => {
    const mock = createAsyncMock();
    const cache = createAsyncCache(mock);
    const callback = jest.fn();

    const unsubscribe = cache.subscribe(KEY_ABC, callback);

    // 🚀 Called
    await cache.get(KEY_ABC);

    // 🗑️ Cleared
    cache.clear();

    // 🚀 Called again because cleared
    await cache.get(KEY_ABC);

    unsubscribe();

    expect(callback).toHaveBeenCalledTimes(2);

    // 1️⃣ Triggered when the first call started
    expect(callback).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining<AsyncState<string, Error>>({
        isLoading: true,
      })
    );
    // 2️⃣✅ Triggered when the first call resolved
    expect(callback).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining<AsyncState<string, Error>>({
        isLoading: false,
        data: KEY_ABC,
      })
    );
  });

  test("checking if a key exists", async () => {
    const mock = createAsyncMock();
    const cache = createAsyncCache(mock);

    expect(cache.has(KEY_ABC)).toBe(false);

    // 🚀 Called
    await cache.get(KEY_ABC);

    expect(cache.has(KEY_ABC)).toBe(true);
  });

  test("getting a key's state", async () => {
    const mock = createAsyncMock();
    const cache = createAsyncCache(mock);

    // 🚀 Called
    await cache.get(KEY_ABC);

    expect(cache.getState(KEY_ABC)).toMatchObject<AsyncState<string, Error>>({
      isLoading: false,
      data: KEY_ABC,
    });
  });

  test("getting a non-existing key's state", () => {
    const mock = createAsyncMock();
    const cache = createAsyncCache(mock);

    expect(cache.getState(KEY_ABC)).toBeUndefined();
  });

  test("subscribing to a key", async () => {
    const mock = createAsyncMock({
      error: (index) => index === 0,
    });
    const cache = createAsyncCache(mock);
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
      })
    );
    // 2️⃣❌ Triggered when the first call resolved
    expect(callback).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining<AsyncState<string, Error>>({
        isLoading: false,
        error: ERROR,
      })
    );
    // 3️⃣ Triggered when the second call started
    expect(callback).toHaveBeenNthCalledWith(
      3,
      expect.objectContaining<AsyncState<string, Error>>({
        isLoading: true,
      })
    );
    // 4️⃣✅ Triggered when the second call resolved
    expect(callback).toHaveBeenNthCalledWith(
      4,
      expect.objectContaining<AsyncState<string, Error>>({
        isLoading: false,
        data: KEY_ABC,
      })
    );
  });

  test("subscribing a non-existing key", async () => {
    const mock = createAsyncMock();
    const cache = createAsyncCache(mock);
    const callback = jest.fn();

    // 🛎️ Subscribes to a key that doesn't exist yet
    const unsubscribe = cache.subscribe(KEY_ABC, callback);

    // 🚀 Called and 🛎️ the subscriber will be notified
    await cache.get(KEY_ABC);

    unsubscribe();

    expect(callback).toHaveBeenCalled();
  });

  test("providing a custom comparison function", async () => {
    const mock = createAsyncMock({
      error: (index) => index === 0,
      value: (index) => createIndices(index),
    });
    const cache = createAsyncCache(mock, {
      // ❓ Only data changes will trigger notifications
      isStateEqual: (a, b) => {
        return JSON.stringify(a.data) === JSON.stringify(b.data);
      },
    });
    const callback = jest.fn();

    const unsubscribe = cache.subscribe(KEY_ABC, callback);

    // 🚀 Called and ❌ errored
    await cache.get(KEY_ABC);

    // 🚀 Called and ✅ fulfilled
    await cache.get(KEY_ABC);

    // 🗑️ Revalidated and 🚀 called
    await cache.revalidate(KEY_ABC);

    unsubscribe();

    // 🚀 Called but 🔜 the subscriber won't be notified because it unsubscribed
    await cache.get(KEY_ABC);

    expect(callback).toHaveBeenCalledTimes(2);

    // 1️⃣✅ Triggered when the second call fulfilled
    expect(callback).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining<AsyncState<number[], Error>>({
        isLoading: false,
        data: [0, 1],
      })
    );
    // 2️⃣✅ Triggered when the revalidation resolved
    expect(callback).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining<AsyncState<number[], Error>>({
        isLoading: false,
        data: [0, 1, 2],
      })
    );
  });

  test("overriding the function for a key", async () => {
    const mockAbc = createAsyncMock({ value: () => KEY_ABC });
    const mockXyz = createAsyncMock({ value: () => KEY_XYZ });
    const cache = createAsyncCache(mockAbc);

    const abc = cache.create(KEY_ABC);
    const xyz = cache.create(KEY_XYZ, mockXyz);

    // 🚀 Called mockAbc
    expect(await abc.get()).toMatchObject<AsyncState<string, Error>>({
      isLoading: false,
      data: KEY_ABC,
    });

    // 🚀 Called mockXyz instead of mockAbc
    expect(await xyz.get()).toMatchObject<AsyncState<string, Error>>({
      isLoading: false,
      data: KEY_XYZ,
    });

    expect(mockAbc).toHaveBeenCalledTimes(1);
    expect(mockAbc).toHaveBeenCalledWith(KEY_ABC);
    expect(mockXyz).toHaveBeenCalledTimes(1);
    expect(mockXyz).toHaveBeenCalledWith(KEY_XYZ);
  });

  test("overriding the function for an existing key", async () => {
    const mockAbc = createAsyncMock({ value: () => KEY_ABC });
    const mockXyz = createAsyncMock({ value: () => KEY_XYZ });
    const cache = createAsyncCache(mockAbc);

    const abc = cache.create(KEY_ABC);

    // 🚀 Called mockAbc
    expect(await abc.get()).toMatchObject<AsyncState<string, Error>>({
      isLoading: false,
      data: KEY_ABC,
    });

    const abcWithXyz = cache.create(KEY_ABC, mockXyz);

    // 🚀 Revalidated with mockXyz instead of mockAbc
    expect(await abcWithXyz.revalidate()).toMatchObject<
      AsyncState<string, Error>
    >({
      isLoading: false,
      data: KEY_XYZ,
    });

    expect(mockAbc).toHaveBeenCalledTimes(1);
    expect(mockAbc).toHaveBeenCalledWith(KEY_ABC);
    expect(mockXyz).toHaveBeenCalledTimes(1);
    expect(mockXyz).toHaveBeenCalledWith(KEY_ABC);
  });

  test("overriding the function for an existing key before it's called", async () => {
    const mockAbc = createAsyncMock({ value: () => KEY_ABC });
    const mockXyz = createAsyncMock({ value: () => KEY_XYZ });
    const cache = createAsyncCache(mockAbc);

    const abc = cache.create(KEY_ABC);
    const abcWithXyz = cache.create(KEY_ABC, mockXyz);

    // 🚀 Called mockXyz instead of mockAbc
    expect(await abc.get()).toMatchObject<AsyncState<string, Error>>({
      isLoading: false,
      data: KEY_XYZ,
    });

    // 🚀 Revalidated with mockXyz instead of mockAbc
    expect(await abcWithXyz.revalidate()).toMatchObject<
      AsyncState<string, Error>
    >({
      isLoading: false,
      data: KEY_XYZ,
    });

    expect(mockAbc).not.toHaveBeenCalled();
    expect(mockXyz).toHaveBeenCalledTimes(2);
    expect(mockXyz).toHaveBeenCalledWith(KEY_ABC);
  });
});

describe("isShallowEqual", () => {
  test("loading", () => {
    const a: AsyncState<undefined, Error> = {
      isLoading: false,
    };
    const b: AsyncState<undefined, Error> = {
      isLoading: true,
    };
    const c: AsyncState<undefined, Error> = {
      isLoading: false,
    };

    expect(isShallowEqual(a, b)).toBe(false);
    expect(isShallowEqual(b, a)).toBe(false);
    expect(isShallowEqual(a, c)).toBe(true);
    expect(isShallowEqual(c, a)).toBe(true);
  });

  test("data or not", () => {
    const a: AsyncState<{ key: string }, Error> = {
      isLoading: false,
    };
    const b: AsyncState<{ key: string }, Error> = {
      isLoading: false,
      data: { key: KEY_ABC },
    };

    expect(isShallowEqual(a, b)).toBe(false);
    expect(isShallowEqual(b, a)).toBe(false);
  });

  test("data", () => {
    const a: AsyncState<Record<string, string>, Error> = {
      isLoading: false,
      data: { abc: KEY_ABC, xyz: KEY_XYZ },
      error: undefined,
    };
    const b: AsyncState<Record<string, string>, Error> = {
      isLoading: false,
      data: { xyz: KEY_XYZ, abc: KEY_ABC },
      error: undefined,
    };

    expect(isShallowEqual(a, b)).toBe(true);
    expect(isShallowEqual(b, a)).toBe(true);
  });

  test("error or not", () => {
    const a: AsyncState<string, Error> = {
      isLoading: false,
    };
    const b: AsyncState<string, Error> = {
      isLoading: false,
      error: ERROR,
    };

    expect(isShallowEqual(a, b)).toBe(false);
    expect(isShallowEqual(b, a)).toBe(false);
  });

  test("error", () => {
    const a: AsyncState<string, Error> = {
      isLoading: false,
      data: undefined,
      error: ERROR,
    };
    const b: AsyncState<string, Error> = {
      isLoading: false,
      data: undefined,
      error: ERROR,
    };

    expect(isShallowEqual(a, b)).toBe(true);
    expect(isShallowEqual(b, a)).toBe(true);
  });
});
