import * as fc from "fast-check";
import { describe, expect, test } from "vitest";

import type { Pos } from "../position";
import {
  __after as after,
  __before as before,
  __between as between,
  __isPos as isPos,
  __nthDigit as nthDigit,
  __NUM_DIGITS as NUM_DIGITS,
  asPos,
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
  return fc.string({ unit: digits, minLength: 1 }).map(asPos);
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

      // Also throw in a couple definitely-illegal chars
      fc.string({ unit: "binary" })
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
  return fc.string({ unit: fc.constantFrom(ZERO) });
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
  test("zero is an illegal Pos value", () => {
    fc.assert(
      fc.property(
        genZeroes(),

        (strOfZeroes) => {
          expect(asPos(strOfZeroes)).toBe(ONE);
        }
      )
    );
  });

  test("for valid strings, asPos is a noop", () => {
    fc.assert(
      fc.property(
        genPos(),

        (s) => {
          expect(asPos(s)).toBe(s);
        }
      )
    );
  });

  test("asPos is idempotent", () => {
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
});

describe("after / before", () => {
  // The viewport-based after() increments within a fixed-width viewport (V=2, 5, 8, ...)
  // rather than hopping to "nice round" numbers. This keeps position lengths bounded.
  test("after increments within viewport", () => {
    // V=2 viewport: positions of length 1-2
    expect(after(ONE)).toBe(ONE + ONE); // .1 -> .11
    expect(after(TWO)).toBe(TWO + ONE); // .2 -> .21
    expect(after(THREE)).toBe(THREE + ONE); // .3 -> .31
    expect(after(EIGHT)).toBe(EIGHT + ONE); // .8 -> .81
    expect(after(NINE)).toBe(NINE + ONE); // .9 -> .91
    expect(after(asPos(NINE + ONE))).toBe(NINE + TWO); // .91 -> .92
    expect(after(asPos(NINE + EIGHT))).toBe(NINE + NINE); // .98 -> .99

    // V=2 overflow -> V=5: when we exceed 95^2 positions
    expect(after(asPos(NINE + NINE))).toBe(NINE + NINE + ZERO + ZERO + ONE); // .99 -> .99001
  });

  test("after viewport transitions", () => {
    // V=2: length 1-2, increments within 2 digits
    expect(after(ONE)).toBe(ONE + ONE); // .1 -> .11
    expect(after(asPos(ZERO + ONE))).toBe(ZERO + TWO); // .01 -> .02 (within V=2)

    // V=2 overflow -> V=5: when 95^2 positions exhausted
    expect(after(asPos(NINE + NINE))).toBe(NINE + NINE + ZERO + ZERO + ONE); // .99 -> .99001

    // V=5: length 3-5, increments within 5 digits
    expect(after(asPos(ZERO + ZERO + ONE))).toBe(ZERO + ZERO + ONE + ZERO + ONE); // .001 -> .00101
    expect(after(asPos(ZERO + ZERO + ZERO + ONE))).toBe(
      ZERO + ZERO + ZERO + ONE + ONE
    ); // .0001 -> .00011
    expect(after(asPos(ZERO + ZERO + ZERO + ZERO + ONE))).toBe(
      ZERO + ZERO + ZERO + ZERO + TWO
    ); // .00001 -> .00002

    // V=5 overflow -> V=8: when 95^5 positions exhausted
    expect(after(asPos(NINE + NINE + NINE + NINE + NINE))).toBe(
      NINE + NINE + NINE + NINE + NINE + ZERO + ZERO + ONE
    ); // .99999 -> .99999001

    // V=8: length 6-8
    expect(after(asPos(ZERO + ZERO + ZERO + ZERO + ZERO + ONE))).toBe(
      ZERO + ZERO + ZERO + ZERO + ZERO + ONE + ZERO + ONE
    ); // .000001 -> .00000101
  });

  test("after with very large position uses string-based increment", () => {
    // String-based increment works for any length (no integer overflow issues)
    const largePos = asPos("~".repeat(2500) + "$");
    const result = after(largePos);

    // $ (code 36) increments to % (code 37)
    expect(result).toBe("~".repeat(2500) + "%");
    expect(result > largePos).toBe(true);
    expect(result.length).toBe(largePos.length);
  });

  test("viewport bumps at length boundaries", () => {
    // Viewport formula: V = 2 + ceil((len-2)/3)*3
    // len 2500: V = 2501, result pads to 2501
    // len 2501: V = 2501, result stays 2501
    // len 2502: V = 2504, result pads to 2504 (viewport bump!)
    // len 2503: V = 2504, result pads to 2504
    // len 2504: V = 2504, result stays 2504

    const pos2500 = asPos("~".repeat(2499) + "$"); // len 2500
    const pos2501 = asPos("~".repeat(2500) + "$"); // len 2501
    const pos2502 = asPos("~".repeat(2501) + "$"); // len 2502
    const pos2503 = asPos("~".repeat(2502) + "$"); // len 2503
    const pos2504 = asPos("~".repeat(2503) + "$"); // len 2504

    expect(after(pos2500).length).toBe(2501); // pads to viewport
    expect(after(pos2501).length).toBe(2501); // stays at viewport
    expect(after(pos2502).length).toBe(2504); // bumps to next viewport!
    expect(after(pos2503).length).toBe(2504); // pads to viewport
    expect(after(pos2504).length).toBe(2504); // stays at viewport

    // All should increment correctly and be greater than input
    expect(after(pos2500) > pos2500).toBe(true);
    expect(after(pos2501) > pos2501).toBe(true);
    expect(after(pos2502) > pos2502).toBe(true);
    expect(after(pos2503) > pos2503).toBe(true);
    expect(after(pos2504) > pos2504).toBe(true);
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
          if (!(pos === ONE || asPos(pos)[0] === ZERO)) {
            expect(before(pos).length).toBe(1); // Always generates a single-digit
          }
        }
      ),

      {
        // Counter-examples that where found in the past by fast-check
        examples: [["\u0000x"]],
      }
    );
  });

  test("after at viewport boundaries", () => {
    // V=5 viewport: positions of length 3-5
    expect(after(asPos(ZERO + ZERO + ONE))).toBe(ZERO + ZERO + ONE + ZERO + ONE); // .001 -> .00101
    expect(after(asPos(ZERO + ZERO + ZERO + ONE))).toBe(
      ZERO + ZERO + ZERO + ONE + ONE
    ); // .0001 -> .00011
    expect(after(asPos(ZERO + ZERO + ZERO + ZERO + ONE))).toBe(
      ZERO + ZERO + ZERO + ZERO + TWO
    ); // .00001 -> .00002

    // V=8 viewport: positions of length 6-8
    expect(after(asPos(ZERO + ZERO + ZERO + ZERO + ZERO + ONE))).toBe(
      ZERO + ZERO + ZERO + ZERO + ZERO + ONE + ZERO + ONE
    ); // .000001 -> .00000101

    // before() edge cases (unchanged behavior)
    expect(before(asPos(ZERO + ZERO + ONE))).toBe(ZERO + ZERO + ZERO + NINE); // before(.001) => .0009
  });

  test("after returns viewport-aligned lengths for valid positions", () => {
    // Valid viewport lengths are 2, 5, 8, 11, ... (or 1 for edge case "!")
    const isValidViewportLength = (len: number) =>
      len === 1 || (len >= 2 && (len - 2) % 3 === 0);

    fc.assert(
      fc.property(genPos(), (pos) => {
        const result = after(pos);
        expect(isValidViewportLength(result.length)).toBe(true);
      })
    );
  });

  test("always outputs valid Pos values", () => {
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

  test('after generates alphabetically "higher" values', () => {
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

  test('before generates alphabetically "lower" values', () => {
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
  test("throws for equal values", () => {
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

  test("always output valid positions", () => {
    fc.assert(
      fc.property(
        genPosRange(),

        ([lo, hi]) => {
          expect(isPos(between(lo, hi))).toBe(true);
        }
      )
    );
  });

  test("arguments are commutative", () => {
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

  test("generates values that are alphabetically between inputs", () => {
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

  test("after .1 lies .11", () =>
    expect(makePosition(ONE, undefined)).toBe(ONE + ONE));

  test("before .9 lies .8", () =>
    expect(makePosition(undefined, NINE)).toBe(EIGHT));

  test("after .9 lies .91", () =>
    expect(makePosition(NINE, undefined)).toBe(NINE + ONE));

  test("before .1 lies .09", () =>
    expect(makePosition(undefined, ONE)).toBe(ZERO + NINE));

  test("between .1 and .11 lies .105", () =>
    expect(makePosition(ONE, asPos(ONE + ONE))).toBe(ONE + ZERO + MID));

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
  test("basics", () => {
    expect(asPos("1") < asPos("2")).toBe(true);
    expect(asPos("!") < asPos("~~")).toBe(true);
    expect(asPos("11111") > asPos("11")).toBe(true);
  });

  test("correct compares output of before/after", () => {
    fc.assert(
      fc.property(
        genPos(),

        (pos) => {
          expect(pos < after(pos)).toBe(true);
          expect(before(pos) < pos).toBe(true);
          expect(after(pos) > pos).toBe(true);
          expect(pos > before(pos)).toBe(true);
        }
      )
    );
  });

  test("correct compares output of between", () => {
    fc.assert(
      fc.property(
        genPosRange(),

        ([lo, hi]) => {
          const mid = between(lo, hi);
          expect(lo < mid).toBe(true);
          expect(mid < hi).toBe(true);
          expect(mid > lo).toBe(true);
          expect(hi > mid).toBe(true);
        }
      ),

      {
        examples: [
          // Found these as counter examples once, adding them here to prevent regressions in the future
          [["a", "a!"] as Pos[]],
          [["a", "a                             !"] as Pos[]],
        ],
      }
    );
  });
});
