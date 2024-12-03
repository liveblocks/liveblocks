import { expect, test } from "vitest";

import { LiveObject } from "~/LiveObject.js";
import { SQLCache } from "~/SQLCache.js";

test("empty", () => {
  const cache = new SQLCache();
  expect(cache.count).toEqual(0);
  expect(cache.table).toEqual([]);
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
  expect(cache.table).toEqual([["root", "a", 1]]);
});

test("setting keys (simple values)", () => {
  const cache = new SQLCache();
  cache.mutate((root) => {
    root.set("a", 1);
    root.set("b", "hi");
    root.set("c", null);
  });
  expect(cache.count).toEqual(3);
  expect(cache.table).toEqual([
    ["root", "a", 1],
    ["root", "b", "hi"],
    ["root", "c", null],
  ]);
});

test("setting keys (nested JSON values)", () => {
  const cache = new SQLCache();
  cache.mutate((root) => {
    root.set("a", [1, true, [{ x: false }, {}]]);
  });
  expect(cache.count).toEqual(1);
  expect(cache.table).toEqual([["root", "a", [1, true, [{ x: false }, {}]]]]);
});

test("setting keys (LiveObject)", () => {
  const cache = new SQLCache();
  cache.mutate((root) => {
    root.set("a", new LiveObject({ foo: "bar" }));
    root.set("b", new LiveObject({}));
  });
  expect(cache.table).toEqual([
    ["O1:1", "foo", "bar"],
    ["root", "a", { $ref: "O1:1" }],
    ["root", "b", { $ref: "O1:2" }],
  ]);
});

// XXX Make pass!
test.fails("attaching the same LiveObject under multiple roots fails", () => {
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
  expect(cache.table).toEqual({
    root: { a: { $ref: "O1:1" } },
    "O1:1": { foo: "bar" },
  });
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
  expect(cache.table).toEqual([["root", "a", 1]]);
});

test("deleting keys happens atomically", () => {
  const cache = new SQLCache();
  cache.mutate((root) => {
    root.set("a", 1);
    root.set("b", "hi");
  });
  expect(cache.table).toEqual([
    ["root", "a", 1],
    ["root", "b", "hi"],
  ]);

  expect(() =>
    cache.mutate((root) => {
      root.set("a", 42);
      root.delete("x");
      expect(cache.table).toEqual([
        ["root", "a", 42],
        ["root", "b", "hi"],
      ]);
      root.delete("b");
      expect(cache.table).toEqual([["root", "a", 42]]);
      throw new Error("abort this transaction");
    })
  ).toThrow("abort this transaction");

  expect(cache.table).toEqual([
    ["root", "a", 1],
    ["root", "b", "hi"],
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
  expect(cache.table).toEqual([["root", "b", "hi"]]);
});

test("has", () => {
  const cache = new SQLCache();
  expect(cache.table).toEqual([]);

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

  expect(cache.table).toEqual([["root", "k", [1, true, [{ x: false }, {}]]]]);
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
    expect(cache.table).toEqual([
      ["root", "k", "v"],
      ["root", "abc", 123],
      ["root", "def", 123],
      ["root", "foo", null],
    ]);
    root.delete("def");
    root.delete("bla");
    expect(cache.table).toEqual([
      ["root", "k", "v"],
      ["root", "abc", 123],
      ["root", "foo", null],
    ]);
  });

  expect(cache.count).toEqual(3);
  expect(cache.table).toEqual([
    ["root", "k", "v"],
    ["root", "abc", 123],
    ["root", "foo", null],
  ]);
});

test("get after rollback", () => {
  const cache = new SQLCache();
  cache.mutate((root) => {
    root.set("k", "a");
    root.set("k", "v");
    root.set("abc", 123);
  });
  expect(cache.table).toEqual([
    ["root", "k", "v"],
    ["root", "abc", 123],
  ]);

  try {
    cache.mutate((root) => {
      root.set("def", 123);
      root.set("foo", null);
      expect(cache.table).toEqual([
        ["root", "k", "v"],
        ["root", "abc", 123],
        ["root", "def", 123],
        ["root", "foo", null],
      ]);
      throw new Error("Oops");
    });
  } catch {}
  expect(cache.table).toEqual([
    ["root", "k", "v"],
    ["root", "abc", 123],
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
    ["root", "a", "a"],
    ["root", "c", "c"],
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
  expect(cache.table).toEqual([["root", "henk", 7]]);

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
  expect(cache.deltaSince(0)).toEqual([
    { root: ["abc", "foo"] },
    { root: { henk: 7 } },
    {},
  ]);
});

// XXX Make pass!
test.fails("taking deltas with refs", () => {
  const cache = new SQLCache();

  // v1
  cache.mutate((root) => {
    root.set("a", 1);
    root.set(
      "b",
      new LiveObject({ c: new LiveObject({ d: new LiveObject({}) }) })
    );
  });

  // v2
  cache.mutate((root) => {
    root.delete("a");
    root.delete("c");
  });

  // v3
  cache.mutate((root) => {
    const b = root.get("b") as LiveObject;
    expect(b).toEqual({});
    b.set("c", { x: 9 });
    b.delete("d");
    b.delete("e");
    b.set("f", 7);
  });

  // v4
  cache.mutate((root) => root.set("b", 6));

  expect(cache.count).toEqual(4);
  expect(cache.table).toEqual([
    // XXX Check this! When LiveObjects are no longer referenced, we should
    //     remove all traces of it! (These should get translated into deletions
    //     in the Delta)
    ["O1:2", "d", { $ref: "O1:3" }],
    ["O1:1", "c", { x: 9 }],
    ["root", "b", 6],
    ["O1:1", "f", 7],
  ]);

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
  expect(cache.deltaSince(0)).toEqual([
    { root: ["abc", "foo"] },
    { root: { henk: 7 } },
    {},
  ]);
});
