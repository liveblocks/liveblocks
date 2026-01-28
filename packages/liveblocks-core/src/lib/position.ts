/**
 * Positions, aka the Pos type, are efficient encodings of "positions" in
 * a list, using the following printable subset of the ASCII alphabet:
 *
 *    !"#$%&'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\]^_`abcdefghijklmnopqrstuvwxyz{|}~
 *   ^                                                                                             ^
 *   Lowest digit                                                                      Highest digit
 *
 * Each Pos is a sequence of characters from the above alphabet, conceptually
 * codifying a floating point number 0 < n < 1. For example, the string "31007"
 * would be used to represent the number 0.31007, except that this
 * representation uses base 96.
 *
 *   0 ≃ ' '  (lowest digit)
 *   1 ≃ '!'
 *   2 ≃ '"'
 *   ...
 *   9 ≃ '~'  (highest digit)
 *
 * So think:
 *   '!'    ≃ 0.1
 *   '"'    ≃ 0.2
 *   '!"~'  ≃ 0.129
 *
 * Three rules:
 * - All "characters" in the string should be valid digits (from the above
 *   alphabet)
 * - The value 0.0 is not a valid Pos value
 * - A Pos cannot have trailing "zeroes"
 *
 * This representation has the following benefits:
 *
 * 1. It's always possible to get a number that lies before, after, or between
 *    two arbitrary Pos values.
 * 2. Pos values can be compared using normal string comparison.
 *
 * Some examples:
 * - '!'  < '"'   (like how .1  < .2)
 * - '!'  < '~'   (like how .1  < .9)
 * - '!!' < '!~'  (like how .11 < .19)
 * - '~!' < '~~'  (like how .91 < .99)
 * - '~'  < '~!'  (like how .9  < .91)
 * - '!!' < '!O'  (like how .1  < .5)
 * - '!O' < '!~'  (like how .5  < .9)
 *
 */
import type { Brand } from "./utils";

/**
 * A valid/verified "position" string. These values are used as "parentKey"s by
 * LiveList children, and define their relative ordering.
 */
export type Pos = Brand<string, "Pos">;

const MIN_CODE = 32; // ASCII code of the lowest alphabet char (e.g. ' ')
const MAX_CODE = 126; // ASCII code of the highest alphabet char (e.g. '~')

const NUM_DIGITS = MAX_CODE - MIN_CODE + 1; // 95

const ZERO: string = nthDigit(0); // " "

/**
 * The "first" canonical position.
 * In an equivalent decimal number system, think of this as the value .1.
 */
const ONE: Pos = nthDigit(1); // "!"

const ZERO_NINE = (ZERO + nthDigit(-1)) as Pos;

/**
 * Returns the Pos value for the nth digit in the alphabet.
 * Value must be between 0 and 94.
 *
 * Just used to generate some static data, and for usage in test cases.
 */
function nthDigit(n: 0): string; // "0" is a legal _digit_, but not a legal Pos value
function nthDigit(n: number): Pos;
function nthDigit(n: number): Pos {
  const code = MIN_CODE + (n < 0 ? NUM_DIGITS + n : n);
  if (code < MIN_CODE || code > MAX_CODE) {
    throw new Error(`Invalid n value: ${n}`);
  }
  return String.fromCharCode(code) as Pos;
}

/**
 * Given two positions, returns the position value that lies in the middle.
 * When given only a high bound, computes the canonical position "before" it.
 * When given only a low bound, computes the canonical position "after" it.
 * When given no bounds at all, returns the "first" canonical position.
 */
function makePosition(x?: Pos, y?: Pos): Pos {
  if (x !== undefined && y !== undefined) {
    return between(x, y);
  } else if (x !== undefined) {
    return after(x);
  } else if (y !== undefined) {
    return before(y);
  } else {
    return ONE;
  }
}

/**
 * Given any position value, computes the canonical position "before" it.
 *
 * The equivalent in a decimal number system would be:
 *   before(.1)     // .09
 *   before(.11)    // .1
 *   before(.111)   // .1
 *   before(.2)     // .1
 *   before(.23101) // .2
 *   before(.3)     // .2
 *   ...
 *   before(.8)     // .7
 *   before(.9)     // .8
 *   before(.91)    // .9
 *   before(.92)    // .9
 *   before(.93)    // .9
 *   ...
 *   before(.98)    // .9
 *   before(.99)    // .9
 *
 * Note:
 *   before(.01)    // .009
 *   before(.001)   // .0009
 *   before(.002)   // .001
 *   before(.00283) // .002
 *
 */
