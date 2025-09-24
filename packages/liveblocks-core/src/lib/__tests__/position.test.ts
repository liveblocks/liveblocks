import * as fc from "fast-check";
import { assertSame, assertThrows } from "tosti";
import { describe, test } from "vitest";

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
    assertSame(ALPHABET.length, NUM_DIGITS);
  });

  test("basic digits", () => {
    assertSame(nthDigit(0), " ");
    assertSame(nthDigit(1), "!");
    assertSame(nthDigit(3), "#");
    assertSame(nthDigit(47), "O");
    assertSame(nthDigit(94), "~");

    assertSame(nthDigit(-1), "~");
    assertSame(nthDigit(-2), "}");
    assertSame(nthDigit(-94), "!");
    assertSame(nthDigit(-95), " ");

    assertThrows(() => nthDigit(95), "Invalid n value: 95");
    assertThrows(() => nthDigit(-96), "Invalid n value: -96");
  });

  test("matches entire alphabet", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: -95, max: 94 }),

        (n) => {
          if (n >= 0) {
            assertSame(nthDigit(n), ALPHABET.charAt(n));
          } else {
            assertSame(
              nthDigit(n),
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
          assertSame(asPos(strOfZeroes), ONE);
        }
      )
    );
  });

  test("for valid strings, asPos is a noop", () => {
    fc.assert(
      fc.property(
        genPos(),

        (s) => {
          assertSame(asPos(s), s);
        }
      )
    );
  });

  test("asPos is idempotent", () => {
    fc.assert(
      fc.property(
        fc.string(),

        (s) => {
          assertSame(asPos(s), asPos(asPos(s)));
          assertSame(asPos(s), asPos(asPos(asPos(asPos(s)))));
        }
      )
    );
  });
});

