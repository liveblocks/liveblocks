import { describe, expect, test } from "vitest";

import { stableStringify } from "../stringify";

describe("stable stringify", () => {
  test("returns the same result as JSON.stringify", () => {
    expect(
      stableStringify({
        a: 2,
      })
    ).toEqual(
      JSON.stringify({
        a: 2,
      })
    );
    expect(stableStringify([1, 2, 3])).toEqual(JSON.stringify([1, 2, 3]));
    expect(stableStringify("string")).toEqual(JSON.stringify("string"));
    expect(stableStringify(2)).toEqual(JSON.stringify(2));
    expect(stableStringify(true)).toEqual(JSON.stringify(true));
    expect(stableStringify(null)).toEqual(JSON.stringify(null));
  });

  test("supports objects in a stable way", () => {
    expect(
      stableStringify({
        a: 2,
        b: true,
      })
    ).toEqual(
      stableStringify({
        b: true,
        a: 2,
      })
    );
  });

  test("supports nested objects", () => {
    expect(stableStringify([{ a: 2, b: true }])).toEqual(
      stableStringify([{ b: true, a: 2 }])
    );
    expect(
      stableStringify([{ a: 2, b: true, c: [[{ e: -0, d: 0 }]] }])
    ).toEqual(stableStringify([{ b: true, a: 2, c: [[{ d: 0, e: 0 }]] }]));
  });

  test("explicitly-undefined keys become implicit-undefined", () => {
    expect(stableStringify([{ b: true, c: undefined, a: 2 }])).toEqual(
      '[{"a":2,"b":true}]'
    );
    expect(stableStringify([{ a: 2, b: true }])).toEqual(
      stableStringify([{ b: true, c: undefined, a: 2 }])
    );
  });
});
