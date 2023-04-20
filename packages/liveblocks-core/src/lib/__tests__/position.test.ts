import * as fc from "fast-check";

import {
  __after as after,
  __before as before,
  __between as between,
  __nthDigit as nthDigit,
  __isPos as isPos,
  __NUM_DIGITS as NUM_DIGITS,
  asPos,
  comparePosition,
  makePosition,
} from "../position";

const ZERO = nthDigit(0); // " "
const ONE = nthDigit(1); // "!"
const TWO = nthDigit(2); // "\""
const THREE = nthDigit(3); // "#"
const FOUR = nthDigit(4); // "$"
const FIVE = nthDigit(5); // "%"

// Think of MID as .5 in decimal, right in between 0.0 and 1.0
const MID = nthDigit(NUM_DIGITS >> 1); // "O"

// When used in tests below, think of NINE as meaning "the last" digit, not the
// 9th digit. We're in base96 land here after all, so NINE here could
// technically be named "ninety five" here, but you'd lose the intuition.
const NINE = nthDigit(-1); // "~"
const EIGHT = nthDigit(-2); // "}"
const SEVEN = nthDigit(-3); // "|"

// The alphabet that all positions values will consist of
const ALPHABET =
  " !\"#$%&'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_`abcdefghijklmnopqrstuvwxyz{|}~";

/**
 * Generate random (valid) Pos values.
 *
 * Possible values: "!", "#", "O", "~", "~!", "~~~R", etc.
 */
function genPos() {
  const digits = fc.constantFrom(...ALPHABET);
  return fc.stringOf(digits, { minLength: 1 }).map(asPos);
}

/**
 * Generate random (valid and invalid) values for using in places that expect
 * Pos values.
 */
function genUnverifiedPos() {
  return fc
    .oneof(
      // Some valid positions
      genPos(),

      // Some valid positions with trailing zeroes
      fc.tuple(genPos(), genZeroes()).map(([s, trail]) => s + trail),

      fc.string(),

      // But ensure to throw in a higher likeliness of position-like values
      fc.constantFrom(...ALPHABET),

      // Also throw in a couple definitely-illegal chars from the entire ASCII charset
      fc.ascii(),
      fc.unicodeString()
    )
    .map(
      (s) =>
        // Deliberately force-casted to a Pos, even if these inputs are invalid
        // Pos values. Used to test unexpected inputs.
        s as ReturnType<typeof asPos>
    );
}

/**
 * Generates random "zero" positions, which are invalid Pos values.
 * Possible values: "", " ", "  ", "   ", etc.
 */
function genZeroes() {
  return fc.stringOf(fc.constantFrom(ZERO));
}

/**
 * Generates pairs of positions, where the first position is "smaller" than the
 * second one.
 */
function genPosRange() {
  return fc
    .tuple(genPos(), genPos())
    .filter(([x, y]) => x !== y)
    .map(([x, y]) => (x < y ? [x, y] : [y, x]));
}

describe("digits", () => {
  test("alphabet is correct", () => {
    expect(ALPHABET.length).toBe(NUM_DIGITS);
  });

  test("basic digits", () => {
    expect(nthDigit(0)).toBe(" ");
    expect(nthDigit(1)).toBe("!");
    expect(nthDigit(3)).toBe("#");
    expect(nthDigit(47)).toBe("O");
    expect(nthDigit(94)).toBe("~");

    expect(nthDigit(-1)).toBe("~");
    expect(nthDigit(-2)).toBe("}");
    expect(nthDigit(-94)).toBe("!");
    expect(nthDigit(-95)).toBe(" ");

    expect(() => nthDigit(95)).toThrow();
    expect(() => nthDigit(-96)).toThrow();
  });

  test("matches entire alphabet", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: -95, max: 94 }),

        (n) => {
          if (n >= 0) {
            expect(nthDigit(n)).toBe(ALPHABET.charAt(n));
          } else {
            expect(nthDigit(n)).toBe(
              ALPHABET.split("")
                .reverse()
                .join("")
                .charAt(-(n + 1))
            );
          }
        }
      )
    );
  });
});

