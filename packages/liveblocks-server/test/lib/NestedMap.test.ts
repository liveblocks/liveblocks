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

import { NestedMap } from "~/lib/NestedMap";

function nestedMap(): fc.Arbitrary<NestedMap<string, string, unknown>> {
  return fc
    .array(fc.tuple(fc.string(), fc.string(), fc.anything()))
    .map((triplets) => {
      const nmap = new NestedMap<string, string, unknown>();
      for (const [k1, k2, v] of triplets) {
        nmap.set(k1, k2, v);
      }
      return nmap;
    });
}

describe("nested map", () => {
  test("empty", () => {
    const nmap = new NestedMap();
    expect(nmap.size).toBe(0);
  });

  test("set", () => {
    const nmap = new NestedMap();
    nmap.set("a", "b", "c");
    nmap.set("a", "p", "q");
    nmap.set("a", "b", "see");
    nmap.set("x", "y", "z");

    // Iterating happens over triplets
    expect(Array.from(nmap)).toEqual([
      ["a", "b", "see"],
      ["a", "p", "q"],
      ["x", "y", "z"],
    ]);
  });

  test("get", () => {
    const nmap = new NestedMap();
    nmap.set("a", "b", "c");
    nmap.set("a", "p", "q");
    nmap.set("x", "y", "z");

    expect(nmap.get("a", "b")).toEqual("c");
    expect(nmap.get("a", "p")).toEqual("q");
    expect(nmap.get("x", "y")).toEqual("z");
    expect(nmap.get("a", "c")).toEqual(undefined);
    expect(nmap.get("y", "x")).toEqual(undefined);
  });

  test("has", () => {
    const nmap = new NestedMap();
    nmap.set("a", "b", "c");
    nmap.set("a", "p", "q");
    nmap.set("x", "y", "z");

    expect(nmap.has("a", "b")).toBe(true);
    expect(nmap.has("a", "p")).toBe(true);
    expect(nmap.has("x", "y")).toBe(true);
    expect(nmap.has("a", "c")).toBe(false);
    expect(nmap.has("y", "x")).toBe(false);
  });

  test("count", () => {
    const nmap = new NestedMap();
    nmap.set("a", "b", "c");
    nmap.set("a", "p", "q");
    nmap.set("x", "y", "z");

    expect(nmap.count("a")).toBe(2);
    expect(nmap.count("x")).toBe(1);
    expect(nmap.count("non-existing")).toBe(0);
  });

  test("keys", () => {
    const nmap = new NestedMap();
    nmap.set("a", "b", "c");
    nmap.set("a", "p", "q");
    nmap.set("x", "y", "z");

    expect(Array.from(nmap.keys())).toEqual([
      ["a", "b"],
      ["a", "p"],
      ["x", "y"],
    ]);
  });

  test("delete", () => {
    const nmap = new NestedMap();
    nmap.set("a", "b", "c");
    nmap.set("a", "b", "see");
    nmap.set("a", "p", "q");
    nmap.delete("a", "b");
    nmap.set("x", "y", "z");

    expect(nmap.get("a", "p")).toEqual("q");
    expect(nmap.get("x", "y")).toEqual("z");
    expect(nmap.get("a", "c")).toEqual(undefined);
    expect(nmap.get("y", "x")).toEqual(undefined);

    nmap.delete("x", "y");
    expect(nmap.get("x", "y")).toEqual(undefined);
  });

  test("deleteAll", () => {
    const nmap = new NestedMap();
    nmap.set("a", "b", "c");
    nmap.set("a", "b", "see");
    nmap.set("a", "p", "q");
    nmap.set("x", "y", "z");
    expect(nmap.size).toEqual(3);
    nmap.deleteAll("a");
    expect(nmap.size).toEqual(1);

    expect(nmap.get("a", "b")).toEqual(undefined);
    expect(nmap.get("a", "c")).toEqual(undefined);
    expect(nmap.get("a", "p")).toEqual(undefined);
    expect(nmap.get("a", "y")).toEqual(undefined);
    expect(nmap.get("x", "y")).toEqual("z");
    expect(nmap.get("y", "x")).toEqual(undefined);
  });

  test("clear", () => {
    const nmap = new NestedMap();
    nmap.set("a", "b", "c");
    nmap.set("a", "b", "see");
    nmap.set("a", "p", "q");
    nmap.set("x", "y", "z");
    expect(nmap.size).toEqual(3);
    nmap.clear();
    expect(nmap.size).toEqual(0);
  });

  test("size", () => {
    const nmap = new NestedMap();
    nmap.set("a", "b", "c");
    nmap.set("a", "p", "q");
    nmap.set("a", "b", "see");
    nmap.set("x", "y", "z");

    expect(nmap.size).toBe(3);
  });

  test("keysAt", () => {
    const nmap = new NestedMap();
    nmap.set("a", "b", "c");
    nmap.set("a", "p", "q");
    nmap.set("a", "b", "see");
    nmap.set("x", "y", "z");

    expect(Array.from(nmap.keysAt("a"))).toEqual(["b", "p"]);
    expect(Array.from(nmap.keysAt("x"))).toEqual(["y"]);
    expect(Array.from(nmap.keysAt("non-existing"))).toEqual([]);
  });

  test("valuesAt", () => {
    const nmap = new NestedMap();
    nmap.set("a", "b", "c");
    nmap.set("a", "p", "q");
    nmap.set("a", "b", "see");
    nmap.set("x", "y", "z");

    expect(Array.from(nmap.valuesAt("a"))).toEqual(["see", "q"]);
    expect(Array.from(nmap.valuesAt("x"))).toEqual(["z"]);
    expect(Array.from(nmap.valuesAt("non-existing"))).toEqual([]);
  });

  test("entriesAt", () => {
    const nmap = new NestedMap();
    nmap.set("a", "b", "c");
    nmap.set("a", "p", "q");
    nmap.set("a", "b", "see");
    nmap.set("x", "y", "z");

    expect(Array.from(nmap.entriesAt("a"))).toEqual([
      ["b", "see"],
      ["p", "q"],
    ]);
    expect(Array.from(nmap.entriesAt("x"))).toEqual([["y", "z"]]);
    expect(Array.from(nmap.entriesAt("non-existing"))).toEqual([]);
  });

  test("filterAt", () => {
    const nmap = new NestedMap();
    nmap.set("a", "b", "c");
    nmap.set("a", "p", "q");
    nmap.set("a", "b", "see");
    nmap.set("x", "y", "z");

    expect(Array.from(nmap.filterAt("non", "existing"))).toEqual([]);
    expect(Array.from(nmap.filterAt("a", ["a", "b", "p", "q"]))).toEqual([
      ["b", "see"],
      ["p", "q"],
    ]);
    expect(Array.from(nmap.filterAt("a", ["q", "p", "a", "b"]))).toEqual([
      ["p", "q"],
      ["b", "see"],
    ]);
    expect(Array.from(nmap.filterAt("x", "y"))).toEqual([["y", "z"]]);
  });
});

describe("nested map (properties)", () => {
  test("set then get", () => {
    fc.assert(
      fc.property(
        nestedMap(),

        fc.string(),
        fc.string(),
        fc.anything(),

        (nmap, k1, k2, v) => {
          const sizeBefore = nmap.size;
          nmap.set(k1, k2, v);

          expect(nmap.get(k1, k2)).toEqual(v);
          expect(nmap.size).toBeGreaterThanOrEqual(sizeBefore);
          expect(nmap.size).toBeLessThanOrEqual(sizeBefore + 1);
        }
      )
    );
  });
});
