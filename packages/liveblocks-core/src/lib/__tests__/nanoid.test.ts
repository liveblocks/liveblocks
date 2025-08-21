import fc from "fast-check";
import { describe, expect, test } from "vitest";

import { nanoid } from "../nanoid";

describe("nanoid", () => {
  test("generated random strings with given length", () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 256 }), (n) => {
        expect(nanoid(n).length).toBe(n);
      })
    );
  });

  test("generates unique values every time", () => {
    // When called a 1000 times, expect at least 9999 of them to be unique
    expect(
      new Set(Array.from({ length: 1000 }, () => nanoid())).size
    ).toBeGreaterThanOrEqual(999);
  });
});
