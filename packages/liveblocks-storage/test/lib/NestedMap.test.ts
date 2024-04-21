import * as fc from "fast-check";
import { describe, expect, test } from "vitest";

import { NestedMap } from "~/lib/NestedMap.js";

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
    expect([...nmap]).toEqual([
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

  test("delete", () => {
    const nmap = new NestedMap();
    nmap.set("a", "b", "c");
    nmap.set("a", "b", "see");
    nmap.delete("a", "b");
    nmap.set("a", "p", "q");
    nmap.set("x", "y", "z");

    expect(nmap.get("a", "p")).toEqual("q");
    expect(nmap.get("x", "y")).toEqual("z");
    expect(nmap.get("a", "c")).toEqual(undefined);
    expect(nmap.get("y", "x")).toEqual(undefined);
  });

  test("size", () => {
    const nmap = new NestedMap();
    nmap.set("a", "b", "c");
    nmap.set("a", "p", "q");
    nmap.set("a", "b", "see");
    nmap.set("x", "y", "z");

    expect(nmap.size).toBe(3);
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
