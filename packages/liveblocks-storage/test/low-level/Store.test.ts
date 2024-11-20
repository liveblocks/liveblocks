import { expect, test } from "vitest";

import { Store } from "~/Store.js";
import { opId } from "~/utils.js";

import * as mutations from "../mutations.config.js";
import { fmt } from "../utils.js";

test("can be mutated locally", () => {
  const store = new Store(mutations);
  expect(() => store.applyOp([opId(), "non-existing", []], false)).toThrow(
    "Mutation not found: 'non-existing'"
  );
  expect(fmt(store.cache)).toEqual({});
});

test("can be mutated locally", () => {
  const store = new Store(mutations);
  store.applyOp([opId(), "put", ["a", 1]], false);
  store.applyOp([opId(), "put", ["b", 2]], false);
  store.applyOp([opId(), "put", ["c", 3]], false);
  store.applyOp([opId(), "inc", ["c"]], false);

  expect(fmt(store.cache)).toEqual({ a: 1, b: 2, c: 4 });
});

test("mutations can fail", () => {
  const store = new Store(mutations);
  expect(() => store.applyOp([opId(), "dec", ["a"]], false)).toThrow(
    "Cannot decrement beyond 0"
  );
  expect(fmt(store.cache)).toEqual({});
});

test("all mutators should be executed atomically", () => {
  const store = new Store(mutations);
  store.applyOp([opId(), "put", ["a", 1]], false);
  store.applyOp([opId(), "put", ["b", 3]], false);
  try {
    // Fails, so should be rolled back
    store.applyOp([opId(), "putAndFail", ["a", 42]], false);
  } catch {
    // Ignore
  }
  store.applyOp([opId(), "dupe", ["a", "c"]], false);
  expect(fmt(store.cache)).toEqual({ a: 1, b: 3, c: 1 });
});
