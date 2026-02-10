/**
 * Copyright (c) Liveblocks Inc.
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published
 * by the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program. If not, see <https://www.gnu.org/licenses/>.
 */

import * as fc from "fast-check";

import { DefaultMap } from "~/lib/DefaultMap";

describe("DefaultMap", () => {
  test("cannot be used without factory function", () => {
    const map = new DefaultMap<string, Set<string>>(/* no factory given */);
    map.getOrCreate("apple", () => new Set()).add("hello");
    //                       ^^^^^^^^^^^^^^^
    //                       Key-specific factory function given, so it's fine
    //                       to not have a central factory

    // Just happens to work because "apple" was already created
    map.getOrCreate("apple").add("world");

    expect(() => map.getOrCreate("banana")).toThrow(
      /used without a factory function/
    );
  });

  test("getOrCreate method", () => {
    const map1 = new DefaultMap(() => new Set());
    map1.getOrCreate("foo").add("hello");
    map1.getOrCreate("foo").add("world");
    map1.getOrCreate("bar").add("bye");
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
    expect(map.has("foo")).toEqual(true);
    expect(map.get("foo")).toEqual(undefined);
    expect(map.has("bar")).toEqual(true);
    expect(map.get("bar")).toEqual(null);

    expect(map.getOrCreate("foo")).toEqual(undefined); // Not a Set!
    expect(map.getOrCreate("bar")).toEqual(null); // Not a Set!
    expect(map.getOrCreate("qux")).toEqual(new Set());
  });

  test("getOrCreate method (w/ specific factory)", () => {
    const map = new DefaultMap((key: string) => new Set([key]));
    map.getOrCreate("foo").add("hello");
    map.getOrCreate("foo").add("world");

    // Using a custom factory function, just for this "bar" key
    map.getOrCreate("bar", () => new Set()).add("bye");

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
            expect(actual.getOrCreate(key)).toEqual(expected.get(key));
          }

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

          expect(new Map(actual)).toEqual(expected);
        }
      )
    );
  });
});