function before(pos: Pos): Pos {
  const lastIndex = pos.length - 1;
  for (let i = 0; i <= lastIndex; i++) {
    const code = pos.charCodeAt(i);

    // Scan away all leading zeros, if there are any
    if (code <= MIN_CODE) {
      continue;
    }

    //
    // Now, i points to the first non-zero digit
    //
    // Two options:
    // 1. It's the last digit.
    //    a. If it's a 1, it's on the edge. Replace with "09".
    //    b. Otherwise, just lower it.
    // 2. It's not the last digit, so we can just chop off the remainder.
    //
    if (i === lastIndex) {
      if (code === MIN_CODE + 1) {
        return (pos.substring(0, i) + ZERO_NINE) as Pos;
      } else {
        return (pos.substring(0, i) + String.fromCharCode(code - 1)) as Pos;
      }
    } else {
      return pos.substring(0, i + 1) as Pos;
    }
  }

  // If we end up here, it means the input consisted of only zeroes, which is
  // invalid, so return the canonical first value as a best effort
  return ONE;
}

/**
 * Given any position value, computes the canonical position "after" it.
 *
 * Uses "viewport-based allocation" (V=2+3) to bound position length growth
 * when repeatedly pushing items. Instead of always incrementing the last digit
 * (which leads to O(n/94) length growth), we treat positions as fixed-width
 * numbers within a "viewport" of V digits.
 *
 * - V=2: positions stay ≤2 chars for first ~8,900 pushes
 * - V=5: positions stay ≤5 chars for next ~848k pushes
 * - V=8, V=11, ...: each +3 adds capacity for ~848k more pushes
 *
 * This keeps position lengths dramatically smaller for typical usage while
 * remaining backward compatible with all existing position strings.
 *
 * Viewport growth: V=2 → V=5 → V=8 → V=11 → ...
 *
 * Examples (conceptually in decimal):
 *   after(.1)  // .11 (within V=2 viewport)
 *   after(.11) // .12
 *   after(.99) // .99001 (overflow V=2, extend to V=5)
 *
 */
const VIEWPORT_START = 2;
const VIEWPORT_STEP = 3;

function after(pos: Pos): Pos {
  // For positions with any chars outside valid range, just append ONE.
  // This guarantees result > pos for any input string.
  for (let i = 0; i < pos.length; i++) {
    const code = pos.charCodeAt(i);
    if (code < MIN_CODE || code > MAX_CODE) {
      return (pos + ONE) as Pos;
    }
  }

  // Strip trailing zeros for canonical form
  while (pos.length > 1 && pos.charCodeAt(pos.length - 1) === MIN_CODE) {
    pos = pos.slice(0, -1) as Pos;
  }

  // Handle empty/zero input
  if (pos.length === 0 || pos === ZERO) {
    return ONE;
  }

  // Determine viewport: V=2, then 5, 8, 11, ...
  let viewport = VIEWPORT_START;
  if (pos.length > VIEWPORT_START) {
    viewport =
      VIEWPORT_START +
      Math.ceil((pos.length - VIEWPORT_START) / VIEWPORT_STEP) * VIEWPORT_STEP;
  }

  // Try to increment within current viewport
  const result = incrementWithinViewport(pos, viewport);
  if (result !== null) {
    return result;
  }

  // Overflow: extend viewport and increment
  viewport += VIEWPORT_STEP;
  const extendedResult = incrementWithinViewport(pos, viewport);
  if (extendedResult !== null) {
    return extendedResult;
  }

  // Fallback (should rarely happen): just append
  return (pos + ONE) as Pos;
}

/**
 * Increment a position string within a fixed viewport width.
 * Returns null if overflow occurs (all digits were at max).
 */
function incrementWithinViewport(pos: Pos, viewport: number): Pos | null {
  // Build array of digit values, padded to viewport width
  const digits: number[] = [];
  for (let i = 0; i < viewport; i++) {
    if (i < pos.length) {
      digits.push(pos.charCodeAt(i) - MIN_CODE);
    } else {
      digits.push(0); // Pad with zeros
    }
  }

  // Increment from right to left with carry
  let carry = 1;
  for (let i = viewport - 1; i >= 0 && carry; i--) {
    const sum = digits[i] + carry;
    if (sum >= NUM_DIGITS) {
      digits[i] = 0;
      carry = 1;
    } else {
      digits[i] = sum;
      carry = 0;
    }
  }

  // If carry remains, we overflowed the viewport
  if (carry) {
    return null;
  }

  // Convert back to string, stripping trailing zeros
  let result = "";
  for (const d of digits) {
    result += String.fromCharCode(d + MIN_CODE);
  }

  // Strip trailing zeros
  while (result.length > 1 && result.charCodeAt(result.length - 1) === MIN_CODE) {
    result = result.slice(0, -1);
  }

  return result as Pos;
}