describe("after / before", () => {
  test("after hops to next major digit when possible", () => {
    assertSame(after(ONE), TWO);
    assertSame(after(TWO), THREE);
    assertSame(after(THREE), FOUR);
    assertSame(after(asPos(ZERO + ZERO + ONE)), ONE);
    assertSame(after(ONE), TWO);
    assertSame(after(asPos(ONE + ZERO + ONE)), TWO);
    assertSame(after(TWO), THREE);
    assertSame(after(THREE), FOUR);
    assertSame(after(EIGHT), NINE);
    assertSame(after(NINE), NINE + ONE);
    assertSame(after(asPos(NINE + ONE)), NINE + TWO);
    assertSame(after(asPos(NINE + ONE + TWO + THREE)), NINE + TWO);
    assertSame(after(asPos(NINE + EIGHT)), NINE + NINE);
    assertSame(after(asPos(NINE + NINE)), NINE + NINE + ONE);
    assertSame(
      after(asPos(NINE + NINE + NINE + NINE)),
      NINE + NINE + NINE + NINE + ONE
    );

    // Generically stated, if the first digit isn't a 9, the result is always
    // going to be a single digit position
    fc.assert(
      fc.property(
        genPos(),

        (pos) => {
          if (pos[0] !== NINE) {
            assertSame(after(pos).length, 1); // Always generates a single-digit
          }
        }
      )
    );
  });

  test("before hops to prior major digit when possible", () => {
    assertSame(before(NINE), EIGHT);
    assertSame(before(FOUR), THREE);
    assertSame(before(THREE), TWO);
    assertSame(before(TWO), ONE);

    // Not possible when reading the "left edge" of .1, .01, .001, .0001, etc.
    assertSame(before(ONE), ZERO + NINE); // e.g. before(.1) => .09

    assertSame(before(asPos(ONE + ONE)), ONE);
    assertSame(before(asPos(ONE + ONE)), ONE);
    assertSame(before(TWO), ONE);
    assertSame(before(asPos(TWO + THREE + ONE + ZERO + ONE)), TWO);
    assertSame(before(THREE), TWO);
    assertSame(before(NINE), EIGHT);
    assertSame(before(asPos(NINE + ONE)), NINE);
    assertSame(before(asPos(NINE + TWO)), NINE);
    assertSame(before(asPos(NINE + THREE)), NINE);
    assertSame(before(asPos(NINE + EIGHT)), NINE);
    assertSame(before(asPos(NINE + NINE)), NINE);
    assertSame(before(asPos(ZERO + ONE)), ZERO + ZERO + NINE);
    assertSame(before(asPos(ZERO + ZERO + ONE)), ZERO + ZERO + ZERO + NINE);
    assertSame(before(asPos(ONE + ZERO + ZERO + ONE)), ONE); // e.g. before(.1001) => .1

    assertSame(before(asPos(NINE + THREE)), NINE); // e.g. before(.93) => .9
    assertSame(before(asPos(TWO + THREE + ONE + ZERO + ONE)), TWO); // e.g. before(.23101) => .2

    assertSame(before(asPos(ZERO + ZERO + TWO)), ZERO + ZERO + ONE);
    assertSame(
      before(asPos(ZERO + ZERO + TWO + EIGHT + THREE)),
      ZERO + ZERO + TWO
    );
    assertSame(
      before(asPos(ZERO + ZERO + TWO + ZERO + THREE)),
      ZERO + ZERO + TWO
    );

    // Generically stated, if this isn't the "left edge", the result is always
    // going to be a single digit
    fc.assert(
      fc.property(
        genUnverifiedPos(),

        (pos) => {
          if (!(pos === ONE || asPos(pos)[0] === ZERO)) {
            assertSame(before(pos).length, 1); // Always generates a single-digit
          }
        }
      ),

      {
        // Counter-examples that where found in the past by fast-check
        examples: [["\u0000x"]],
      }
    );
  });

  test("hops to next subdigit at edges", () => {
    assertSame(after(asPos(TWO + THREE + ONE + ZERO + ONE)), THREE); // e.g. after(.23101) => .3
    assertSame(after(asPos(EIGHT + NINE + NINE + EIGHT)), NINE); // e.g. after(.8998) => .9
    assertSame(
      after(asPos(NINE + NINE + NINE + EIGHT)),
      NINE + NINE + NINE + NINE
    ); // e.g. after(.9998) => .9999
    assertSame(after(asPos(ONE + ZERO + ZERO + ONE)), TWO); // e.g. after(.1001) => .2
    assertSame(after(NINE), NINE + ONE); // e.g. after(.9) => .91
    assertSame(after(asPos(NINE + NINE + NINE)), NINE + NINE + NINE + ONE); // e.g. after(.999) => .9991

    assertSame(before(asPos(ZERO + ZERO + ONE)), ZERO + ZERO + ZERO + NINE); // e.g. before(.001) => .0009

    assertSame(after(asPos(EIGHT + THREE)), NINE); // e.g. after(.83) => .9
    assertSame(after(asPos(NINE + THREE)), NINE + FOUR); // e.g. after(.93) => .99
  });

  test("always outputs valid Pos values", () => {
    fc.assert(
      fc.property(
        genPos(),

        (pos) => {
          assertSame(isPos(after(pos)), true);
          assertSame(isPos(before(pos)), true);
        }
      )
    );
  });

  test('after generates alphabetically "higher" values', () => {
    fc.assert(
      fc.property(
        genUnverifiedPos(),

        (pos) => {
          assertSame(after(pos) > pos, true);
          assertSame(pos < after(pos), true);
        }
      )
    );
  });

  test('before generates alphabetically "lower" values', () => {
    fc.assert(
      fc.property(
        genPos(),

        (pos) => {
          assertSame(before(pos) < pos, true);
          assertSame(pos > before(pos), true);
        }
      )
    );
  });
});

describe("between", () => {
  test("throws for equal values", () => {
    assertThrows(
      () => between(asPos("x"), asPos("x")),
      "Cannot compute value between two equal positions"
    );
    assertThrows(
      () => between(asPos("x"), asPos("x        ")),
      "Cannot compute value between two equal positions"
    );

    fc.assert(
      fc.property(
        genUnverifiedPos(),

        (pos) => {
          assertThrows(
            () => between(pos, pos),
            "Cannot compute value between two equal positions"
          );
        }
      )
    );
  });

  test("always output valid positions", () => {
    fc.assert(
      fc.property(
        genPosRange(),

        ([lo, hi]) => {
          assertSame(isPos(between(lo, hi)), true);
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
            assertSame(between(pos1, pos2), between(pos2, pos1));
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
          assertSame(between(lo, hi) > lo, true);
          assertSame(between(lo, hi) < hi, true);
        }
      )
    );
  });
});

