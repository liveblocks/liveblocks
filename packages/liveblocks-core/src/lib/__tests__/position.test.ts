import * as fc from "fast-check";

import {
  after,
  before,
  between,
  comparePosition,
  first,
  makePosition,
  max,
  min,
  pos,
  posCodes,
} from "../position";

// The alphabet that all positions values will consist of
const ALPHABET =
  " !\"#$%&'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_`abcdefghijklmnopqrstuvwxyz{|}~";

// Regex that matches all valid position values
const posRegex = new RegExp(
  "^[" + ALPHABET.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "]+$"
);

const mid = (min + max) >> 1;

/**
 * Generate random position arbitraries.
 *
 * Possible values: "!", "#", "O", "~", "~!", "~~~R", etc.
 */
function validPosition() {
  const digits = fc.constantFrom(...ALPHABET);
  return fc.stringOf(digits, { minLength: 1 }).filter(
    (pos) =>
      // " " (aka zero) is not a valid value
      !pos.split("").every((ch) => ch === " ")
  );
}

/**
 * Any non-empty string, really. But will ensure to throw in a lot of valid
 * position values.
 */
function validAndInvalidPosition() {
  return fc.oneof(
    // When fed valid Pos values...
    validPosition(),

    // ...or even random strings
    fc.string({ minLength: 1 })
  );
}

/**
 * Generates random "zero" positions.
 * Possible values: "", " ", "  ", "   ", etc.
 */
function zeroPosition() {
  return fc.stringOf(fc.constantFrom(" "));
}

/**
 * Generates pairs of positions, where the first position is "smaller" than the
 * second one.
 */
function positionRange() {
  return (
    fc
      .tuple(validPosition(), validPosition())
      // TODO: Is this x < y enough? Or should we go full on...?
      // .filter(([x, y]) => x !== y)
      // .map(([x, y]) => (comparePosition(x, y) < 0 ? [x, y] : [y, x]));
      .filter(([x, y]) => x < y)
  );
}

function testPosition(
  lo: string | undefined,
  hi: string | undefined,
  expected: string
) {
  const result = makePosition(lo, hi);
  expect(posCodes(result)).toEqual(posCodes(expected));
}

describe("position datastructure", () => {
  // XXX Currently not the case, but these tests _should_ pass
  it.skip("zero is illegal", () => {
    fc.assert(
      fc.property(
        zeroPosition(),
        zeroPosition(),

        (zero1, zero2) => {
          expect(() => after(zero1)).toThrow();
          expect(() => after(zero2)).toThrow();
          expect(() => before(zero1)).toThrow();
          expect(() => before(zero2)).toThrow();
          expect(() => between(zero1, zero2)).toThrow();
        }
      )
    );
  });

  it("position's string representation is also alphabetically sortable", () => {
    fc.assert(
      fc.property(
        validPosition(),
        validPosition(),

        (pos1, pos2) => {
          if (pos1 !== pos2) {
            expect(comparePosition(pos1, pos2) < 0).toEqual(pos1 < pos2);
            expect(comparePosition(pos1, pos2) > 0).toEqual(pos1 > pos2);
          } else {
            // Skip. Equal strings are not comparable.
          }
        }
      )
    );
  });
});

describe("after", () => {
  it("increment by .1 (typical)", () => {
    expect(first).toBe("!");
    expect(after(first)).toBe('"');
    expect(after(after(first))).toBe("#");
  });

  it("increment by .1 (edge)", () => {
    expect(after("~")).toBe("~!"); // e.g. after(.9) => .91
    expect(after("~~~")).toBe("~~~!"); // e.g. after(.999) => .9991
  });

  it("always output valid positions", () => {
    fc.assert(
      fc.property(
        validAndInvalidPosition(),

        (pos) => {
          const output = after(pos);
          expect(output).toMatch(posRegex);
        }
      )
    );
  });
});

describe("before", () => {
  it("always output valid positions", () => {
    fc.assert(
      fc.property(
        validAndInvalidPosition(),

        (pos) => {
          const output = before(pos);
          expect(output).toMatch(posRegex);
        }
      )
    );
  });
});

