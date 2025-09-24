import * as fc from "fast-check";
import { assertEq, assertThrows } from "tosti";
import { describe, expect, test } from "vitest";

import { DefaultMap } from "../DefaultMap";

describe("DefaultMap", () => {
  test("cannot be used without factory function", () => {
    const map = new DefaultMap<string, Set<string>>(/* no factory given */);
    map.getOrCreate("apple", () => new Set()).add("hello");
    //                       ^^^^^^^^^^^^^^^
    //                       Key-specific factory function given, so it's fine
    //                       to not have a central factory

    // Just happens to work because "apple" was already created
    map.getOrCreate("apple").add("world");

    assertThrows(
      () => map.getOrCreate("banana"),
      /used without a factory function/
    );
  });

  test("getOrCreate method", () => {
    const map1 = new DefaultMap(() => new Set());
    map1.getOrCreate("foo").add("hello");
    map1.getOrCreate("foo").add("world");
    map1.getOrCreate("bar").add("bye");

    // XXX Support Map in tosti
    expect(new Map(map1)).toEqual(
      new Map([
        ["foo", new Set(["hello", "world"])],
        ["bar", new Set(["bye"])],
      ])
    );

    const map2 = new DefaultMap<string, string[]>((key) => [key + "!"]);
    map2.getOrCreate("foo").push("hello");
    map2.getOrCreate("foo").push("world");
    map2.getOrCreate("bar").push("bye");

    // XXX Support Map in tosti
    expect(new Map(map2)).toEqual(
      new Map([
        ["foo", ["foo!", "hello", "world"]],
        ["bar", ["bar!", "bye"]],
      ])
    );
  });

  test("getOrCreate method with explicit nullish values", () => {
    const map = new DefaultMap(() => new Set());

    // @ts-expect-error Deliberately setting 'foo' to undefined
    map.set("foo", undefined);
    // @ts-expect-error Deliberately setting 'bar' to null
    map.set("bar", null);

    // Basic assertions that it's just like a normal Map
    assertEq(map.has("foo"), true);
    assertEq(map.get("foo"), undefined);
    assertEq(map.has("bar"), true);
    assertEq(map.get("bar"), null);

    assertEq(map.getOrCreate("foo"), undefined); // Not a Set!
    assertEq(map.getOrCreate("bar"), null); // Not a Set!

    // XXX Support Set in tosti
    expect(map.getOrCreate("qux")).toEqual(new Set());
  });

  test("getOrCreate method (w/ specific factory)", () => {
    const map = new DefaultMap((key: string) => new Set([key]));
    map.getOrCreate("foo").add("hello");
    map.getOrCreate("foo").add("world");

    // Using a custom factory function, just for this "bar" key
    map.getOrCreate("bar", () => new Set()).add("bye");

    // XXX Support Map in tosti
    expect(new Map(map)).toEqual(
      new Map([
        ["foo", new Set(["foo", "hello", "world"])],
        ["bar", new Set(["bye"])],
      ])
    );
  });
});

describe("DefaultMap (properties)", () => {
  test("constructor behaves just like a normal Map", () => {
    fc.assert(
      fc.property(
        fc.array(fc.tuple(fc.string(), fc.anything())),

        (tuples) => {
          const expected = new Map(tuples);
          const actual = new DefaultMap(() => 0, tuples);

          // XXX Support Map in tosti
          expect(new Map(actual)).toEqual(expected);
        }
      )
    );
  });

  test("setter behaves just like a normal Map setter", () => {
    fc.assert(
      fc.property(
        fc.array(fc.tuple(fc.string(), fc.anything())),

        (tuples) => {
          const expected = new Map();
          const actual = new DefaultMap(() => 0 as unknown);

          for (const [key, value] of tuples) {
            expected.set(key, value);
            actual.set(key, value);
            assertEq(actual.getOrCreate(key), expected.get(key));
          }

          // XXX Support Map in tosti
          expect(new Map(actual)).toEqual(expected);
        }
      )
    );
  });

  test("delete behaves just like a normal Map delete", () => {
    fc.assert(
      fc.property(
        fc.array(fc.tuple(fc.string(), fc.anything())),
        fc.array(fc.string()),

        (tuples, keysToDelete) => {
          const expected = new Map(tuples);
          const actual = new DefaultMap(() => 0 as unknown, tuples);

          for (const key of keysToDelete) {
            expected.delete(key);
            actual.delete(key);
          }

          // XXX Support Map in tosti
          expect(new Map(actual)).toEqual(expected);
        }
      )
    );
  });
});
