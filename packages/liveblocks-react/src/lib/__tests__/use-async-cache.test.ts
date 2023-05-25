import type { AsyncState } from "@liveblocks/core";
import { createAsyncCache } from "@liveblocks/core";
import { act, renderHook, waitFor } from "@testing-library/react";

import { useAsyncCache } from "../use-async-cache";

const REQUEST_DELAY = 20;
const KEY_ABC = "abc";
const KEY_XYZ = "xyz";
const ERROR = new Error("error");

type RenderHookProps = {
  key: string | null;
};

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

describe("useAsyncCache", () => {
  test("getting a key", async () => {
    const mock = createAsyncMock();
    const cache = createAsyncCache(mock, { deduplicationInterval: 0 });

    // 🚀 Called
    const { result } = renderHook(() => useAsyncCache(cache, KEY_ABC));

    // 🔜 Returns a loading state
    expect(result.current).toMatchObject<AsyncState<string>>({
      isLoading: true,
      data: undefined,
      error: undefined,
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // ✅ Returns a success state
    expect(result.current).toMatchObject<AsyncState<string>>({
      isLoading: false,
      data: KEY_ABC,
      error: undefined,
    });
  });

  test("getting the same key in parallel", async () => {
    const mock = createAsyncMock();
    const cache = createAsyncCache(mock, { deduplicationInterval: 0 });

    // 🚀 Called
    const first = renderHook(() => useAsyncCache(cache, KEY_ABC));
    // ✨ Cached
    const second = renderHook(() => useAsyncCache(cache, KEY_ABC));

    // 🔜 Both hooks return a loading state
    expect(first.result.current).toMatchObject<AsyncState<string>>({
      isLoading: true,
      data: undefined,
      error: undefined,
    });
    expect(second.result.current).toMatchObject<AsyncState<string>>({
      isLoading: true,
      data: undefined,
      error: undefined,
    });

    await waitFor(() => {
      // ❓ Both hooks will rerender with their success state at the same time
      expect(first.result.current.isLoading).toBe(false);
    });

    // ✅ Both hooks return a success state
    expect(first.result.current).toMatchObject<AsyncState<string>>({
      isLoading: false,
      data: KEY_ABC,
      error: undefined,
    });
    expect(second.result.current).toMatchObject<AsyncState<string>>({
      isLoading: false,
      data: KEY_ABC,
      error: undefined,
    });

    expect(mock).toHaveBeenCalledTimes(1);
  });

  test("getting an empty key", async () => {
    const mock = createAsyncMock();
    const cache = createAsyncCache(mock, { deduplicationInterval: 0 });

    // 💨 Not called
    const { result } = renderHook(() => useAsyncCache(cache, null));

    await sleep(REQUEST_DELAY * 1.5);

    expect(result.current).toMatchObject<AsyncState<string>>({
      isLoading: false,
      data: undefined,
      error: undefined,
    });

    expect(mock).not.toHaveBeenCalled();
  });

  test("switching keys", async () => {
    const mock = createAsyncMock();
    const cache = createAsyncCache(mock, { deduplicationInterval: 0 });

    // 🚀 Called with "abc"
    const { result, rerender } = renderHook<
      ReturnType<typeof useAsyncCache>,
      RenderHookProps
    >(({ key }) => useAsyncCache(cache, key), {
      initialProps: { key: KEY_ABC },
    });

    // 🔜 Returns a loading state
    expect(result.current).toMatchObject<AsyncState<string>>({
      isLoading: true,
      data: undefined,
      error: undefined,
    });

    // 🚀 Called with "xyz"
    rerender({ key: KEY_XYZ });

    // 🔜 Returns a loading state
    expect(result.current).toMatchObject<AsyncState<string>>({
      isLoading: true,
      data: undefined,
      error: undefined,
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // ✅ Returns a success state for "xyz"
    expect(result.current).toMatchObject<AsyncState<string>>({
      isLoading: false,
      data: KEY_XYZ,
      error: undefined,
    });

    expect(mock).toHaveBeenCalledTimes(2);
  });

  test("switching from a key to an empty one", async () => {
    const mock = createAsyncMock();
    const cache = createAsyncCache(mock, { deduplicationInterval: 0 });

    // 🚀 Called with "abc"
    const { result, rerender } = renderHook<
      ReturnType<typeof useAsyncCache>,
      RenderHookProps
    >(({ key }) => useAsyncCache(cache, key), {
      initialProps: { key: KEY_ABC },
    });

    // 🔜 Returns a loading state
    expect(result.current).toMatchObject<AsyncState<string>>({
      isLoading: true,
      data: undefined,
      error: undefined,
    });

    // 💨 Not called
    rerender({ key: null });

    // 🕳️ Returns an empty non-loading state
    expect(result.current).toMatchObject<AsyncState<string>>({
      isLoading: false,
      data: undefined,
      error: undefined,
    });

    await sleep(REQUEST_DELAY * 1.5);

    expect(mock).toHaveBeenCalledTimes(1);
  });

  test("rerendering shouldn't affect a key's state", async () => {
    const mock = createAsyncMock();
    const cache = createAsyncCache(mock, { deduplicationInterval: 0 });

    // 🚀 Called
    const { result, rerender } = renderHook(() =>
      useAsyncCache(cache, KEY_ABC)
    );

    // 🔜 Returns a loading state
    expect(result.current).toMatchObject<AsyncState<string>>({
      isLoading: true,
      data: undefined,
      error: undefined,
    });

    rerender();
    rerender();
    rerender();

    // 🔜 Still returns a loading state
    expect(result.current).toMatchObject<AsyncState<string>>({
      isLoading: true,
      data: undefined,
      error: undefined,
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // ✅ Returns a success state
    expect(result.current).toMatchObject<AsyncState<string>>({
      isLoading: false,
      data: KEY_ABC,
      error: undefined,
    });

    rerender();
    rerender();
    rerender();

    // ✅ Still returns a success state
    expect(result.current).toMatchObject<AsyncState<string>>({
      isLoading: false,
      data: KEY_ABC,
      error: undefined,
    });
  });

  test("getting an existing key", async () => {
    const mock = createAsyncMock();
    const cache = createAsyncCache(mock, { deduplicationInterval: 0 });

    // 🚀 Called
    const first = renderHook(() => useAsyncCache(cache, KEY_ABC));

    await waitFor(() => {
      expect(first.result.current.isLoading).toBe(false);
    });

    // ✅ The first hook returns a success state
    expect(first.result.current).toMatchObject<AsyncState<string>>({
      isLoading: false,
      data: KEY_ABC,
      error: undefined,
    });

    const second = renderHook(() => useAsyncCache(cache, KEY_ABC));

    // ✨ Cached and the second hook immediately returns a success state without loading in between
    expect(second.result.current).toMatchObject<AsyncState<string>>({
      isLoading: false,
      data: KEY_ABC,
      error: undefined,
    });
  });

  test("sharing keys between vanilla and React", async () => {
    const mock = createAsyncMock();
    const cache = createAsyncCache(mock, { deduplicationInterval: 0 });

    const { result } = renderHook(() => useAsyncCache(cache, KEY_ABC));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current).toMatchObject<AsyncState<string>>({
      isLoading: false,
      data: KEY_ABC,
      error: undefined,
    });

    act(() => cache.invalidate(KEY_ABC));

    expect(result.current).toMatchObject<AsyncState<string>>({
      isLoading: false,
      data: undefined,
      error: undefined,
    });
  });

  test("staying invalid when erroring", async () => {
    const mock = createAsyncMock((index) => index === 0);
    const cache = createAsyncCache(mock, { deduplicationInterval: 0 });

    // 🚀 Called and ❌ errored
    const first = renderHook(() => useAsyncCache(cache, KEY_ABC));

    await waitFor(() => {
      expect(first.result.current.isLoading).toBe(false);
    });

    // ❌ The first hook returns an error state
    expect(first.result.current).toMatchObject<AsyncState<string>>({
      isLoading: false,
      data: undefined,
      error: expect.any(Error),
    });

    // 🚀 Called again because the call triggered by the first hook errored
    const second = renderHook(() => useAsyncCache(cache, KEY_ABC));

    // 🔜 Both hooks return a loading state
    expect(first.result.current).toMatchObject<AsyncState<string>>({
      isLoading: true,
      data: undefined,
      error: undefined,
    });
    expect(second.result.current).toMatchObject<AsyncState<string>>({
      isLoading: true,
      data: undefined,
      error: undefined,
    });

    await waitFor(() => {
      expect(second.result.current.isLoading).toBe(false);
    });

    // ✅ Both hooks return a success state
    expect(first.result.current).toMatchObject<AsyncState<string>>({
      isLoading: false,
      data: KEY_ABC,
      error: undefined,
    });
    expect(second.result.current).toMatchObject<AsyncState<string>>({
      isLoading: false,
      data: KEY_ABC,
      error: undefined,
    });
  });
});
