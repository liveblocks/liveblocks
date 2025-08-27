import { describe, expect, test } from "vitest";

import { shallow, shallow2 } from "../shallow";

const THING1 = { a: 1 };
const THING2 = { a: 2 };
const THING3 = { b: 3 };
const THING4 = { b: 4 };
const THINGS = [THING1, THING2, THING3, THING4];

describe("two-level deep shallow equality checks", () => {
  test("basic similarity with normal shallow", () => {
    expect(shallow(THINGS, THINGS)).toBe(true);
    expect(shallow2(THINGS, THINGS)).toBe(true);
    expect(shallow(THINGS.slice(), THINGS.slice())).toBe(true);
    expect(shallow2(THINGS.slice(), THINGS.slice())).toBe(true);
  });

  test("difference with with normal shallow", () => {
    // Here, they would behave equal...
    const x = { isLoading: false, myData: THINGS };
    const y = { isLoading: false, myData: THINGS };
    expect(shallow(x, y)).toBe(true);
    expect(shallow2(x, y)).toBe(true);

    // But here, there is the difference
    const xx = { isLoading: false, myData: THINGS.slice() };
    const yy = { isLoading: false, myData: THINGS.slice() };
    expect(shallow(xx, yy)).toBe(false);
    expect(shallow2(xx, yy)).toBe(true);
  });

  test("ordering of object keys should not matter", () => {
    const x = { isLoading: false, myData: THINGS };
    const y = { myData: THINGS, isLoading: false };
    expect(shallow(x, y)).toBe(true);
    expect(shallow2(x, y)).toBe(true);

    const xx = { isLoading: false, myData: THINGS.slice() };
    const yy = { myData: THINGS.slice(), isLoading: false };
    expect(shallow(xx, yy)).toBe(false);
    expect(shallow2(xx, yy)).toBe(true);
  });

  test("explicit-undefined matters", () => {
    const x = { myData: THINGS, isLoading: undefined };
    const y = { myData: THINGS };
    expect(shallow(x, y)).toBe(false);
    expect(shallow2(x, y)).toBe(false);
  });
});
