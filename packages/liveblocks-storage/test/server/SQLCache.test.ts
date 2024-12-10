import { expect, test } from "vitest";

import { LiveObject } from "~/LiveObject.js";
import { SQLCache } from "~/server/SQLCache.js";
import { raise } from "~/utils.js";

test("empty", () => {
  const cache = new SQLCache();
  expect(cache.count).toEqual(0);
  expect(cache.tables.storage).toEqual([]);
  expect(cache.tables.versions).toEqual([]);
});

test("clock advances on every new transaction that is started", () => {
  const cache = new SQLCache();
  expect(cache.clock).toEqual(0);
  cache.mutate((root) => {
    expect(cache.clock).toEqual(1);
    root.set("a", 1);
    expect(cache.clock).toEqual(1);
  });
  expect(cache.clock).toEqual(1);
});

test("clock reverts after every failed transaction", () => {
  const cache = new SQLCache();
  expect(cache.clock).toEqual(0);
  try {
    cache.mutate((root) => {
      expect(cache.clock).toEqual(1);
      root.set("a", 1);
      throw new Error("Oops");
    });
  } catch {}
  expect(cache.clock).toEqual(0);
});

test("clock will not advance if nothing was written", () => {
  const cache = new SQLCache();
  expect(cache.clock).toEqual(0);
  cache.mutate((root) => {
    expect(cache.clock).toEqual(1);
    // no-op transaction
    if (0) {
      root.set("a", "I will never be executed");
    }
  });
  expect(cache.clock).toEqual(0);
});

test("setting keys (simple values)", () => {
  const cache = new SQLCache();
  expect(cache.count).toEqual(0);
  cache.mutate((root) => {
    root.set("a", 1);
  });
  expect(cache.count).toEqual(1);
  expect(cache.tables.storage).toEqual([["root", "a", 1, null]]);
});

test("setting keys (simple values)", () => {
  const cache = new SQLCache();
  cache.mutate((root) => {
    root.set("a", 1);
    root.set("b", "hi");
    root.set("c", null);
  });
  expect(cache.count).toEqual(3);
  expect(cache.tables.storage).toEqual([
    ["root", "a", 1, null],
    ["root", "b", "hi", null],
    ["root", "c", null, null],
  ]);
});

test("setting keys (nested JSON values)", () => {
  const cache = new SQLCache();
  cache.mutate((root) => {
    root.set("a", [1, true, [{ x: false }, {}]]);
  });
  expect(cache.count).toEqual(1);
  expect(cache.tables.storage).toEqual([
    ["root", "a", [1, true, [{ x: false }, {}]], null],
  ]);
});

test("setting keys (LiveObject)", () => {
  const cache = new SQLCache();
  cache.mutate((root) => {
    root.set("a", new LiveObject({ foo: "bar" }));
    root.set("b", new LiveObject({}));
  });
  expect(cache.tables.storage).toEqual([
    ["O1:1", "foo", "bar", null],
    ["root", "a", undefined, "O1:1"],
    ["root", "b", undefined, "O1:2"],
  ]);
});

test("attaching the same LiveObject under multiple roots fails", () => {
  const cache = new SQLCache();
  cache.mutate((root) => {
    const x = new LiveObject({ foo: "bar" });
    root.set("a", x);

    const y = root.get("a")!;
    expect(y).toBe(x); // Should be the exact same object instance!

    expect(() => root.set("b", y)).toThrow(
      "LiveObject already attached to this pool as O1:1"
    );
  });
  expect(cache.tables.storage).toEqual([
    ["O1:1", "foo", "bar", null],
    ["root", "a", undefined, "O1:1"],
  ]);
});

test("attaching a LiveObject from another pool should fail", () => {
  const x = new LiveObject({ foo: "bar" });

  const cache = new SQLCache();
  cache.mutate((root) => root.set("a", x));
  expect(() => cache.mutate((root) => root.set("a", x))).toThrow(
    "LiveObject already attached to different tree"
  );
  expect(cache.tables.storage).toEqual([
    ["O1:1", "foo", "bar", null],
    ["root", "a", undefined, "O1:1"],
  ]);
});

test("cannot mutate LiveObject outside of a transaction", () => {
  const x = new LiveObject({ foo: "bar" });

  const cache = new SQLCache();
  cache.mutate((root) => root.set("a", x));

  expect(() => x.set("b", 1)).toThrow(
    "Can only mutate LiveObjects within a mutation"
  );

  // The added "b" key should not get written to storage!
  expect(cache.tables.storage).toEqual([
    ["O1:1", "foo", "bar", null],
    ["root", "a", undefined, "O1:1"],
  ]);
});

test("cannot mutate LiveObject outside of a transaction (also not after failure)", () => {
  const x = new LiveObject({ foo: "bar" });

  const cache = new SQLCache();
  try {
    cache.mutate((root) => {
      root.set("a", x);
      raise("oops");
    });
  } catch {}

  expect(() => x.set("b", 1)).toThrow(
    "Can only mutate LiveObjects within a mutation"
  );

  expect(cache.tables.storage).toEqual([]);
});

