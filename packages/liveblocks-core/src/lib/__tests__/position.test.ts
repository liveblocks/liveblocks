import * as fc from "fast-check";

import type { __Code as Code, Pos } from "../position";
import {
  __after as after,
  __before as before,
  __between as between,
  __max as max,
  __min as min,
  __ONE as ONE,
  __pos as pos,
  __posCodes as posCodes,
  __ZERO as ZERO,
  asPos,
  comparePosition,
  makePosition,
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
  return fc.stringOf(digits, { minLength: 1 }).map(asPos);
}

/**
 * Any string, really, but ran through the asPos checker.
 */
function validAndInvalidPosition() {
  return fc
    .oneof(
      // Some valid positions
      validPosition(),

      // Some valid positions with trailing zeroes
      fc.tuple(validPosition(), zeroPosition()).map(([s, trail]) => s + trail),

      fc.string(),

      // But ensure to throw in a higher likeliness of position-like values
      fc.constantFrom(...ALPHABET),

      // Also throw in a couple definitely-illegal chars from the entire ASCII charset
      fc.ascii(),
      fc.unicodeString()
    )
    .map(asPos);
}

/**
 * Generates random "zero" positions.
 * Possible values: "", " ", "  ", "   ", etc.
 */
function zeroPosition() {
  return fc.stringOf(fc.constantFrom(ZERO));
}

/**
 * Generates pairs of positions, where the first position is "smaller" than the
 * second one.
 */
function positionRange() {
  return fc.tuple(validPosition(), validPosition()).filter(([x, y]) => x < y);
}

function testPosition(
  lo: string | undefined,
  hi: string | undefined,
  expected: string
) {
  const result = makePosition(
    lo !== undefined ? asPos(lo) : undefined,
    hi !== undefined ? asPos(hi) : undefined
  );
  expect(posCodes(result)).toEqual(posCodes(expected as Pos));
}

describe("position datastructure", () => {
  it("zero is an illegal Pos value", () => {
    fc.assert(
      fc.property(
        zeroPosition(),

        (strOfZeroes) => {
          expect(asPos(strOfZeroes)).toBe(ONE);
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
        }
      )
    );
  });

  it("valid Pos strings aren't modified", () => {
    fc.assert(
      fc.property(
        validPosition(),

        (pos) => {
          expect(asPos(pos)).toBe(pos);
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
    expect(ONE).toBe("!");
    expect(after(ONE)).toBe('"');
    expect(after(after(ONE))).toBe("#");
  });

  it("increment by .1 (edge)", () => {
    expect(after(asPos("~"))).toBe("~!"); // e.g. after(.9) => .91
    expect(after(asPos("~~~"))).toBe("~~~!"); // e.g. after(.999) => .9991
  });

  it("always output valid positions", () => {
    fc.assert(
      fc.property(
        validAndInvalidPosition(),

        (pos) => {
          const output = after(asPos(pos));
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
          const output = before(asPos(pos));
          expect(output).toMatch(posRegex);
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
        validAndInvalidPosition(),

        (pos) => {
          expect(() => between(pos, pos)).toThrow();
        }
      )
    );
  });

  it("can flip arguments", () => {
    fc.assert(
      fc.property(
        validPosition(),
        validPosition(),

        (pos1, pos2) => {
          if (pos1 !== pos2) {
            expect(between(pos1, pos2)).toBe(between(pos2, pos1));
          }
        }
      )
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
  test("No children", () =>
    testPosition(undefined, undefined, pos([(min + 1) as Code])));

  test("Insert after .1", () =>
    testPosition(
      pos([(min + 1) as Code]),
      undefined,
      pos([(min + 2) as Code])
    ));

  test("Insert before .9", () =>
    testPosition(undefined, pos([max]), pos([(max - 1) as Code])));

  test("Insert after .9", () =>
    testPosition(pos([max]), undefined, pos([max, (min + 1) as Code])));

  test("Insert before .1", () =>
    testPosition(undefined, pos([(min + 1) as Code]), pos([min, max])));

  test("Insert between .1 and .3", () =>
    testPosition(
      pos([(min + 1) as Code]),
      pos([(min + 3) as Code]),
      pos([(min + 2) as Code])
    ));

  test("Insert between .1 and .5", () =>
    testPosition(
      pos([(min + 1) as Code]),
      pos([(min + 5) as Code]),
      pos([(min + 3) as Code])
    ));

  test("Insert between .1 and .4", () =>
    testPosition(
      pos([(min + 1) as Code]),
      pos([(min + 4) as Code]),
      pos([(min + 2) as Code])
    ));

  test("Insert between .1 and .2", () =>
    testPosition(
      pos([(min + 1) as Code]),
      pos([(min + 2) as Code]),
      pos([(min + 1) as Code, mid as Code])
    ));

  test("Insert between .11 and .12", () =>
    testPosition(
      pos([(min + 1) as Code, (min + 1) as Code]),
      pos([(min + 1) as Code, (min + 2) as Code]),
      pos([(min + 1) as Code, (min + 1) as Code, mid as Code])
    ));

  test("Insert between .09 and .1 should .095", () =>
    testPosition(
      pos([min, max]),
      pos([(min + 1) as Code]),
      pos([min, max, mid as Code])
    ));

  test("Insert between .19 and .21 should be .195", () =>
    testPosition(
      pos([(min + 1) as Code, max]),
      pos([(min + 2) as Code, (min + 1) as Code]),
      pos([(min + 1) as Code, max, mid as Code])
    ));

  test("Insert between .11 and .21 should be .15", () =>
    testPosition(
      pos([(min + 1) as Code, (min + 1) as Code]),
      pos([(min + 2) as Code, (min + 1) as Code]),
      pos([(min + 1) as Code, ((min + 1 + max) >> 1) as Code])
    ));
});

describe("comparePosition", () => {
  it("basics", () => {
    expect(comparePosition(asPos("1"), asPos("2"))).toBeLessThan(0);
    expect(comparePosition(asPos("!"), asPos("~~"))).toBeLessThan(0);
    expect(comparePosition(asPos("11111"), asPos("11"))).toBeGreaterThan(0);
  });

  it("throws when equal", () => {
    fc.assert(
      fc.property(
        validAndInvalidPosition(),

        (pos) => {
          expect(() => comparePosition(pos, pos)).toThrow();
        }
      )
    );
  });

  it("inverted comparison leads to opposite result", () => {
    fc.assert(
      fc.property(
        validAndInvalidPosition(),
        validAndInvalidPosition(),

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
