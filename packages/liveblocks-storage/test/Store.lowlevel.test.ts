import { describe, expect, test } from "vitest";

import { Store } from "~/Store.js";
import { opId } from "~/utils.js";

import * as mutations from "./mutations.config.js";

describe("Store tests (relatively low-level)", () => {
  test("can be mutated locally", () => {
    const store = new Store(mutations);
    expect(() => store.applyOp([opId(), "non-existing", []])).toThrow(
      "Mutation not found: 'non-existing'"
    );
    expect(store.toObj()).toEqual({});
  });

  test("can be mutated locally", () => {
    const store = new Store(mutations);
    store.applyOp([opId(), "put", ["a", 1]]);
    store.applyOp([opId(), "put", ["b", 2]]);
    store.applyOp([opId(), "put", ["c", 3]]);
    store.applyOp([opId(), "inc", ["c"]]);

    expect(store.toObj()).toEqual({ a: 1, b: 2, c: 4 });
  });

  test("mutations can fail", () => {
    const store = new Store(mutations);
    expect(() => store.applyOp([opId(), "dec", ["a"]])).toThrow(
      "Cannot decrement beyond 0"
    );
    expect(store.toObj()).toEqual({});
  });

  test("all mutators should be executed atomically", () => {
    const store = new Store(mutations);
    store.applyOp([opId(), "put", ["a", 1]]);
    store.applyOp([opId(), "put", ["b", 3]]);
    try {
      // Fails, so should be rolled back
      store.applyOp([opId(), "putAndFail", ["a", 42]]);
    } catch {
      // Ignore
    }
    store.applyOp([opId(), "dupe", ["a", "c"]]);
    expect(store.toObj()).toEqual({ a: 1, b: 3, c: 1 });
  });
});