test("deleting keys", () => {
  const cache = new SQLCache();
  cache.mutate((root) => {
    root.set("a", 1);
    root.set("b", "hi");
    root.delete("x");
    root.delete("b");
  });

  expect(cache.count).toEqual(1);
  expect(cache.tables.storage).toEqual([["root", "a", 1, null]]);
});

test("deleting keys happens atomically", () => {
  const cache = new SQLCache();
  cache.mutate((root) => {
    root.set("a", 1);
    root.set("b", "hi");
  });
  expect(cache.tables.storage).toEqual([
    ["root", "a", 1, null],
    ["root", "b", "hi", null],
  ]);

  expect(() =>
    cache.mutate((root) => {
      root.set("a", 42);
      root.delete("x");
      expect(cache.tables.storage).toEqual([
        ["root", "a", 42, null],
        ["root", "b", "hi", null],
      ]);
      root.delete("b");
      expect(cache.tables.storage).toEqual([["root", "a", 42, null]]);
      throw new Error("abort this transaction");
    })
  ).toThrow("abort this transaction");

  expect(cache.tables.storage).toEqual([
    ["root", "a", 1, null],
    ["root", "b", "hi", null],
  ]);
});

test("setting to undefined is the same as removing a key", () => {
  const cache = new SQLCache();
  cache.mutate((root) => {
    root.set("a", 1);
    root.set("b", "hi");
    // @ts-expect-error `undefined` isn't JSON
    root.set("d", undefined);
    // @ts-expect-error `undefined` isn't JSON
    root.set("a", undefined);
  });

  expect(cache.count).toEqual(1);
  expect(cache.tables.storage).toEqual([["root", "b", "hi", null]]);
});

test("has", () => {
  const cache = new SQLCache();
  expect(cache.tables.storage).toEqual([]);

  cache.mutate((root) => {
    root.set("k", "v");
    expect(root.has("k")).toEqual(true);

    // @ts-expect-error - undefined isn't JSON
    root.set("k", undefined);
    expect(root.has("k")).toEqual(false);

    root.delete("foo");
    expect(root.has("foo")).toEqual(false);
    root.set("foo", false);
    expect(root.has("foo")).toEqual(true);
    root.delete("foo");
    expect(root.has("foo")).toEqual(false);
  });
});

test("get (simple values)", () => {
  const cache = new SQLCache();

  cache.mutate((root) => {
    root.set("k", "v");
    expect(root.get("k")).toEqual("v");

    root.set("k", 123);
    expect(root.get("k")).toEqual(123);

    root.set("k", null);
    expect(root.get("k")).toEqual(null);

    // @ts-expect-error - undefined isn't JSON
    root.set("k", undefined);
    expect(root.get("k")).toEqual(undefined);
  });
});

test("get (nested JSON values)", () => {
  const cache = new SQLCache();

  cache.mutate((root) => {
    root.set("k", [1, true, [{ x: false }, {}]]);
    expect(root.get("k")).toEqual([1, true, [{ x: false }, {}]]);
  });

  expect(cache.tables.storage).toEqual([
    ["root", "k", [1, true, [{ x: false }, {}]], null],
  ]);
});

test("entries", () => {
  const cache = new SQLCache();
  cache.mutate((root) => {
    root.set("a", 1);
    root.delete("a");
    root.set("a", 42);
    root.set("b", 2);
  });
  expect(Array.from(cache.entries("root"))).toEqual([
    ["a", 42],
    ["b", 2],
  ]);
});

test("get (inside a transaction)", () => {
  const cache = new SQLCache();

  cache.mutate((root) => {
    root.set("k", "v");
    expect(root.get("k")).toEqual("v");

    root.set("k", 123);
    expect(root.get("k")).toEqual(123);

    root.set("k", null);
    expect(root.get("k")).toEqual(null);

    // @ts-expect-error - undefined isn't JSON
    root.set("k", undefined);
    expect(root.get("k")).toEqual(undefined);
  });
});

test("entries (inside a transaction)", () => {
  const cache = new SQLCache();
  cache.mutate((root) => {
    root.set("a", 1);
    root.delete("a");
    root.set("a", 42);
    root.set("b", 2);
  });
  expect(Array.from(cache.entries("root"))).toEqual([
    ["a", 42],
    ["b", 2],
  ]);
});

test("get", () => {
  const cache = new SQLCache();
  cache.mutate((root) => {
    root.set("k", "a");
    root.set("k", "v");
    root.set("abc", 123);
    root.set("def", 123);
    root.set("foo", null);
    expect(cache.tables.storage).toEqual([
      ["root", "k", "v", null],
      ["root", "abc", 123, null],
      ["root", "def", 123, null],
      ["root", "foo", null, null],
    ]);
    root.delete("def");
    root.delete("bla");
    expect(cache.tables.storage).toEqual([
      ["root", "k", "v", null],
      ["root", "abc", 123, null],
      ["root", "foo", null, null],
    ]);
  });

  expect(cache.count).toEqual(3);
  expect(cache.tables.storage).toEqual([
    ["root", "k", "v", null],
    ["root", "abc", 123, null],
    ["root", "foo", null, null],
  ]);
});

