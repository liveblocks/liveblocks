import { expect, test } from "vitest";

import { SQLCache } from "~/SQLCache.js";

import { size } from "../utils.js";

test("empty", () => {
  const cache = new SQLCache();
  expect(size(cache)).toEqual(0);
  expect(cache.data).toEqual({});
  expect(cache.get("r", "foo")).toEqual(undefined);
  expect(cache.has("r", "foo")).toEqual(false);
});

test("clock advances on every new transaction that is started", () => {
  const cache = new SQLCache();
  expect(cache.clock).toEqual(0);
  cache.mutate((tx) => {
    expect(cache.clock).toEqual(1);
    tx.set("r", "a", 1);
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
      tx.set("r", "a", 1);
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
      tx.set("r", "a", "I will never be executed");
    }
  });
  expect(cache.clock).toEqual(0);
});

test("setting keys (simple values)", () => {
  const cache = new SQLCache();
  expect(size(cache)).toEqual(0);
  cache.mutate((tx) => {
    tx.set("r", "a", 1);
  });
  expect(size(cache)).toEqual(1);
  expect(cache.data).toEqual({ r: { a: 1 } });
});

test("setting keys (simple values)", () => {
  const cache = new SQLCache();
  cache.mutate((tx) => {
    tx.set("r", "a", 1);
    tx.set("r", "b", "hi");
    tx.set("r", "c", null);
  });
  expect(size(cache)).toEqual(3);
  expect(cache.data).toEqual({
    r: { a: 1, b: "hi", c: null },
  });
});

test("setting keys (nested JSON values)", () => {
  const cache = new SQLCache();
  cache.mutate((tx) => {
    tx.set("r", "a", [1, true, [{ x: false }, {}]]);
  });
  expect(size(cache)).toEqual(1);
  expect(cache.data).toEqual({
    r: {
      a: [1, true, [{ x: false }, {}]],
    },
  });
});

test("deleting keys", () => {
  const cache = new SQLCache();
  cache.mutate((tx) => {
    tx.set("r", "a", 1);
    tx.set("r", "b", "hi");
    tx.delete("r", "x");
    tx.delete("r", "b");
  });

  expect(size(cache)).toEqual(1);
  expect(cache.data).toEqual({
    r: { a: 1 },
  });
});

test("deleting keys happens atomically", () => {
  const cache = new SQLCache();
  cache.mutate((tx) => {
    tx.set("r", "a", 1);
    tx.set("r", "b", "hi");
  });
  expect(cache.data).toEqual({ r: { a: 1, b: "hi" } });

  expect(() =>
    cache.mutate((tx) => {
      tx.set("r", "a", 42);
      tx.delete("r", "x");
      expect(cache.data).toEqual({ r: { a: 42, b: "hi" } });
      tx.delete("r", "b");
      expect(cache.data).toEqual({ r: { a: 42 } });
      throw new Error("abort this transaction");
    })
  ).toThrow("abort this transaction");

  expect(cache.data).toEqual({ r: { a: 1, b: "hi" } });
});

test("setting to undefined is the same as removing a key", () => {
  const cache = new SQLCache();
  cache.mutate((tx) => {
    tx.set("r", "a", 1);
    tx.set("r", "b", "hi");
    // @ts-expect-error `undefined` isn't JSON
    tx.set("r", "d", undefined);
    // @ts-expect-error `undefined` isn't JSON
    tx.set("r", "a", undefined);
  });

  expect(size(cache)).toEqual(1);
  expect(cache.data).toEqual({ r: { b: "hi" } });
});

test("has", () => {
  const cache = new SQLCache();
  expect(cache.has("r", "k")).toEqual(false);

  cache.mutate((tx) => {
    tx.set("r", "k", "v");
    expect(tx.has("r", "k")).toEqual(true);

    // @ts-expect-error - undefined isn't JSON
    tx.set("r", "k", undefined);
    expect(tx.has("r", "k")).toEqual(false);

    tx.delete("r", "foo");
    expect(tx.has("r", "foo")).toEqual(false);
    tx.set("r", "foo", false);
    expect(tx.has("r", "foo")).toEqual(true);
    tx.delete("r", "foo");
    expect(tx.has("r", "foo")).toEqual(false);
  });
});

test("get (simple values)", () => {
  const cache = new SQLCache();
  expect(cache.get("r", "k")).toEqual(undefined);

  cache.mutate((tx) => {
    tx.set("r", "k", "v");
    expect(tx.get("r", "k")).toEqual("v");

    tx.set("r", "k", 123);
    expect(tx.get("r", "k")).toEqual(123);

    tx.set("r", "k", null);
    expect(tx.get("r", "k")).toEqual(null);

    // @ts-expect-error - undefined isn't JSON
    tx.set("r", "k", undefined);
    expect(tx.get("r", "k")).toEqual(undefined);
  });
});

test("get (nested JSON values)", () => {
  const cache = new SQLCache();
  expect(cache.get("r", "k")).toEqual(undefined);

  cache.mutate((tx) => {
    tx.set("r", "k", [1, true, [{ x: false }, {}]]);
    expect(tx.get("r", "k")).toEqual([1, true, [{ x: false }, {}]]);
  });
});

test("keys", () => {
  const cache = new SQLCache();
  cache.mutate((tx) => {
    tx.set("r", "a", 1);
    tx.delete("r", "a");
    tx.set("r", "a", 42);
    tx.set("r", "b", 2);
  });
  expect(Array.from(cache.keys())).toEqual([
    ["r", "a"],
    ["r", "b"],
  ]);
});

test("entries", () => {
  const cache = new SQLCache();
  cache.mutate((tx) => {
    tx.set("r", "a", 1);
    tx.delete("r", "a");
    tx.set("r", "a", 42);
    tx.set("r", "b", 2);
  });
  expect(Array.from(cache.entries())).toEqual([
    ["r", "a", 42],
    ["r", "b", 2],
  ]);
});