/**
 * Given two positions, returns the position value that lies in the middle.
 *
 * Think:
 *   between('!', '%')  // '#'    (like how between(.1, .5) would be .3)
 *   between('!', '"')  // '!O'   (like how between(.1, .2) would be .15)
 *
 *   between(.1, .3)      // .2
 *   between(.1, .4)      // also .2
 *   between(.1, .5)      // .3
 *   between(.11, .21)    // .15
 *   between(.1,  .1003)  // .1001
 *   between(.11, .12)    // .115
 *   between(.09, .1)     // .095
 *   between(.19, .21)    // .195
 *
 */
function between(lo: Pos, hi: Pos): Pos {
  if (lo < hi) {
    return _between(lo, hi);
  } else if (lo > hi) {
    return _between(hi, lo);
  } else {
    throw new Error("Cannot compute value between two equal positions");
  }
}

/**
 * Like between(), but guaranteed that lo < hi.
 */
function _between(lo: Pos, hi: Pos | ""): Pos {
  let index = 0;

  const loLen = lo.length;
  const hiLen = hi.length;
  while (true) {
    const loCode = index < loLen ? lo.charCodeAt(index) : MIN_CODE;
    const hiCode = index < hiLen ? hi.charCodeAt(index) : MAX_CODE;

    if (loCode === hiCode) {
      index++;
      continue;
    }

    // Difference of only 1 means we'll have to settle this in the next digit
    if (hiCode - loCode === 1) {
      const size = index + 1;
      let prefix = lo.substring(0, size);
      if (prefix.length < size) {
        prefix += ZERO.repeat(size - prefix.length);
      }
      const suffix = lo.substring(size) as Pos;
      const nines = ""; // Will get interpreted like .999999…
      return (prefix + _between(suffix, nines)) as Pos;
    } else {
      // Difference of more than 1 means we take the "middle" between these digits
      return (takeN(lo, index) +
        String.fromCharCode((hiCode + loCode) >> 1)) as Pos;
    }
  }
}

function takeN(pos: string, n: number): string {
  return n < pos.length
    ? pos.substring(0, n)
    : pos + ZERO.repeat(n - pos.length);
}

const MIN_NON_ZERO_CODE = MIN_CODE + 1;

/**
 * Checks whether a given string is a valid Pos value. There are three rules:
 *
 *   - The string must not be the empty string
 *   - The string must not have any trailing "zeroes" (trailing " ")
 *   - All characters in the string must be from our alphabet
 *
 */
function isPos(str: string): str is Pos {
  // May not be empty string
  if (str === "") {
    return false;
  }

  // Last digit may not be a "0" (no trailing zeroes)
  const lastIdx = str.length - 1;
  const last = str.charCodeAt(lastIdx);
  if (last < MIN_NON_ZERO_CODE || last > MAX_CODE) {
    return false;
  }

  for (let i = 0; i < lastIdx; i++) {
    const code = str.charCodeAt(i);
    if (code < MIN_CODE || code > MAX_CODE) {
      return false;
    }
  }

  return true;
}

function convertToPos(str: string): Pos {
  const codes: number[] = [];

  // All chars in the string must be in the min-max range
  for (let i = 0; i < str.length; i++) {
    const code = str.charCodeAt(i);

    // Clamp to min-max range
    codes.push(code < MIN_CODE ? MIN_CODE : code > MAX_CODE ? MAX_CODE : code);
  }

  // Strip all trailing zeros
  while (codes.length > 0 && codes[codes.length - 1] === MIN_CODE) {
    codes.length--;
  }

  return codes.length > 0
    ? (String.fromCharCode(...codes) as Pos)
    : // Edge case: the str was a 0-only string, which is invalid. Default back to .1
      ONE;
}

/**
 * Checks that a str is a valid Pos, and converts it to the nearest valid one
 * if not.
 */
function asPos(str: string): Pos {
  // Calling convertToPos(str) would suffice here, but since this is a hot code
  // path, we prefer to just check, which is a lot faster.
  return isPos(str) ? str : convertToPos(str);
}

export { asPos, makePosition };

// For use in unit tests only
export {
  after as __after,
  before as __before,
  between as __between,
  isPos as __isPos,
  nthDigit as __nthDigit,
  NUM_DIGITS as __NUM_DIGITS,
};