test("get after rollback", () => {
  const cache = new SQLCache();
  cache.mutate((root) => {
    root.set("k", "a");
    root.set("k", "v");
    root.set("abc", 123);
  });
  expect(cache.tables.storage).toEqual([
    ["root", "k", "v", null],
    ["root", "abc", 123, null],
  ]);

  try {
    cache.mutate((root) => {
      root.set("def", 123);
      root.set("foo", null);
      expect(cache.tables.storage).toEqual([
        ["root", "k", "v", null],
        ["root", "abc", 123, null],
        ["root", "def", 123, null],
        ["root", "foo", null],
      ]);
      throw new Error("Oops");
    });
  } catch {}
  expect(cache.tables.storage).toEqual([
    ["root", "k", "v", null],
    ["root", "abc", 123, null],
  ]);

  expect(cache.count).toEqual(2);
});

test("reading all rows", () => {
  const cache = new SQLCache();
  cache.mutate((root) => {
    root.set("a", "a");
    root.set("b", "b");
    root.set("c", "c");
    root.delete("b");
    root.delete("d");
  });

  expect(Array.from(cache.rows())).toEqual([
    ["root", "a", "a", null],
    ["root", "c", "c", null],
  ]);
});

test("taking deltas", () => {
  const cache = new SQLCache();

  // v1
  cache.mutate((root) => {
    root.set("abc", 1);
    root.set("foo", "bar");
  });

  // v2
  cache.mutate((root) => {
    root.delete("foo");
    root.delete("henk");
  });

  // v3
  cache.mutate((root) => root.set("henk", 7));

  // v4
  cache.mutate((root) => root.set("abc", 6));

  // v5
  cache.mutate((root) => root.delete("abc"));

  expect(cache.count).toEqual(1);
  expect(cache.tables.storage).toEqual([["root", "henk", 7, null]]);

  expect(cache.deltaSince(0)[1]).toEqual(cache.fullDelta()[1]);

  expect(cache.deltaSince(5)).toEqual([{}, {}, {}]);
  expect(cache.deltaSince(4)).toEqual([{ root: ["abc"] }, {}, {}]);
  expect(cache.deltaSince(3)).toEqual([{ root: ["abc"] }, {}, {}]);
  expect(cache.deltaSince(2)).toEqual([
    { root: ["abc"] },
    { root: { henk: 7 } },
    {},
  ]);
  expect(cache.deltaSince(1)).toEqual([
    { root: ["abc", "foo"] },
    { root: { henk: 7 } },
    {},
  ]);
  expect(cache.deltaSince(0)).toEqual([{}, { root: { henk: 7 } }, {}]);
});

test("deltas with nested LiveObjects", () => {
  const cache = new SQLCache();

  // v1
  cache.mutate((root) => {
    root.set("a", "hi");
    root.set("d", "hi");
  });
  expect(cache.tables.storage).toEqual([
    ["root", "a", "hi", null],
    ["root", "d", "hi", null],
  ]);

  // v2
  cache.mutate((root) => {
    root.set(
      "a",
      new LiveObject({ b: new LiveObject({ c: new LiveObject({}) }) })
    );
  });
  expect(cache.tables.storage).toEqual([
    ["root", "a", undefined, "O2:1"],
    ["root", "d", "hi", null],
    ["O2:2", "c", undefined, "O2:3"],
    ["O2:1", "b", undefined, "O2:2"],
  ]);

  // v3
  cache.mutate((root) => {
    // Effectively removes everything
    root.delete("a"); // deletes whole nested tree
    root.delete("d"); // deletes just one JSON value
  });
  expect(cache.tables.storage).toEqual([]);

  expect(cache.deltaSince(2)).toEqual([{ root: ["a", "d"] }, {}, {}]);
  expect(cache.deltaSince(1)).toEqual([{ root: ["a", "d"] }, {}, {}]);

  expect(cache.tables.versions).toEqual([
    // V1
    ["root", "a", 1, "hi", null],
    ["root", "d", 1, "hi", null],

    // V2
    ["O2:2", "c", 2, undefined, "O2:3"],
    ["O2:1", "b", 2, undefined, "O2:2"],
    ["root", "a", 2, undefined, "O2:1"],

    // V3
    ["O2:2", "c", 3, undefined, null],
    ["O2:1", "b", 3, undefined, null],
    ["root", "a", 3, undefined, null],
    ["root", "d", 3, undefined, null],
  ]);

  expect(cache.fullDelta()).toEqual([{}, {}, {}]);

  expect(cache.deltaSince(0)).toEqual([{}, {}, {}]);
});
