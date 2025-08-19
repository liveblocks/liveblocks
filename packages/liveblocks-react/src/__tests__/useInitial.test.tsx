import { renderHook } from "@testing-library/react";

import { useInitial, useInitialUnlessFunction } from "../lib/use-initial";

describe("useInitial", () => {
  test("freezes initial object and maintains reference equality", () => {
    const { result, rerender } = renderHook((props) => useInitial(props), {
      initialProps: { count: 0 },
    });

    const firstResult = result.current;
    expect(firstResult).toEqual({ count: 0 });

    // Change the value and re-render
    rerender({ count: 1 });

    const secondResult = result.current;
    expect(secondResult).toEqual({ count: 0 }); // Still the original value
    expect(secondResult).toBe(firstResult); // Same reference
  });

  test("freezes initial primitive value across re-renders", () => {
    const { result, rerender } = renderHook(({ count }) => useInitial(count), {
      initialProps: { count: 0 },
    });

    const firstResult = result.current;
    expect(firstResult).toEqual(0);

    // Change the value and re-render
    rerender({ count: 1 });

    const secondResult = result.current;
    expect(secondResult).toEqual(0); // Still the original value
    expect(secondResult).toBe(firstResult); // Same reference
  });

  test("freezes initial function and ignores updates", () => {
    const fn1 = jest.fn((a: number, b: string) => `${a}-${b}`);
    const fn2 = jest.fn((a: number, b: string) => `${b}-${a}`);

    const { result, rerender } = renderHook((fn) => useInitial(fn), {
      initialProps: fn1,
    });

    const frozenFn = result.current;

    // Call the frozen function
    const result1 = frozenFn(42, "test");
    expect(result1).toBe("42-test");
    expect(fn1).toHaveBeenCalledWith(42, "test");

    // Update with new function - but useInitial keeps the original
    rerender(fn2);

    expect(result.current).toBe(frozenFn); // Same frozen reference
    expect(fn2).not.toHaveBeenCalled(); // New function never called

    // Calling it still uses the original frozen function
    const result2 = result.current(99, "hello");
    expect(result2).toBe("99-hello");
    expect(fn1).toHaveBeenCalledWith(99, "hello");
    expect(fn2).not.toHaveBeenCalled(); // Still never called
  });
});

describe("useInitialUnlessFunction", () => {
  test("freezes non-function values like useInitial", () => {
    const { result, rerender } = renderHook(
      (props) => useInitialUnlessFunction(props),
      { initialProps: { count: 0 } }
    );

    const firstResult = result.current;
    expect(firstResult).toEqual({ count: 0 });

    rerender({ count: 1 });

    expect(result.current).toBe(firstResult); // Same reference
  });

  test("creates stable wrapper that calls latest function", () => {
    const fn1 = jest.fn(() => "result1");
    const fn2 = jest.fn(() => "result2");

    const { result, rerender } = renderHook(
      ({ fn }) => useInitialUnlessFunction(fn),
      { initialProps: { fn: fn1 } }
    );

    const wrappedFn = result.current;
    expect(typeof wrappedFn).toBe("function");

    // Call the wrapped function
    const result1 = wrappedFn();
    expect(result1).toBe("result1");
    expect(fn1).toHaveBeenCalledTimes(1);

    // Update with new function - wrapper should stay the same
    rerender({ fn: fn2 });

    expect(result.current).toBe(wrappedFn); // Same wrapper reference

    // But calling it should use the latest function
    const result2 = result.current();
    expect(result2).toBe("result2");
    expect(fn2).toHaveBeenCalledTimes(1);
    expect(fn1).toHaveBeenCalledTimes(1); // Not called again
  });

  test("passes arguments through stable wrapper to latest function", () => {
    const fn1 = jest.fn((a: number, b: string) => `${a}-${b}`);
    const fn2 = jest.fn((a: number, b: string) => `${b}-${a}`);

    const { result, rerender } = renderHook(
      ({ fn }) => useInitialUnlessFunction(fn),
      { initialProps: { fn: fn1 } }
    );

    const wrappedFn = result.current;

    // Call with arguments
    const result1 = wrappedFn(42, "test");
    expect(result1).toBe("42-test");
    expect(fn1).toHaveBeenCalledWith(42, "test");

    // Update function and call again
    rerender({ fn: fn2 });
    const result2 = result.current(99, "hello");
    expect(result2).toBe("hello-99");
    expect(fn2).toHaveBeenCalledWith(99, "hello");
  });
});
