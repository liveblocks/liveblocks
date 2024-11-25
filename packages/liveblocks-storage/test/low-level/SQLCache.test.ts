import { expect, test } from "vitest";

import { SQLCache } from "~/SQLCache.js";

test("empty", () => {
  const cache = new SQLCache();
  expect(cache.count).toEqual(0);
  expect(cache.data).toEqual({});
});

test("clock advances on every new transaction that is started", () => {
  const cache = new SQLCache();
  expect(cache.clock).toEqual(0);
  cache.mutate((tx) => {
    expect(cache.clock).toEqual(1);
    tx.set("a", 1);
    expect(cache.clock).toEqual(1);
  });
  expect(cache.clock).toEqual(1);
});

test("clock reverts after every failed transaction", () => {
  const cache = new SQLCache();
  expect(cache.clock).toEqual(0);
  try {
    cache.mutate((tx) => {
      expect(cache.clock).toEqual(1);
      tx.set("a", 1);
      throw new Error("Oops");
    });
  } catch {}
  expect(cache.clock).toEqual(0);
});

test("clock will not advance if nothing was written", () => {
  const cache = new SQLCache();
  expect(cache.clock).toEqual(0);
  cache.mutate((tx) => {
    expect(cache.clock).toEqual(1);
    // no-op transaction
    if (0) {
      tx.set("a", "I will never be executed");
    }
  });
  expect(cache.clock).toEqual(0);
});

test("setting keys (simple values)", () => {
  const cache = new SQLCache();
  expect(cache.count).toEqual(0);
  cache.mutate((tx) => {
    tx.set("a", 1);
  });
  expect(cache.count).toEqual(1);
  expect(cache.data).toEqual({ root: { a: 1 } });
});

test("setting keys (simple values)", () => {
  const cache = new SQLCache();
  cache.mutate((tx) => {
    tx.set("a", 1);
    tx.set("b", "hi");
    tx.set("c", null);
  });
  expect(cache.count).toEqual(3);
  expect(cache.data).toEqual({
    root: { a: 1, b: "hi", c: null },
  });
});

test("setting keys (nested JSON values)", () => {
  const cache = new SQLCache();
  cache.mutate((tx) => {
    tx.set("a", [1, true, [{ x: false }, {}]]);
  });
  expect(cache.count).toEqual(1);
  expect(cache.data).toEqual({
    root: {
      a: [1, true, [{ x: false }, {}]],
    },
  });
});

test("deleting keys", () => {
  const cache = new SQLCache();
  cache.mutate((tx) => {
    tx.set("a", 1);
    tx.set("b", "hi");
    tx.delete("x");
    tx.delete("b");
  });

  expect(cache.count).toEqual(1);
  expect(cache.data).toEqual({
    root: { a: 1 },
  });
});

test("deleting keys happens atomically", () => {
  const cache = new SQLCache();
  cache.mutate((tx) => {
    tx.set("a", 1);
    tx.set("b", "hi");
  });
  expect(cache.data).toEqual({ root: { a: 1, b: "hi" } });

  expect(() =>
    cache.mutate((tx) => {
      tx.set("a", 42);
      tx.delete("x");
      expect(cache.data).toEqual({ root: { a: 42, b: "hi" } });
      tx.delete("b");
      expect(cache.data).toEqual({ root: { a: 42 } });
      throw new Error("abort this transaction");
    })
  ).toThrow("abort this transaction");

  expect(cache.data).toEqual({ root: { a: 1, b: "hi" } });
});

test("setting to undefined is the same as removing a key", () => {
  const cache = new SQLCache();
  cache.mutate((tx) => {
    tx.set("a", 1);
    tx.set("b", "hi");
    // @ts-expect-error `undefined` isn't JSON
    tx.set("d", undefined);
    // @ts-expect-error `undefined` isn't JSON
    tx.set("a", undefined);
  });

  expect(cache.count).toEqual(1);
  expect(cache.data).toEqual({ root: { b: "hi" } });
});

test("has", () => {
  const cache = new SQLCache();
  expect(cache.data).toEqual({});

  cache.mutate((tx) => {
    tx.set("k", "v");
    expect(tx.has("k")).toEqual(true);

    // @ts-expect-error - undefined isn't JSON
    tx.set("k", undefined);
    expect(tx.has("k")).toEqual(false);

    tx.delete("foo");
    expect(tx.has("foo")).toEqual(false);
    tx.set("foo", false);
    expect(tx.has("foo")).toEqual(true);
    tx.delete("foo");
    expect(tx.has("foo")).toEqual(false);
  });
});

test("get (simple values)", () => {
  const cache = new SQLCache();

  cache.mutate((tx) => {
    tx.set("k", "v");
    expect(tx.get("k")).toEqual("v");

    tx.set("k", 123);
    expect(tx.get("k")).toEqual(123);

    tx.set("k", null);
    expect(tx.get("k")).toEqual(null);

    // @ts-expect-error - undefined isn't JSON
    tx.set("k", undefined);
    expect(tx.get("k")).toEqual(undefined);
  });
});

