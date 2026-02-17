/**
 * Behavioral equivalence tests for makePosition.
 *
 * Runs the same makePosition test cases against both the direct JS
 * implementation and the wasm-adapter, verifying identical results.
 */
import { afterEach, describe, expect, test } from "vitest";

import { getTestEngines, resetEngine } from "./setup";

// Digit constants matching position.ts internals (base-96, ASCII 32-126)
// IMPORTANT: SEVEN/EIGHT/NINE are the LAST digits (not the 7th/8th/9th)
const ZERO = " ";
const ONE = "!";
const TWO = '"';
const THREE = "#";
const FOUR = "$";
const FIVE = "%";
const SEVEN = "|"; // nthDigit(-3) = char 124
const EIGHT = "}"; // nthDigit(-2) = char 125
const NINE = "~"; // nthDigit(-1) = char 126
const MID = "O"; // nthDigit(NUM_DIGITS >> 1) = nthDigit(47) = char 79

afterEach(() => {
  resetEngine();
});

for (const engine of getTestEngines()) {
  describe(`makePosition [${engine.name}]`, () => {
    test("default/first position is .1", () => {
      expect(engine.makePosition(undefined, undefined)).toBe(ONE);
    });

    test("after .1 lies .2", () => {
      expect(engine.makePosition(ONE, undefined)).toBe(TWO);
    });

    test("before .9 lies .8", () => {
      expect(engine.makePosition(undefined, NINE)).toBe(EIGHT);
    });

    test("after .9 lies .91", () => {
      expect(engine.makePosition(NINE, undefined)).toBe(NINE + ONE);
    });

    test("before .1 lies .09", () => {
      expect(engine.makePosition(undefined, ONE)).toBe(ZERO + NINE);
    });

    test("between .1 and .11 lies .105", () => {
      expect(engine.makePosition(ONE, ONE + ONE)).toBe(ONE + ZERO + MID);
    });

    test("between .1 and .3 lies .2", () => {
      expect(engine.makePosition(ONE, THREE)).toBe(TWO);
    });

    test("between .1 and .5 lies .3", () => {
      expect(engine.makePosition(ONE, FIVE)).toBe(THREE);
    });

    test("between .1 and .4 lies .2", () => {
      expect(engine.makePosition(ONE, FOUR)).toBe(TWO);
    });

    test("between .1 and .2 lies .15", () => {
      expect(engine.makePosition(ONE, TWO)).toBe(ONE + MID);
    });

    test("between .1 and .12 lies .11", () => {
      expect(engine.makePosition(ONE, ONE + TWO)).toBe(ONE + ONE);
    });

    test("between .1 and .102 lies .101", () => {
      expect(engine.makePosition(ONE, ONE + ZERO + TWO)).toBe(
        ONE + ZERO + ONE
      );
    });

    test("between .1 and .1003 lies .1001", () => {
      expect(
        engine.makePosition(ONE, ONE + ZERO + ZERO + THREE)
      ).toBe(ONE + ZERO + ZERO + ONE);
    });

    test("between .11 and .12 lies .115", () => {
      expect(engine.makePosition(ONE + ONE, ONE + TWO)).toBe(
        ONE + ONE + MID
      );
    });

    test("between .09 and .1 should .095", () => {
      expect(engine.makePosition(ZERO + NINE, ONE)).toBe(
        ZERO + NINE + MID
      );
    });

    test("between .19 and .21 should be .195", () => {
      expect(engine.makePosition(ONE + NINE, TWO + ONE)).toBe(
        ONE + NINE + MID
      );
    });

    test("between .177 and .21 should be .18", () => {
      expect(
        engine.makePosition(ONE + SEVEN + SEVEN, TWO + ONE)
      ).toBe(ONE + EIGHT);
    });

    test("between .188 and .21 should be .189...", () => {
      expect(
        engine.makePosition(ONE + EIGHT + EIGHT, TWO + ONE)
      ).toBe(ONE + EIGHT + EIGHT + MID);
    });

    test("between .11 and .21 should be .15", () => {
      expect(engine.makePosition(ONE + ONE, TWO + ONE)).toBe(
        ONE + MID
      );
    });
  });
}

describe("makePosition cross-engine equivalence", () => {
  const engines = getTestEngines();

  const testCases: [string | undefined, string | undefined][] = [
    [undefined, undefined],
    [ONE, undefined],
    [undefined, NINE],
    [NINE, undefined],
    [undefined, ONE],
    [ONE, THREE],
    [ONE, FIVE],
    [ONE, TWO],
    [ONE, ONE + ONE],
    [ONE, ONE + TWO],
    [ONE + ONE, ONE + TWO],
    [ZERO + NINE, ONE],
    [ONE + NINE, TWO + ONE],
    [ONE + SEVEN + SEVEN, TWO + ONE],
    [ONE + EIGHT + EIGHT, TWO + ONE],
    [ONE + ONE, TWO + ONE],
  ];

  for (const [before, after] of testCases) {
    const label = `(${before ?? "undefined"}, ${after ?? "undefined"})`;
    test(`all engines agree on makePosition${label}`, () => {
      const results = engines.map((e) => e.makePosition(before, after));
      for (let i = 1; i < results.length; i++) {
        expect(results[i]).toBe(results[0]);
      }
    });
  }
});
