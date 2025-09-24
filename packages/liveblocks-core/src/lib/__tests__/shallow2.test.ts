import { assertSame } from "tosti";
import { describe, test } from "vitest";

import { shallow, shallow2 } from "../shallow";

const THING1 = { a: 1 };
const THING2 = { a: 2 };
const THING3 = { b: 3 };
const THING4 = { b: 4 };
const THINGS = [THING1, THING2, THING3, THING4];

describe("two-level deep shallow equality checks", () => {
  test("basic similarity with normal shallow", () => {
    assertSame(shallow(THINGS, THINGS), true);
    assertSame(shallow2(THINGS, THINGS), true);
    assertSame(shallow(THINGS.slice(), THINGS.slice()), true);
    assertSame(shallow2(THINGS.slice(), THINGS.slice()), true);
  });

  test("difference with with normal shallow", () => {
    // Here, they would behave equal...
    const x = { isLoading: false, myData: THINGS };
    const y = { isLoading: false, myData: THINGS };
    assertSame(shallow(x, y), true);
    assertSame(shallow2(x, y), true);

    // But here, there is the difference
    const xx = { isLoading: false, myData: THINGS.slice() };
    const yy = { isLoading: false, myData: THINGS.slice() };
    assertSame(shallow(xx, yy), false);
    assertSame(shallow2(xx, yy), true);
  });

  test("ordering of object keys should not matter", () => {
    const x = { isLoading: false, myData: THINGS };
    const y = { myData: THINGS, isLoading: false };
    assertSame(shallow(x, y), true);
    assertSame(shallow2(x, y), true);

    const xx = { isLoading: false, myData: THINGS.slice() };
    const yy = { myData: THINGS.slice(), isLoading: false };
    assertSame(shallow(xx, yy), false);
    assertSame(shallow2(xx, yy), true);
  });

  test("explicit-undefined matters", () => {
    const x = { myData: THINGS, isLoading: undefined };
    const y = { myData: THINGS };
    assertSame(shallow(x, y), false);
    assertSame(shallow2(x, y), false);
  });
});
