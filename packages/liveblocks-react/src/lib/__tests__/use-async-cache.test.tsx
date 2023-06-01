import "@testing-library/jest-dom";

import type { AsyncState } from "@liveblocks/core";
import { createAsyncCache } from "@liveblocks/core";
import type { RenderHookResult } from "@testing-library/react";
import { act, render, renderHook, waitFor } from "@testing-library/react";
import React, { Suspense } from "react";
import { hydrateRoot } from "react-dom/client";
import { renderToString } from "react-dom/server";

import type {
  UseAsyncCacheOptions,
  UseAsyncCacheResponse,
} from "../use-async-cache";
import { useAsyncCache } from "../use-async-cache";

const REQUEST_DELAY = 20;
const KEY_ABC = "abc";
const KEY_XYZ = "xyz";
const ERROR = new Error("error");
const CONTAINER_ID = "container";
const SUSPENSE_FALLBACK = "…";

type AsyncMockOptions<T> = {
  error: (index: number, key: string) => boolean;
  delay: (index: number, key: string) => number;
  value: (index: number, key: string) => T;
};

type RenderHookProps = {
  key: string | null;
  options?: UseAsyncCacheOptions;
};

type RenderHookOptions<Props> = {
  initialProps?: Props;
};

type RenderHookWithCountResult<TResult, TProps> = RenderHookResult<
  TResult,
  TProps
> & {
  renderCount: () => number;
};

type RenderHookServerCompomentProps<TResult> = { render: () => TResult };

