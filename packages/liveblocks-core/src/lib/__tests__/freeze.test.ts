import { describe, expect, test } from "vitest";

import { freeze } from "../freeze";

describe("freeze", () => {
  test("freezes objects", () => {
    const x = freeze({ a: 1 }) as Record<string, unknown>;
    expect(() => {
      x.b = 2;
    }).toThrow();
    expect(x.a).toEqual(1);
    expect(x.b).toBeUndefined();
  });
});