describe("makePosition", () => {
  test("default/first position is .1", () =>
    assertSame(makePosition(undefined, undefined), ONE));

  test("after .1 lies .2", () => assertSame(makePosition(ONE, undefined), TWO));

  test("before .9 lies .8", () =>
    assertSame(makePosition(undefined, NINE), EIGHT));

  test("after .9 lies .91", () =>
    assertSame(makePosition(NINE, undefined), NINE + ONE));

  test("before .1 lies .09", () =>
    assertSame(makePosition(undefined, ONE), ZERO + NINE));

  test("between .1 and .11 lies .105", () =>
    assertSame(makePosition(ONE, asPos(ONE + ONE)), ONE + ZERO + MID));

  test("between .1 and .3 lies .2", () =>
    assertSame(makePosition(ONE, THREE), TWO));

  test("between .1 and .5 lies .3", () =>
    assertSame(makePosition(ONE, FIVE), THREE));

  test("between .1 and .4 lies .2", () =>
    assertSame(makePosition(ONE, FOUR), TWO));

  test("between .1 and .2 lies .15", () =>
    assertSame(makePosition(ONE, TWO), ONE + MID));

  test("between .1 and .12 lies .11", () =>
    assertSame(makePosition(asPos(ONE), asPos(ONE + TWO)), ONE + ONE));

  test("between .1 and .102 lies .101", () =>
    assertSame(
      makePosition(asPos(ONE), asPos(ONE + ZERO + TWO)),
      ONE + ZERO + ONE
    ));

  test("between .1 and .1003 lies .1001", () =>
    assertSame(
      makePosition(asPos(ONE), asPos(ONE + ZERO + ZERO + THREE)),
      ONE + ZERO + ZERO + ONE
    ));

  test("between .11 and .12 lies .115", () =>
    assertSame(
      makePosition(asPos(ONE + ONE), asPos(ONE + TWO)),
      ONE + ONE + MID
    ));

  test("between .09 and .1 should .095", () =>
    assertSame(makePosition(asPos(ZERO + NINE), ONE), ZERO + NINE + MID));

  test("between .19 and .21 should be .195", () =>
    assertSame(
      makePosition(asPos(ONE + NINE), asPos(TWO + ONE)),
      ONE + NINE + MID
    ));

  test("between .177 and .21 should be .18", () =>
    assertSame(
      makePosition(asPos(ONE + SEVEN + SEVEN), asPos(TWO + ONE)),
      ONE + EIGHT
    ));

  test("between .188 and .21 should be .19", () =>
    assertSame(
      makePosition(asPos(ONE + EIGHT + EIGHT), asPos(TWO + ONE)),
      ONE + EIGHT + EIGHT + MID
    ));

  test("between .199009 and .21 should be .1995", () =>
    assertSame(
      makePosition(
        asPos(ONE + NINE + NINE + ZERO + ZERO + NINE),
        asPos(TWO + ONE)
      ),
      ONE + NINE + NINE + MID
    ));

  test("between .1901 and .2188 should be .195", () =>
    assertSame(
      makePosition(
        asPos(ONE + NINE + ZERO + ONE),
        asPos(TWO + ONE + EIGHT + EIGHT)
      ),
      ONE + NINE + MID
    ));

  test("between .19 and .210001 should also be .195", () => {
    assertSame(
      makePosition(
        asPos(ONE + NINE),
        asPos(TWO + ONE + ZERO + ZERO + ZERO + ONE)
      ),
      ONE + NINE + MID
    );
  });

  test("between .11 and .21 should be .15", () =>
    assertSame(makePosition(asPos(ONE + ONE), asPos(TWO + ONE)), ONE + MID));
});

describe("comparePosition", () => {
  test("basics", () => {
    assertSame(asPos("1") < asPos("2"), true);
    assertSame(asPos("!") < asPos("~~"), true);
    assertSame(asPos("11111") > asPos("11"), true);
  });

  test("correct compares output of before/after", () => {
    fc.assert(
      fc.property(
        genPos(),

        (pos) => {
          assertSame(pos < after(pos), true);
          assertSame(before(pos) < pos, true);
          assertSame(after(pos) > pos, true);
          assertSame(pos > before(pos), true);
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
          assertSame(lo < mid, true);
          assertSame(mid < hi, true);
          assertSame(mid > lo, true);
          assertSame(hi > mid, true);
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
