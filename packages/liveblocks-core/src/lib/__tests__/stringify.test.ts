import { assertEq } from "tosti";
import { describe, test } from "vitest";

import { stableStringify } from "../stringify";

describe("stable stringify", () => {
  test("returns the same result as JSON.stringify", () => {
    assertEq(
      stableStringify({
        a: 2,
      }),
      JSON.stringify({
        a: 2,
      })
    );
    assertEq(stableStringify([1, 2, 3]), JSON.stringify([1, 2, 3]));
    assertEq(stableStringify("string"), JSON.stringify("string"));
    assertEq(stableStringify(2), JSON.stringify(2));
    assertEq(stableStringify(true), JSON.stringify(true));
    assertEq(stableStringify(null), JSON.stringify(null));
  });

  test("supports objects in a stable way", () => {
    assertEq(
      stableStringify({
        a: 2,
        b: true,
      }),
      stableStringify({
        b: true,
        a: 2,
      })
    );
  });

  test("supports nested objects", () => {
    assertEq(
      stableStringify([{ a: 2, b: true }]),
      stableStringify([{ b: true, a: 2 }])
    );
    assertEq(
      stableStringify([{ a: 2, b: true, c: [[{ e: -0, d: 0 }]] }]),
      stableStringify([{ b: true, a: 2, c: [[{ d: 0, e: 0 }]] }])
    );
  });

  test("explicitly-undefined keys become implicit-undefined", () => {
    assertEq(
      stableStringify([{ b: true, c: undefined, a: 2 }]),
      '[{"a":2,"b":true}]'
    );
    assertEq(
      stableStringify([{ a: 2, b: true }]),
      stableStringify([{ b: true, c: undefined, a: 2 }])
    );
  });
});