test("has (inside a transaction)", () => {
  const cache = new SQLCache();
  expect(cache.has("r", "k")).toEqual(false);

  cache.mutate((tx) => {
    tx.set("r", "k", "v");
    expect(tx.has("r", "k")).toEqual(true);

    // @ts-expect-error - undefined isn't JSON
    tx.set("r", "k", undefined);
    expect(tx.has("r", "k")).toEqual(false);

    tx.delete("r", "foo");
    expect(tx.has("r", "foo")).toEqual(false);
    tx.set("r", "foo", false);
    expect(tx.has("r", "foo")).toEqual(true);
    tx.delete("r", "foo");
    expect(tx.has("r", "foo")).toEqual(false);

    tx.set("r", "foo", "bar");
  });

  expect(cache.has("r", "foo")).toEqual(true);
});

test("get (inside a transaction)", () => {
  const cache = new SQLCache();
  expect(cache.get("r", "fuuu")).toEqual(undefined);

  cache.mutate((tx) => {
    tx.set("r", "k", "v");
    expect(tx.get("r", "k")).toEqual("v");

    tx.set("r", "k", 123);
    expect(tx.get("r", "k")).toEqual(123);

    tx.set("r", "k", null);
    expect(tx.get("r", "k")).toEqual(null);

    // @ts-expect-error - undefined isn't JSON
    tx.set("r", "k", undefined);
    expect(tx.get("r", "k")).toEqual(undefined);
  });
});

test("keys (inside a transaction)", () => {
  const cache = new SQLCache();
  cache.mutate((tx) => {
    tx.set("r", "a", 1);
    tx.delete("r", "a");
    tx.set("r", "a", 42);
    tx.set("r", "b", 2);
  });
  expect(Array.from(cache.keys())).toEqual([
    ["r", "a"],
    ["r", "b"],
  ]);
});

test("entries (inside a transaction)", () => {
  const cache = new SQLCache();
  cache.mutate((tx) => {
    tx.set("r", "a", 1);
    tx.delete("r", "a");
    tx.set("r", "a", 42);
    tx.set("r", "b", 2);
  });
  expect(Array.from(cache.entries())).toEqual([
    ["r", "a", 42],
    ["r", "b", 2],
  ]);
});

test("get", () => {
  const cache = new SQLCache();
  cache.mutate((tx) => {
    tx.set("r", "k", "a");
    tx.set("r", "k", "v");
    tx.set("r", "abc", 123);
    tx.set("r", "def", 123);
    tx.set("r", "foo", null);
    tx.delete("r", "def");
    tx.delete("r", "bla");
  });

  expect(size(cache)).toEqual(3);
  expect(cache.data).toEqual({ r: { k: "v", abc: 123, foo: null } });
  expect(cache.get("r", "k")).toEqual("v");
  expect(cache.get("r", "abc")).toEqual(123);
  expect(cache.get("r", "foo")).toEqual(null);
  expect(cache.get("r", "def")).toEqual(undefined);
  expect(cache.get("r", "bla")).toEqual(undefined);
  expect(cache.get("r", "xyz")).toEqual(undefined);
});

test("it supports iteration", () => {
  const cache = new SQLCache();
  cache.mutate((tx) => {
    tx.set("r", "a", "a");
    tx.set("r", "b", "b");
    tx.set("r", "c", "c");
    tx.delete("r", "b");
    tx.delete("r", "d");
  });

  expect(Array.from(cache)).toEqual([
    ["r", "a", "a"],
    ["r", "c", "c"],
  ]);
});

test("convenience: getNumber", () => {
  const cache = new SQLCache();
  cache.mutate((tx) => {
    tx.set("r", "abc", 123);
    tx.set("r", "foo", "bar");
  });

  expect(size(cache)).toEqual(2);
  expect(cache.get("r", "foo")).toEqual("bar");
  expect(cache.get("r", "abc")).toEqual(123);

  expect(cache.getNumber("r", "abc")).toEqual(123);
  expect(cache.getNumber("r", "foo")).toEqual(undefined);
});

test("taking deltas", () => {
  const cache = new SQLCache();

  // v1
  cache.mutate((tx) => {
    tx.set("r", "abc", 1);
    tx.set("r", "foo", "bar");
  });

  // v2
  cache.mutate((tx) => {
    tx.delete("r", "foo");
    tx.delete("r", "henk");
  });

  // v3
  cache.mutate((tx) => tx.set("r", "henk", 7));

  // v4
  cache.mutate((tx) => tx.set("r", "abc", 6));

  // v5
  cache.mutate((tx) => tx.delete("r", "abc"));

  expect(size(cache)).toEqual(1);
  expect(cache.get("r", "abc")).toEqual(undefined);
  expect(cache.get("r", "foo")).toEqual(undefined);
  expect(cache.get("r", "henk")).toEqual(7);

  expect(cache.deltaSince(0)[1]).toEqual(cache.fullDelta()[1]);

  expect(cache.deltaSince(5)).toEqual([{}, {}]);
  expect(cache.deltaSince(4)).toEqual([{ r: ["abc"] }, {}]);
  expect(cache.deltaSince(3)).toEqual([{ r: ["abc"] }, {}]);
  expect(cache.deltaSince(2)).toEqual([{ r: ["abc"] }, { r: { henk: 7 } }]);
  expect(cache.deltaSince(1)).toEqual([
    { r: ["abc", "foo"] },
    { r: { henk: 7 } },
  ]);
  expect(cache.deltaSince(0)).toEqual([
    { r: ["abc", "foo"] },
    { r: { henk: 7 } },
  ]);
});
