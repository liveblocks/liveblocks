import { warnOnce } from "@liveblocks/core";
import { beforeEach, describe, expect, type Mock, test, vi } from "vitest";

import { BatchResolver } from "../batch-resolvers";

vi.mock("@liveblocks/core", async () => {
  const actual = await vi.importActual("@liveblocks/core");

  return {
    ...actual,
    warnOnce: vi.fn(),
  };
});

describe("BatchResolver", () => {
  let mockCallback: Mock<
    (ids: string[]) => Promise<
      {
        resolved: string;
      }[]
    >
  >;

  beforeEach(() => {
    vi.clearAllMocks();

    // eslint-disable-next-line @typescript-eslint/require-await
    mockCallback = vi.fn(async (ids: string[]) => {
      return ids.map((id) => ({ resolved: id }));
    });
  });

  test("should resolve IDs in a single batch", async () => {
    const resolver = new BatchResolver(mockCallback, "Warning");

    const promise1 = resolver.get(["id-1", "id-2"]);
    const promise2 = resolver.get(["id-2", "id-3"]);

    await resolver.resolve();

    const result1 = await promise1;
    const result2 = await promise2;

    expect(result1).toEqual([{ resolved: "id-1" }, { resolved: "id-2" }]);
    expect(result2).toEqual([{ resolved: "id-2" }, { resolved: "id-3" }]);
    expect(mockCallback).toHaveBeenCalledTimes(1);
    expect(mockCallback).toHaveBeenCalledWith(["id-1", "id-2", "id-3"]);
  });

  test("should handle duplicate IDs", async () => {
    const resolver = new BatchResolver(mockCallback, "Warning");

    const promise1 = resolver.get(["id-1", "id-1"]);
    const promise2 = resolver.get(["id-1"]);

    await resolver.resolve();

    const result1 = await promise1;
    const result2 = await promise2;

    expect(result1).toEqual([{ resolved: "id-1" }, { resolved: "id-1" }]);
    expect(result2).toEqual([{ resolved: "id-1" }]);
    expect(mockCallback).toHaveBeenCalledTimes(1);
    expect(mockCallback).toHaveBeenCalledWith(["id-1"]);
  });

  test("should handle missing callback", async () => {
    const resolver = new BatchResolver(undefined, "Warning");
    const promise1 = resolver.get(["id-1", "id-2"]);
    const promise2 = resolver.get(["id-3"]);

    await resolver.resolve();
    const result1 = await promise1;
    const result2 = await promise2;

    expect(result1).toEqual([undefined, undefined]);
    expect(result2).toEqual([undefined]);

    expect(warnOnce).toHaveBeenCalledWith("Warning");
  });

  test("should throw when used after already resolved", async () => {
    const resolver = new BatchResolver(mockCallback, "Warning");

    const promise = resolver.get(["id-1"]);
    await resolver.resolve();
    await promise;

    await expect(resolver.get(["id-2"])).rejects.toThrow(
      "Batch has already been resolved."
    );
  });

  test("should throw when callback doesn't return an array", async () => {
    const nonArrayCallback = vi.fn(() => ({ "id-1": "value" }));
    const resolver = new BatchResolver(
      nonArrayCallback as unknown as (ids: string[]) => Promise<unknown[]>,
      "Warning"
    );

    void resolver.get(["id-1"]);

    await expect(resolver.resolve()).rejects.toThrow(
      "Callback must return an array."
    );
  });

  test("should throw when callback returns array of wrong length", async () => {
    // Return fewer items than requested
    const wrongLengthCallback = vi.fn((ids: string[]) => {
      return ids.slice(0, ids.length - 1).map((id) => ({ resolved: id }));
    });
    const resolver = new BatchResolver(wrongLengthCallback, "Warning");

    const promise = resolver.get(["id-1", "id-2", "id-3"]);

    await expect(resolver.resolve()).rejects.toThrow(
      "Callback must return an array of the same length as the number of provided items. Expected 3, but got 2."
    );

    const result = await promise;
    expect(result).toEqual([undefined, undefined, undefined]);
  });

  test("should handle callback throwing", async () => {
    const errorCallback = vi.fn(() => {
      throw new Error("Callback error");
    });
    const resolver = new BatchResolver(errorCallback, "Warning");

    const promise = resolver.get(["id-1"]);

    // The callback is invoked and throws
    await expect(resolver.resolve()).rejects.toThrow("Callback error");

    // Getting a result returns undefined because the callback threw, but doesn't throw itself
    const result = await promise;
    expect(result).toEqual([undefined]);
  });

  test("should handle callback returning undefined", async () => {
    const undefinedCallback = vi.fn(() => undefined);
    const resolver = new BatchResolver(undefinedCallback, "Warning");

    const promise = resolver.get(["id-1", "id-2"]);

    await resolver.resolve();
    const result = await promise;

    expect(result).toEqual([undefined, undefined]);
    expect(undefinedCallback).toHaveBeenCalledWith(["id-1", "id-2"]);
  });

  test("should handle missing results for some IDs", async () => {
    const partialCallback = vi.fn((ids: string[]) => {
      return ids.map((id) => {
        if (id === "user-1") return { name: "User 1", id: "user-1" };
        if (id === "user-2") return undefined; // No result for "user-2"
        if (id === "user-3") return { name: "User 3", id: "user-3" };
        return undefined;
      });
    });

    const resolver = new BatchResolver(partialCallback, "Warning");

    const promise1 = resolver.get(["user-1", "user-2"]);
    const promise2 = resolver.get(["user-2", "user-3"]);
    const promise3 = resolver.get(["user-1", "user-3"]);

    await resolver.resolve();

    const result1 = await promise1;
    const result2 = await promise2;
    const result3 = await promise3;

    expect(result1).toEqual([
      { name: "User 1", id: "user-1" },
      undefined, // No result for "user-2"
    ]);
    expect(result2).toEqual([
      undefined, // No result for "user-2"
      { name: "User 3", id: "user-3" },
    ]);
    expect(result3).toEqual([
      { name: "User 1", id: "user-1" },
      { name: "User 3", id: "user-3" },
    ]);

    expect(partialCallback).toHaveBeenCalledTimes(1);
    expect(partialCallback).toHaveBeenCalledWith([
      "user-1",
      "user-2",
      "user-3",
    ]);
  });

  test("should handle empty IDs arrays", async () => {
    const resolver = new BatchResolver(mockCallback, "Warning");

    const promise1 = resolver.get([]);
    const promise2 = resolver.get(["id-1"]);
    const promise3 = resolver.get([]);

    await resolver.resolve();

    const result1 = await promise1;
    const result2 = await promise2;
    const result3 = await promise3;

    expect(result1).toEqual([]);
    expect(result2).toEqual([{ resolved: "id-1" }]);
    expect(result3).toEqual([]);

    expect(mockCallback).toHaveBeenCalledTimes(1);
    expect(mockCallback).toHaveBeenCalledWith(["id-1"]);
  });
});