type RenderHookServerResult<TResult> = {
  result: { current: TResult };
  hydrate: () => void;
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

function renderHookWithCount<TResult, TProps>(
  render: (initialProps: TProps) => TResult,
  options?: RenderHookOptions<TProps>
): RenderHookWithCountResult<TResult, TProps> {
  let count = 0;

  const result = renderHook<TResult, TProps>((props) => {
    count++;

    return render(props);
  }, options);

  return { renderCount: () => count, ...result };
}

function renderHookServer<TResult>(
  render: () => TResult
): RenderHookServerResult<TResult> {
  const results: Array<TResult> = [];
  const result = {
    get current() {
      return results.slice(-1)[0];
    },
  };

  const setValue = (value: TResult) => {
    results.push(value);
  };

  const Component = ({ render }: RenderHookServerCompomentProps<TResult>) => {
    setValue(render());

    return null;
  };

  const component = <Component render={render} />;

  const serverOutput = renderToString(component);

  const hydrate = () => {
    const root = document.createElement("div");
    root.innerHTML = serverOutput;

    act(() => {
      hydrateRoot(root, component);
    });
  };

  return {
    result,
    hydrate,
  };
}

describe("useAsyncCache", () => {
  test("getting a key", async () => {
    const mock = createAsyncMock();
    const cache = createAsyncCache(mock);

    // 🚀 Called
    const { result } = renderHook(() => useAsyncCache(cache, KEY_ABC));

    // 🔜 Returns a loading state
    expect(result.current).toMatchObject<AsyncState<string, Error>>({
      isLoading: true,
      data: undefined,
      error: undefined,
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // ✅ Returns a success state
    expect(result.current).toMatchObject<AsyncState<string, Error>>({
      isLoading: false,
      data: KEY_ABC,
      error: undefined,
    });
  });

  test("getting the same key in parallel", async () => {
    const mock = createAsyncMock();
    const cache = createAsyncCache(mock);

    // 🚀 Called
    const first = renderHook(() => useAsyncCache(cache, KEY_ABC));
    // ✨ Cached
    const second = renderHook(() => useAsyncCache(cache, KEY_ABC));

    // 🔜 Both hooks return a loading state
    expect(first.result.current).toMatchObject<AsyncState<string, Error>>({
      isLoading: true,
      data: undefined,
      error: undefined,
    });
    expect(second.result.current).toMatchObject<AsyncState<string, Error>>({
      isLoading: true,
      data: undefined,
      error: undefined,
    });

    await waitFor(() => {
      // ❓ Both hooks will rerender with their success state at the same time
      expect(first.result.current.isLoading).toBe(false);
    });

    // ✅ Both hooks return a success state
    expect(first.result.current).toMatchObject<AsyncState<string, Error>>({
      isLoading: false,
      data: KEY_ABC,
      error: undefined,
    });
    expect(second.result.current).toMatchObject<AsyncState<string, Error>>({
      isLoading: false,
      data: KEY_ABC,
      error: undefined,
    });

    expect(mock).toHaveBeenCalledTimes(1);
  });

  test("getting an empty key", async () => {
    const mock = createAsyncMock();
    const cache = createAsyncCache(mock);

    // 💨 Not called
    const { result } = renderHook(() => useAsyncCache(cache, null));

    await sleep(REQUEST_DELAY * 1.5);

    expect(result.current).toMatchObject<AsyncState<string, Error>>({
      isLoading: false,
      data: undefined,
      error: undefined,
    });

    expect(mock).not.toHaveBeenCalled();
  });

  test("getting an existing key", async () => {
    const mock = createAsyncMock();
    const cache = createAsyncCache(mock);

    // 🚀 Called
    const first = renderHook(() => useAsyncCache(cache, KEY_ABC));

    await waitFor(() => {
      expect(first.result.current.isLoading).toBe(false);
    });

    // ✅ The first hook returns a success state
    expect(first.result.current).toMatchObject<AsyncState<string, Error>>({
      isLoading: false,
      data: KEY_ABC,
      error: undefined,
    });

    const second = renderHook(() => useAsyncCache(cache, KEY_ABC));

    // ✨ Cached and the second hook immediately returns a success state without loading in between
    expect(second.result.current).toMatchObject<AsyncState<string, Error>>({
      isLoading: false,
      data: KEY_ABC,
      error: undefined,
    });
  });

  test("staying invalid when erroring", async () => {
    const mock = createAsyncMock({ error: (index) => index === 0 });
    const cache = createAsyncCache(mock);

    // 🚀 Called and ❌ errored
    const first = renderHook(() => useAsyncCache(cache, KEY_ABC));

    await waitFor(() => {
      expect(first.result.current.isLoading).toBe(false);
    });

    // ❌ The first hook returns an error state
    expect(first.result.current).toMatchObject<AsyncState<string, Error>>({
      isLoading: false,
      data: undefined,
      error: expect.any(Error),
    });

    // 🚀 Called again because the call triggered by the first hook errored
    const second = renderHook(() => useAsyncCache(cache, KEY_ABC));

    // 🔜 Both hooks return a loading state
    expect(first.result.current).toMatchObject<AsyncState<string, Error>>({
      isLoading: true,
      data: undefined,
      error: undefined,
    });
    expect(second.result.current).toMatchObject<AsyncState<string, Error>>({
      isLoading: true,
      data: undefined,
      error: undefined,
    });

    await waitFor(() => {
      expect(second.result.current.isLoading).toBe(false);
    });

    // ✅ Both hooks return a success state
    expect(first.result.current).toMatchObject<AsyncState<string, Error>>({
      isLoading: false,
      data: KEY_ABC,
      error: undefined,
    });
    expect(second.result.current).toMatchObject<AsyncState<string, Error>>({
      isLoading: false,
      data: KEY_ABC,
      error: undefined,
    });
  });

  test("revalidating", async () => {
    const mock = createAsyncMock();
    const cache = createAsyncCache(mock);

    // 🚀 Called
    const { result } = renderHook(() => useAsyncCache(cache, KEY_ABC));

    // 🔜 Returns a loading state
    expect(result.current).toMatchObject<AsyncState<string, Error>>({
      isLoading: true,
      data: undefined,
      error: undefined,
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // ✅ Returns a success state
    expect(result.current).toMatchObject<AsyncState<string, Error>>({
      isLoading: false,
      data: KEY_ABC,
      error: undefined,
    });

    act(() => {
      result.current.revalidate();
    });

    // 🔜 Returns a loading state because revalidated
    expect(result.current).toMatchObject<AsyncState<string, Error>>({
      isLoading: true,
      data: KEY_ABC,
      error: undefined,
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // ✅ Returns a success state
    expect(result.current).toMatchObject<AsyncState<string, Error>>({
      isLoading: false,
      data: KEY_ABC,
      error: undefined,
    });

    expect(mock).toHaveBeenCalledTimes(2);
  });

  test("suspending during loading", async () => {
    const mock = createAsyncMock();
    const cache = createAsyncCache(mock);

    function Component() {
      const { data } = useAsyncCache(cache, KEY_ABC, { suspense: true });

      return <>{data ?? null}</>;
    }

    // 🚀 Called
    const { getByTestId } = render(
      <div data-testid={CONTAINER_ID}>
        <Suspense fallback={SUSPENSE_FALLBACK}>
          <Component />
        </Suspense>
      </div>
    );

    // 🔜 Suspends isntead of returning a loading state
    expect(getByTestId(CONTAINER_ID).innerHTML).toEqual(SUSPENSE_FALLBACK);

    await waitFor(() =>
      expect(getByTestId(CONTAINER_ID).innerHTML).toEqual(KEY_ABC)
    );

    // ✅ Returns a success state
    expect(getByTestId(CONTAINER_ID).innerHTML).toEqual(KEY_ABC);
  });

  test("switching keys", async () => {
    const mock = createAsyncMock();
    const cache = createAsyncCache(mock);

    // 🚀 Called with "abc"
    const { result, rerender } = renderHook<
      UseAsyncCacheResponse<string, unknown>,
      RenderHookProps
    >(({ key }) => useAsyncCache(cache, key), {
      initialProps: { key: KEY_ABC },
    });

    // 🔜 Returns a loading state
    expect(result.current).toMatchObject<AsyncState<string, Error>>({
      isLoading: true,
      data: undefined,
      error: undefined,
    });

    // 🚀 Called with "xyz"
    rerender({ key: KEY_XYZ });

    // 🔜 Returns a loading state
    expect(result.current).toMatchObject<AsyncState<string, Error>>({
      isLoading: true,
      data: undefined,
      error: undefined,
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // ✅ Returns a success state for "xyz"
    expect(result.current).toMatchObject<AsyncState<string, Error>>({
      isLoading: false,
      data: KEY_XYZ,
      error: undefined,
    });

    expect(mock).toHaveBeenCalledTimes(2);
  });

  test("switching from a key to an empty one", async () => {
    const mock = createAsyncMock();
    const cache = createAsyncCache(mock);

    // 🚀 Called with "abc"
    const { result, rerender } = renderHook<
      UseAsyncCacheResponse<string, unknown>,
      RenderHookProps
    >(({ key }) => useAsyncCache(cache, key), {
      initialProps: { key: KEY_ABC },
    });

    // 🔜 Returns a loading state
    expect(result.current).toMatchObject<AsyncState<string, Error>>({
      isLoading: true,
      data: undefined,
      error: undefined,
    });

    // 💨 Not called
    rerender({ key: null });

    // 🕳️ Returns an empty non-loading state
    expect(result.current).toMatchObject<AsyncState<string, Error>>({
      isLoading: false,
      data: undefined,
      error: undefined,
    });

    await sleep(REQUEST_DELAY * 1.5);

    expect(mock).toHaveBeenCalledTimes(1);
  });

  test("switching keys but keeping previous data while loading", async () => {
    const mock = createAsyncMock();
    const cache = createAsyncCache(mock);

    // 🚀 Called with "abc"
    const { result, rerender } = renderHook<
      UseAsyncCacheResponse<string, unknown>,
      RenderHookProps
    >(
      ({ key }) =>
        useAsyncCache(cache, key, { keepPreviousDataWhileLoading: true }),
      {
        initialProps: {
          key: KEY_ABC,
        },
      }
    );

    // 🔜 Returns a loading state
    expect(result.current).toMatchObject<AsyncState<string, Error>>({
      isLoading: true,
      data: undefined,
      error: undefined,
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // ✅ Returns a success state
    expect(result.current).toMatchObject<AsyncState<string, Error>>({
      isLoading: false,
      data: KEY_ABC,
      error: undefined,
    });

    // 🚀 Called with "xyz"
    rerender({ key: KEY_XYZ });

    // 🔜 Returns a loading state with the previous data from "abc"
    expect(result.current).toMatchObject<AsyncState<string, Error>>({
      isLoading: true,
      data: KEY_ABC,
      error: undefined,
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // ✅ Returns a success state for "xyz"
    expect(result.current).toMatchObject<AsyncState<string, Error>>({
      isLoading: false,
      data: KEY_XYZ,
      error: undefined,
    });

    expect(mock).toHaveBeenCalledTimes(2);
  });

  test("rerendering shouldn't affect a key's state", async () => {
    const mock = createAsyncMock();
    const cache = createAsyncCache(mock);

    // 🚀 Called
    const { result, rerender } = renderHook(() =>
      useAsyncCache(cache, KEY_ABC)
    );

    // 🔜 Returns a loading state
    expect(result.current).toMatchObject<AsyncState<string, Error>>({
      isLoading: true,
      data: undefined,
      error: undefined,
    });

    rerender();
    rerender();
    rerender();

    // 🔜 Still returns a loading state
    expect(result.current).toMatchObject<AsyncState<string, Error>>({
      isLoading: true,
      data: undefined,
      error: undefined,
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // ✅ Returns a success state
    expect(result.current).toMatchObject<AsyncState<string, Error>>({
      isLoading: false,
      data: KEY_ABC,
      error: undefined,
    });

    rerender();
    rerender();
    rerender();

    // ✅ Still returns a success state
    expect(result.current).toMatchObject<AsyncState<string, Error>>({
      isLoading: false,
      data: KEY_ABC,
      error: undefined,
    });
  });

  test("rerendering only when necessary", async () => {
    const mock = createAsyncMock({
      error: (index) => index === 0,
    });
    const cache = createAsyncCache(mock);

    // 🚀 Called with "abc" and ❌ errored
    const first = renderHookWithCount(() => useAsyncCache(cache, KEY_ABC));

    await waitFor(() => {
      expect(first.result.current.isLoading).toBe(false);
    });

    // 🚀 Called with "abc" again because the call triggered by the first hook errored
    const second = renderHookWithCount(() => useAsyncCache(cache, KEY_ABC));

    // 🚀 Called with "xyz"
    const third = renderHookWithCount(() => useAsyncCache(cache, KEY_XYZ));

    await waitFor(() => {
      expect(second.result.current.isLoading).toBe(false);
      expect(third.result.current.isLoading).toBe(false);
    });

    expect(first.renderCount()).toEqual(4);
    expect(second.renderCount()).toEqual(2);
    expect(third.renderCount()).toEqual(2);
  });

  test("rendering server-side and hydrating should match", () => {
    const mock = createAsyncMock();
    const cache = createAsyncCache(mock);

    // 🌍 Both hooks are rendered server-side
    const empty = renderHookServer(() => useAsyncCache(cache, null));
    const abc = renderHookServer(() => useAsyncCache(cache, KEY_ABC));

    const emptyServer = empty.result.current;
    const abcServer = abc.result.current;

    // 🖥️ Both hooks are hydrated on the client
    empty.hydrate();
    abc.hydrate();

    const emptyClient = empty.result.current;
    const abcClient = abc.result.current;

    expect(emptyServer.isLoading).toEqual(emptyClient.isLoading);
    expect(emptyServer.data).toEqual(emptyClient.data);
    expect(emptyServer.error).toEqual(emptyClient.error);

    expect(abcServer.isLoading).toEqual(abcClient.isLoading);
    expect(abcServer.data).toEqual(abcClient.data);
    expect(abcServer.error).toEqual(abcClient.error);
  });

  test("sharing keys between vanilla and React", async () => {
    const mock = createAsyncMock({
      value: (index) => createIndices(index),
    });
    const cache = createAsyncCache(mock);

    // 🚀 Called
    const { result } = renderHook(() => useAsyncCache(cache, KEY_ABC));

    // 🔜 Returns a loading state
    expect(result.current).toMatchObject<AsyncState<number[], Error>>({
      isLoading: true,
      data: undefined,
      error: undefined,
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // ✅ Returns a success state
    expect(result.current).toMatchObject<AsyncState<number[], Error>>({
      isLoading: false,
      data: [0],
      error: undefined,
    });

    // 🗑️ Revalidated from the vanilla cache
    act(() => void cache.revalidate(KEY_ABC));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(true);
    });

    // 🔜 Returns a loading state because revalidated
    expect(result.current).toMatchObject<AsyncState<number[], Error>>({
      isLoading: true,
      data: [0],
      error: undefined,
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // ✅ Returns a success state
    expect(result.current).toMatchObject<AsyncState<number[], Error>>({
      isLoading: false,
      data: [0, 1],
      error: undefined,
    });
  });
});