test("get (nested JSON values)", () => {
  const cache = new SQLCache();

  cache.mutate((tx) => {
    tx.set("k", [1, true, [{ x: false }, {}]]);
    expect(tx.get("k")).toEqual([1, true, [{ x: false }, {}]]);
  });

  expect(cache.data).toEqual({ root: { k: [1, true, [{ x: false }, {}]] } });
});

test("keys", () => {
  const cache = new SQLCache();
  cache.mutate((tx) => {
    tx.set("a", 1);
    tx.delete("a");
    tx.set("a", 42);
    tx.set("b", 2);
  });
  expect(Array.from(cache.keys("root"))).toEqual(["a", "b"]);
});

test("entries", () => {
  const cache = new SQLCache();
  cache.mutate((tx) => {
    tx.set("a", 1);
    tx.delete("a");
    tx.set("a", 42);
    tx.set("b", 2);
  });
  expect(Array.from(cache.entries("root"))).toEqual([
    ["a", 42],
    ["b", 2],
  ]);
});

test("get (inside a transaction)", () => {
  const cache = new SQLCache();

  cache.mutate((tx) => {
    tx.set("k", "v");
    expect(tx.get("k")).toEqual("v");

    tx.set("k", 123);
    expect(tx.get("k")).toEqual(123);

    tx.set("k", null);
    expect(tx.get("k")).toEqual(null);

    // @ts-expect-error - undefined isn't JSON
    tx.set("k", undefined);
    expect(tx.get("k")).toEqual(undefined);
  });
});

test("keys (inside a transaction)", () => {
  const cache = new SQLCache();
  cache.mutate((tx) => {
    tx.set("a", 1);
    tx.delete("a");
    tx.set("a", 42);
    tx.set("b", 2);
  });
  expect(Array.from(cache.keys("root"))).toEqual(["a", "b"]);
});

test("entries (inside a transaction)", () => {
  const cache = new SQLCache();
  cache.mutate((tx) => {
    tx.set("a", 1);
    tx.delete("a");
    tx.set("a", 42);
    tx.set("b", 2);
  });
  expect(Array.from(cache.entries("root"))).toEqual([
    ["a", 42],
    ["b", 2],
  ]);
});

test("get", () => {
  const cache = new SQLCache();
  cache.mutate((tx) => {
    tx.set("k", "a");
    tx.set("k", "v");
    tx.set("abc", 123);
    tx.set("def", 123);
    tx.set("foo", null);
    expect(cache.data).toEqual({
      root: { k: "v", abc: 123, def: 123, foo: null },
    });
    tx.delete("def");
    tx.delete("bla");
    expect(cache.data).toEqual({ root: { k: "v", abc: 123, foo: null } });
  });

  expect(cache.count).toEqual(3);
  expect(cache.data).toEqual({ root: { k: "v", abc: 123, foo: null } });
});

test("get after rollback", () => {
  const cache = new SQLCache();
  cache.mutate((tx) => {
    tx.set("k", "a");
    tx.set("k", "v");
    tx.set("abc", 123);
  });
  expect(cache.data).toEqual({
    root: { k: "v", abc: 123 },
  });

  try {
    cache.mutate((tx) => {
      tx.set("def", 123);
      tx.set("foo", null);
      expect(cache.data).toEqual({
        root: { k: "v", abc: 123, def: 123, foo: null },
      });
      throw new Error("Oops");
    });
  } catch {}
  expect(cache.data).toEqual({
    root: { k: "v", abc: 123 },
  });

  expect(cache.count).toEqual(2);
});

test("reading all rows", () => {
  const cache = new SQLCache();
  cache.mutate((tx) => {
    tx.set("a", "a");
    tx.set("b", "b");
    tx.set("c", "c");
    tx.delete("b");
    tx.delete("d");
  });

  expect(Array.from(cache.rows())).toEqual([
    ["root", "a", "a"],
    ["root", "c", "c"],
  ]);
});

test("taking deltas", () => {
  const cache = new SQLCache();

  // v1
  cache.mutate((tx) => {
    tx.set("abc", 1);
    tx.set("foo", "bar");
  });

  // v2
  cache.mutate((tx) => {
    tx.delete("foo");
    tx.delete("henk");
  });

  // v3
  cache.mutate((tx) => tx.set("henk", 7));

  // v4
  cache.mutate((tx) => tx.set("abc", 6));

  // v5
  cache.mutate((tx) => tx.delete("abc"));

  expect(cache.count).toEqual(1);
  expect(cache.data).toEqual({ root: { henk: 7 } });

  expect(cache.deltaSince(0)[1]).toEqual(cache.fullDelta()[1]);

  expect(cache.deltaSince(5)).toEqual([{}, {}]);
  expect(cache.deltaSince(4)).toEqual([{ root: ["abc"] }, {}]);
  expect(cache.deltaSince(3)).toEqual([{ root: ["abc"] }, {}]);
  expect(cache.deltaSince(2)).toEqual([
    { root: ["abc"] },
    { root: { henk: 7 } },
  ]);
  expect(cache.deltaSince(1)).toEqual([
    { root: ["abc", "foo"] },
    { root: { henk: 7 } },
  ]);
  expect(cache.deltaSince(0)).toEqual([
    { root: ["abc", "foo"] },
    { root: { henk: 7 } },
  ]);
});
