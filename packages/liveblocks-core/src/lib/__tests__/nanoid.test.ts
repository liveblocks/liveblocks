import fc from "fast-check";
import { assertEq, assertSame, gte } from "tosti";
import { describe, test } from "vitest";

import { nanoid } from "../nanoid";

describe("nanoid", () => {
  test("generated random strings with given length", () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 256 }), (n) => {
        assertSame(nanoid(n).length, n);
      })
    );
  });

  test("generates unique values every time", () => {
    // When called a 1000 times, expect at least 9999 of them to be unique
    assertEq(
      new Set(Array.from({ length: 1000 }, () => nanoid())).size,
      gte(999)
    );
  });
});
