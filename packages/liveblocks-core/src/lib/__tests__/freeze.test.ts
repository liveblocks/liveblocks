import { assertEq, assertThrows } from "tosti";
import { describe, test } from "vitest";

import { freeze } from "../freeze";

describe("freeze", () => {
  test("freezes objects", () => {
    const x = freeze({ a: 1 }) as Record<string, unknown>;
    assertThrows(() => {
      x.b = 2;
    }, "Cannot add property b, object is not extensible");
    assertEq(x.a, 1);
    assertEq(x.b, undefined);
  });
});