describe("position datastructure", () => {
  it("zero is an illegal Pos value", () => {
    fc.assert(
      fc.property(
        genZeroes(),

        (strOfZeroes) => {
          expect(asPos(strOfZeroes)).toBe(ONE);
        }
      )
    );
  });

  it("for valid strings, asPos is a noop", () => {
    fc.assert(
      fc.property(
        genPos(),

        (s) => {
          expect(asPos(s)).toBe(s);
        }
      )
    );
  });

  it("asPos is idempotent", () => {
    fc.assert(
      fc.property(
        fc.string(),

        (s) => {
          expect(asPos(s)).toBe(asPos(asPos(s)));
          expect(asPos(s)).toBe(asPos(asPos(asPos(asPos(s)))));
        }
      )
    );
  });

  it("valid Pos strings aren't modified", () => {
    fc.assert(
      fc.property(
        genPos(),

        (pos) => {
          expect(asPos(pos)).toBe(pos);
        }
      )
    );
  });

  it("position's string representation is also alphabetically sortable", () => {
    fc.assert(
      fc.property(
        genPos(),
        genPos(),

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

describe("after / before", () => {
  test("after hops to next major digit when possible", () => {
    expect(after(ONE)).toBe(TWO);
    expect(after(TWO)).toBe(THREE);
    expect(after(THREE)).toBe(FOUR);
    expect(after(asPos(ZERO + ZERO + ONE))).toBe(ONE);
    expect(after(ONE)).toBe(TWO);
    expect(after(asPos(ONE + ZERO + ONE))).toBe(TWO);
    expect(after(TWO)).toBe(THREE);
    expect(after(THREE)).toBe(FOUR);
    expect(after(EIGHT)).toBe(NINE);
    expect(after(NINE)).toBe(NINE + ONE);
    expect(after(asPos(NINE + ONE))).toBe(NINE + TWO);
    expect(after(asPos(NINE + ONE + TWO + THREE))).toBe(NINE + TWO);
    expect(after(asPos(NINE + EIGHT))).toBe(NINE + NINE);
    expect(after(asPos(NINE + NINE))).toBe(NINE + NINE + ONE);
    expect(after(asPos(NINE + NINE + NINE + NINE))).toBe(
      NINE + NINE + NINE + NINE + ONE
    );

    // Generically stated, if the first digit isn't a 9, the result is always
    // going to be a single digit position
    fc.assert(
      fc.property(
        genPos(),

        (pos) => {
          if (pos[0] !== NINE) {
            expect(after(pos).length).toBe(1); // Always generates a single-digit
          }
        }
      )
    );
  });

  test("before hops to prior major digit when possible", () => {
    expect(before(NINE)).toBe(EIGHT);
    expect(before(FOUR)).toBe(THREE);
    expect(before(THREE)).toBe(TWO);
    expect(before(TWO)).toBe(ONE);

    // Not possible when reading the "left edge" of .1, .01, .001, .0001, etc.
    expect(before(ONE)).toBe(ZERO + NINE); // e.g. before(.1) => .09

    expect(before(asPos(ONE + ONE))).toBe(ONE);
    expect(before(asPos(ONE + ONE))).toBe(ONE);
    expect(before(TWO)).toBe(ONE);
    expect(before(asPos(TWO + THREE + ONE + ZERO + ONE))).toBe(TWO);
    expect(before(THREE)).toBe(TWO);
    expect(before(NINE)).toBe(EIGHT);
    expect(before(asPos(NINE + ONE))).toBe(NINE);
    expect(before(asPos(NINE + TWO))).toBe(NINE);
    expect(before(asPos(NINE + THREE))).toBe(NINE);
    expect(before(asPos(NINE + EIGHT))).toBe(NINE);
    expect(before(asPos(NINE + NINE))).toBe(NINE);
    expect(before(asPos(ZERO + ONE))).toBe(ZERO + ZERO + NINE);
    expect(before(asPos(ZERO + ZERO + ONE))).toBe(ZERO + ZERO + ZERO + NINE);
    expect(before(asPos(ONE + ZERO + ZERO + ONE))).toBe(ONE); // e.g. before(.1001) => .1

    expect(before(asPos(NINE + THREE))).toBe(NINE); // e.g. before(.93) => .9
    expect(before(asPos(TWO + THREE + ONE + ZERO + ONE))).toBe(TWO); // e.g. before(.23101) => .2

    expect(before(asPos(ZERO + ZERO + TWO))).toBe(ZERO + ZERO + ONE);
    expect(before(asPos(ZERO + ZERO + TWO + EIGHT + THREE))).toBe(
      ZERO + ZERO + TWO
    );
    expect(before(asPos(ZERO + ZERO + TWO + ZERO + THREE))).toBe(
      ZERO + ZERO + TWO
    );

    // Generically stated, if this isn't the "left edge", the result is always
    // going to be a single digit
    fc.assert(
      fc.property(
        genUnverifiedPos(),

        (pos) => {
          if (!(pos === ONE || pos[0] === ZERO)) {
            expect(before(pos).length).toBe(1); // Always generates a single-digit
          }
        }
      )
    );
  });

  test("hops to next subdigit at edges", () => {
    expect(after(asPos(TWO + THREE + ONE + ZERO + ONE))).toBe(THREE); // e.g. after(.23101) => .3
    expect(after(asPos(EIGHT + NINE + NINE + EIGHT))).toBe(NINE); // e.g. after(.8998) => .9
    expect(after(asPos(NINE + NINE + NINE + EIGHT))).toBe(
      NINE + NINE + NINE + NINE
    ); // e.g. after(.9998) => .9999
    expect(after(asPos(ONE + ZERO + ZERO + ONE))).toBe(TWO); // e.g. after(.1001) => .2
    expect(after(NINE)).toBe(NINE + ONE); // e.g. after(.9) => .91
    expect(after(asPos(NINE + NINE + NINE))).toBe(NINE + NINE + NINE + ONE); // e.g. after(.999) => .9991

    expect(before(asPos(ZERO + ZERO + ONE))).toBe(ZERO + ZERO + ZERO + NINE); // e.g. before(.001) => .0009

    expect(after(asPos(EIGHT + THREE))).toBe(NINE); // e.g. after(.83) => .9
    expect(after(asPos(NINE + THREE))).toBe(NINE + FOUR); // e.g. after(.93) => .99
  });

  it("always outputs valid Pos values", () => {
    fc.assert(
      fc.property(
        genPos(),

        (pos) => {
          expect(isPos(after(pos))).toBe(true);
          expect(isPos(before(pos))).toBe(true);
        }
      )
    );
  });

  it('after generates alphabetically "higher" values', () => {
    fc.assert(
      fc.property(
        genUnverifiedPos(),

        (pos) => {
          expect(after(pos) > pos).toBe(true);
          expect(pos < after(pos)).toBe(true);
        }
      )
    );
  });

  it('before generates alphabetically "lower" values', () => {
    fc.assert(
      fc.property(
        genPos(),

        (pos) => {
          expect(before(pos) < pos).toBe(true);
          expect(pos > before(pos)).toBe(true);
        }
      )
    );
  });
});

describe("between", () => {
  it("throws for equal values", () => {
    expect(() => between(asPos("x"), asPos("x"))).toThrow();
    expect(() => between(asPos("x"), asPos("x        "))).toThrow();

    fc.assert(
      fc.property(
        genUnverifiedPos(),

        (pos) => {
          expect(() => between(pos, pos)).toThrow();
        }
      )
    );
  });

  it("always output valid positions", () => {
    fc.assert(
      fc.property(
        genPosRange(),

        ([lo, hi]) => {
          expect(isPos(between(lo, hi))).toBe(true);
        }
      )
    );
  });

  it("arguments are commutative", () => {
    fc.assert(
      fc.property(
        genPos(),
        genPos(),

        (pos1, pos2) => {
          if (pos1 !== pos2) {
            expect(between(pos1, pos2)).toBe(between(pos2, pos1));
          }
        }
      )
    );
  });

  it("generates values that are alphabetically between inputs", () => {
    fc.assert(
      fc.property(
        genPosRange(),

        ([lo, hi]) => {
          expect(between(lo, hi) > lo).toBe(true);
          expect(between(lo, hi) < hi).toBe(true);
        }
      )
    );
  });
});

describe("makePosition", () => {
  test("default/first position is .1", () =>
    expect(makePosition(undefined, undefined)).toBe(ONE));

  test("after .1 lies .2", () =>
    expect(makePosition(ONE, undefined)).toBe(TWO));

  test("before .9 lies .8", () =>
    expect(makePosition(undefined, NINE)).toBe(EIGHT));

  test("after .9 lies .91", () =>
    expect(makePosition(NINE, undefined)).toBe(NINE + ONE));

  test("before .1 lies .09", () =>
    expect(makePosition(undefined, ONE)).toBe(ZERO + NINE));

  test("between .1 and .3 lies .2", () =>
    expect(makePosition(ONE, THREE)).toBe(TWO));

  test("between .1 and .5 lies .3", () =>
    expect(makePosition(ONE, FIVE)).toBe(THREE));

  test("between .1 and .4 lies .2", () =>
    expect(makePosition(ONE, FOUR)).toBe(TWO));

  test("between .1 and .2 lies .15", () =>
    expect(makePosition(ONE, TWO)).toBe(ONE + MID));

  test("between .1 and .12 lies .11", () =>
    expect(makePosition(asPos(ONE), asPos(ONE + TWO))).toBe(ONE + ONE));

  test("between .1 and .102 lies .101", () =>
    expect(makePosition(asPos(ONE), asPos(ONE + ZERO + TWO))).toBe(
      ONE + ZERO + ONE
    ));

  test("between .1 and .1003 lies .1001", () =>
    expect(makePosition(asPos(ONE), asPos(ONE + ZERO + ZERO + THREE))).toBe(
      ONE + ZERO + ZERO + ONE
    ));

  test("between .11 and .12 lies .115", () =>
    expect(makePosition(asPos(ONE + ONE), asPos(ONE + TWO))).toBe(
      ONE + ONE + MID
    ));

  test("between .09 and .1 should .095", () =>
    expect(makePosition(asPos(ZERO + NINE), ONE)).toBe(ZERO + NINE + MID));

  test("between .19 and .21 should be .195", () =>
    expect(makePosition(asPos(ONE + NINE), asPos(TWO + ONE))).toBe(
      ONE + NINE + MID
    ));

  test("between .177 and .21 should be .18", () =>
    expect(makePosition(asPos(ONE + SEVEN + SEVEN), asPos(TWO + ONE))).toBe(
      ONE + EIGHT
    ));

  test("between .188 and .21 should be .19", () =>
    expect(makePosition(asPos(ONE + EIGHT + EIGHT), asPos(TWO + ONE))).toBe(
      ONE + EIGHT + EIGHT + MID
    ));

  test("between .199009 and .21 should be .1995", () =>
    expect(
      makePosition(
        asPos(ONE + NINE + NINE + ZERO + ZERO + NINE),
        asPos(TWO + ONE)
      )
    ).toBe(ONE + NINE + NINE + MID));

  test("between .1901 and .2188 should be .195", () =>
    expect(
      makePosition(
        asPos(ONE + NINE + ZERO + ONE),
        asPos(TWO + ONE + EIGHT + EIGHT)
      )
    ).toBe(ONE + NINE + MID));

  test("between .19 and .210001 should also be .195", () => {
    expect(
      makePosition(
        asPos(ONE + NINE),
        asPos(TWO + ONE + ZERO + ZERO + ZERO + ONE)
      )
    ).toBe(ONE + NINE + MID);
  });

  test("between .11 and .21 should be .15", () =>
    expect(makePosition(asPos(ONE + ONE), asPos(TWO + ONE))).toBe(ONE + MID));
});

describe("comparePosition", () => {
  it("basics", () => {
    expect(comparePosition(asPos("1"), asPos("2"))).toBeLessThan(0);
    expect(comparePosition(asPos("!"), asPos("~~"))).toBeLessThan(0);
    expect(comparePosition(asPos("11111"), asPos("11"))).toBeGreaterThan(0);
  });

  it("returns 0 when equal", () => {
    fc.assert(
      fc.property(
        genUnverifiedPos(),

        (pos) => {
          expect(comparePosition(pos, pos)).toBe(0);
        }
      )
    );
  });

  it("inverted comparison leads to opposite result", () => {
    fc.assert(
      fc.property(
        genUnverifiedPos(),
        genUnverifiedPos(),

        (p1, p2) => {
          if (p1 !== p2) {
            expect(comparePosition(p1, p2)).toBe(-comparePosition(p2, p1));
          }
        }
      )
    );
  });

  it("correct compares output of before/after", () => {
    fc.assert(
      fc.property(
        genPos(),

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
        genPosRange(),

        ([lo, hi]) => {
          const mid = between(lo, hi);
          expect(comparePosition(lo, mid)).toBe(-1);
          expect(comparePosition(mid, hi)).toBe(-1);
          expect(comparePosition(mid, lo)).toBe(1);
          expect(comparePosition(hi, mid)).toBe(1);
        }
      )
    );
  });
});