describe("between", () => {
  // XXX Currently not the case, but these tests _should_ pass
  it.skip("throws for equal values", () => {
    expect(() => between("x", "x")).toThrow();
    expect(() => between("x  ", "x")).toThrow();
    expect(() => between("x", "x  ")).toThrow();
  });

  it("throws when arg order is incorrect", () => {
    expect(between("a", "b")).toBe("aO");
    expect(() => between("b", "a")).toThrow();
  });

  // XXX Currently not the case for the pinned seed, but these _should_ pass
  it.skip("throws when second arg is less then first", () => {
    fc.assert(
      fc.property(
        validAndInvalidPosition(),
        validAndInvalidPosition(),

        (pos1, pos2) => {
          expect(() =>
            // Either one of these should throw
            [between(pos1, pos2), between(pos2, pos1)]
          ).toThrow();
        }
      ),
      { seed: -1142756350, path: "87:5:2" }
    );
  });

  it("always output valid positions", () => {
    fc.assert(
      fc.property(
        positionRange(),

        ([pos1, pos2]) => {
          const output = between(pos1, pos2);
          expect(output).toMatch(posRegex);
        }
      )
    );
  });
});

describe("makePosition", () => {
  test("No children", () => testPosition(undefined, undefined, pos([min + 1])));

  test("Insert after .1", () =>
    testPosition(pos([min + 1]), undefined, pos([min + 2])));

  test("Insert before .9", () =>
    testPosition(undefined, pos([max]), pos([max - 1])));

  test("Insert after .9", () =>
    testPosition(pos([max]), undefined, pos([max, min + 1])));

  test("Insert before .1", () =>
    testPosition(undefined, pos([min + 1]), pos([min, max])));

  test("Insert between .1 and .3", () =>
    testPosition(pos([min + 1]), pos([min + 3]), pos([min + 2])));

  test("Insert between .1 and .5", () =>
    testPosition(pos([min + 1]), pos([min + 5]), pos([min + 3])));

  test("Insert between .1 and .4", () =>
    testPosition(pos([min + 1]), pos([min + 4]), pos([min + 2])));

  test("Insert between .1 and .2", () =>
    testPosition(pos([min + 1]), pos([min + 2]), pos([min + 1, mid])));

  test("Insert between .11 and .12", () =>
    testPosition(
      pos([min + 1, min + 1]),
      pos([min + 1, min + 2]),
      pos([min + 1, min + 1, mid])
    ));

  test("Insert between .09 and .1 should .095", () =>
    testPosition(pos([min, max]), pos([min + 1]), pos([min, max, mid])));

  test("Insert between .19 and .21 should be .195", () =>
    testPosition(
      pos([min + 1, max]),
      pos([min + 2, min + 1]),
      pos([min + 1, max, mid])
    ));

  test("Insert between .11 and .21 should be .15", () =>
    testPosition(
      pos([min + 1, min + 1]),
      pos([min + 2, min + 1]),
      pos([min + 1, (min + 1 + max) >> 1])
    ));
});

describe("comparePosition", () => {
  it("basics", () => {
    expect(comparePosition("1", "2")).toBeLessThan(0);
    expect(comparePosition("!", "~~")).toBeLessThan(0);
    expect(comparePosition("11111", "11")).toBeGreaterThan(0);
  });

  it("throws when equal", () => {
    fc.assert(
      fc.property(
        validAndInvalidPosition(),
        zeroPosition(),

        (pos, zeroes) => {
          expect(() => comparePosition(pos, pos)).toThrow();
          expect(() => comparePosition(pos, pos + zeroes)).toThrow();
          expect(() => comparePosition(pos + zeroes, pos)).toThrow();
        }
      )
    );
  });

  it("inverted comparison leads to opposite result", () => {
    fc.assert(
      fc.property(
        positionRange(),

        ([p1, p2]) => {
          expect(comparePosition(p1, p2)).toBe(-comparePosition(p2, p1));
        }
      )
    );
  });

  it("correct compares output of before/after", () => {
    fc.assert(
      fc.property(
        validPosition(),

        (pos) => {
          expect(comparePosition(pos, after(pos))).toBe(-1);
          expect(comparePosition(before(pos), pos)).toBe(-1);
          expect(comparePosition(after(pos), pos)).toBe(1);
          expect(comparePosition(pos, before(pos))).toBe(1);
        }
      )
    );
  });

  it("correct compares output of between", () => {
    fc.assert(
      fc.property(
        positionRange(),

        ([pos1, pos2]) => {
          const mid = between(pos1, pos2);
          expect(comparePosition(pos1, mid)).toBeLessThan(0);
          expect(comparePosition(mid, pos2)).toBeLessThan(0);
          expect(comparePosition(mid, pos1)).toBeGreaterThan(0);
          expect(comparePosition(pos2, mid)).toBeGreaterThan(0);
        }
      )
    );
  });
});
