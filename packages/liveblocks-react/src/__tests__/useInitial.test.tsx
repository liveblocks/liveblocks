import { renderHook } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";

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
    const fn1 = vi.fn((a: number, b: string) => `${a}-${b}`);
    const fn2 = vi.fn((a: number, b: string) => `${b}-${a}`);

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

  test("re-evaluates when roomId changes", () => {
    const { result, rerender } = renderHook(
      ({ count, roomId }) => useInitial(count, roomId),
      { initialProps: { count: 7, roomId: "room1" } }
    );

    expect(result.current).toEqual(7);

    // Change value but keep same roomId - should stay frozen
    rerender({ count: 13, roomId: "room1" });
    expect(result.current).toBe(7); // Same value

    // Change roomId - should re-evaluate with new value
    rerender({ count: 42, roomId: "room2" });
    expect(result.current).toEqual(42); // Count updated because roomId changed
  });

  test("re-evaluates functions when roomId changes", () => {
    const fn1 = vi.fn(() => "result1");
    const fn2 = vi.fn(() => "result2");
    const fn3 = vi.fn(() => "result3");

    const { result, rerender } = renderHook(
      ({ fn, roomId }) => useInitial(fn, roomId),
      { initialProps: { fn: fn1, roomId: "room1" } }
    );

    const frozenFn1 = result.current;
    expect(frozenFn1()).toBe("result1");
    expect(fn1).toHaveBeenCalledTimes(1);

    // Change function but keep same roomId - should stay frozen to original
    rerender({ fn: fn2, roomId: "room1" });
    expect(result.current).toBe(frozenFn1); // Same reference
    expect(result.current()).toBe("result1"); // Still original function
    expect(fn2).not.toHaveBeenCalled();

    // Change roomId - should re-evaluate with new function
    rerender({ fn: fn3, roomId: "room2" });
    const frozenFn2 = result.current;
    expect(frozenFn2).not.toBe(frozenFn1); // Different reference
    expect(frozenFn2()).toBe("result3"); // New function
    expect(fn3).toHaveBeenCalledTimes(1);
    expect(fn2).not.toHaveBeenCalled(); // fn2 was never frozen
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
    const fn1 = vi.fn(() => "result1");
    const fn2 = vi.fn(() => "result2");

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
    const fn1 = vi.fn((a: number, b: string) => `${a}-${b}`);
    const fn2 = vi.fn((a: number, b: string) => `${b}-${a}`);

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

  test("maintains stable wrapper despite roomId changes", () => {
    const fn1 = vi.fn(() => "fn1");
    const fn2 = vi.fn(() => "fn2");
    const fn3 = vi.fn(() => "fn3");

    const { result, rerender } = renderHook(
      ({ fn, roomId }) => useInitialUnlessFunction(fn, roomId),
      { initialProps: { fn: fn1, roomId: "room1" } }
    );

    const wrapper1 = result.current;
    expect(wrapper1()).toBe("fn1");

    // Change function but keep same roomId - should use same wrapper
    rerender({ fn: fn2, roomId: "room1" });
    expect(result.current).toBe(wrapper1); // Same wrapper
    expect(result.current()).toBe("fn2"); // But calls latest function

    // Change roomId - the useCallback should re-evaluate with new roomId dependency
    // but since roomId isn't actually used in the useCallback dependency array,
    // the wrapper reference stays the same (which is the current behavior)
    rerender({ fn: fn3, roomId: "room2" });
    const wrapper2 = result.current;
    // The implementation currently doesn't create a new wrapper when roomId changes
    // for function values because roomId isn't in the useCallback deps
    expect(wrapper2()).toBe("fn3"); // Should still call the latest function
  });

  test("handles type changes from function to non-function when roomId changes", () => {
    const fn = vi.fn(() => "function result");
    const nonFunction = "string value";

    const { result, rerender } = renderHook(
      ({ value, roomId }) => useInitialUnlessFunction(value, roomId),
      { initialProps: { value: fn as unknown, roomId: "room1" } }
    );

    // Initially a function - should get a wrapper
    const wrapper = result.current;
    expect(typeof wrapper).toBe("function");
    // @ts-expect-error wrapper is a function at this point
    expect(wrapper()).toBe("function result");

    // Change to non-function with same roomId - should keep wrapper
    rerender({ value: nonFunction, roomId: "room1" });
    expect(result.current).toBe(wrapper); // Same wrapper reference

    // Change roomId with non-function - should get the non-function value directly
    rerender({ value: nonFunction, roomId: "room2" });
    expect(result.current).toBe("string value"); // Direct non-function value
    expect(typeof result.current).toBe("string");
  });

  test("handles type changes from non-function to function when roomId changes", () => {
    const nonFunction = "string value";
    const fn = vi.fn(() => "function result");

    const { result, rerender } = renderHook(
      ({ value, roomId }) => useInitialUnlessFunction(value, roomId),
      { initialProps: { value: nonFunction as unknown, roomId: "room1" } }
    );

    // Initially a non-function - should get the value directly
    expect(result.current).toBe("string value");
    expect(typeof result.current).toBe("string");

    // Change to function with same roomId - should keep non-function
    rerender({ value: fn, roomId: "room1" });
    expect(result.current).toBe("string value"); // Still the original frozen value

    // Change roomId with function - should get a function wrapper
    rerender({ value: fn, roomId: "room2" });
    expect(typeof result.current).toBe("function");
    // @ts-expect-error result.current is a function at this point
    expect(result.current()).toBe("function result");
  });
});
