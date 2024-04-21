import { expect, test } from "vitest";

import { DefaultMap } from "~/lib/DefaultMap.js";

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

test("set (classic)", () => {
  const m = new DefaultMap<string, number>(() => 0);
  m.set("foo", 5);
  m.set("bar", 1);
  m.set("qux", 0);
  expect(new Map(m)).toEqual(
    new Map([
      ["foo", 5],
      ["bar", 1],
      ["qux", 0],
    ])
  );
});

test("set (with setter function)", () => {
  const inc = (n: number): number => n + 1;

  const m = new DefaultMap<string, number>(() => 0);
  m.set("foo", inc);
  m.set("foo", inc);
  m.set("bar", inc);
  expect(new Map(m)).toEqual(
    new Map([
      ["foo", 2],
      ["bar", 1],
    ])
  );
});

test("set (with setter function that deletes)", () => {
  const inc = (n: number): number => n + 1;
  const dec = (n: number): number | undefined => (n === 1 ? undefined : n - 1);

  const m = new DefaultMap<string, number>(() => 0);
  m.set("foo", inc);
  m.set("foo", inc);
  m.set("foo", dec);
  m.set("foo", dec);

  m.set("bar", inc);

  m.set("qux", inc);
  m.set("qux", dec);
  m.set("qux", dec);

  expect(new Map(m)).toEqual(
    new Map([
      // NOTE: No entry for "foo"! Not even "0", due to the implementation of
      // the dec setter function.
      ["bar", 1],
      ["qux", -1],
    ])
  );

  // Doing it the opposite way would keep the explicit "0" entry
  m.set("foo", dec);
  m.set("foo", inc);

  expect(new Map(m)).toEqual(
    new Map([
      ["foo", 0],
      ["bar", 1],
      ["qux", -1],
    ])
  );
});
