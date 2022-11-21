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

/**
 * A valid/verified "position" string. These values are used as "parentKey"s by
 * LiveList children, and define their relative ordering.
 */
export type Pos = string & { _brand: "Pos" };

const minCode = 32;
const maxCode = 126;

const NUM_DIGITS = maxCode - minCode + 1;

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
  const code = minCode + (n < 0 ? NUM_DIGITS + n : n);
  if (code < minCode || code > maxCode) {
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
  return x !== undefined && y !== undefined
    ? between(x, y)
    : x !== undefined
    ? after(x)
    : y !== undefined
    ? before(y)
    : ONE;
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
    if (code <= minCode) {
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
      if (code === minCode + 1) {
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
 * The equivalent in a decimal number system would be:
 *   after(.001)  // .1
 *   after(.1)    // .2
 *   after(.101)  // .2
 *   after(.2)    // .3
 *   after(.3)    // .4
 *   ...
 *   after(.8)    // .9
 *   after(.9)    // .91
 *   after(.91)   // .92
 *   after(.9123) // .92
 *   ...
 *   after(.98)   // .99
 *   after(.99)   // .991
 *   after(.9999) // .99991
 *
 */
function after(pos: Pos): Pos {
  for (let i = 0; i <= pos.length - 1; i++) {
    const code = pos.charCodeAt(i);

    // Scan away all leading "nines", if there are any
    if (code >= maxCode) {
      continue;
    }

    // Now, i points to the first non-"nine" digit
    return (pos.substring(0, i) + String.fromCharCode(code + 1)) as Pos;
  }

  // If we end up here, it means the input consisted of only "nines", means we
  // can just append a ONE digit.
  return (pos + ONE) as Pos;
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
    return _between(lo, hi) as Pos;
  } else if (lo > hi) {
    return _between(hi, lo) as Pos;
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
    const loCode = index < loLen ? lo.charCodeAt(index) : minCode;
    const hiCode = index < hiLen ? hi.charCodeAt(index) : maxCode;

    if (loCode === hiCode) {
      index++;
      continue;
    }

    // Difference of only 1 means we'll have to settle this in the next digit
    if (hiCode - loCode === 1) {
      const prefix = lo.substring(0, index + 1);
      const suffix = lo.substring(index + 1) as Pos;
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

/**
 * Okay, this regex may need a little explanation.
 *
 * It checks whether a given string is a valid Pos value. There are three
 * rules:
 *
 *   - All characters in the string must be from our alphabet
 *   - The string must not have any trailing "zeroes" (trailing " ")
 *   - The string must not be the empty string
 *
 * The first range [\x20-\x7E] checks whether all characters are from the
 * alphabet. Here, \x20 = 32 (min), and \x7E = 126 (max).
 *
 * In the second range, we check [\x21-\x7E], which excludes the " " char
 * (\x20). This ensures there are no trailing zeroes, _and_ ensures the string
 * is non-empty.
 *
 * Using this regex is faster than iterating over the string
 * character-by-character and checking ranges.
 */
const posRegex = /^[\x20-\x7E]*[\x21-\x7E]$/;
//                 ^^^^^^^^^^^ ^^^^^^^^^^^
//                     (1)         (2)

function isPos(str: string): str is Pos {
  return posRegex.test(str);
}

function convertToPos(str: string): Pos {
  const codes: number[] = [];

  // All chars in the string must be in the min-max range
  for (let i = 0; i < str.length; i++) {
    const code = str.charCodeAt(i);

    // Clamp to min-max range
    codes.push(code < minCode ? minCode : code > maxCode ? maxCode : code);
  }

  // Strip all trailing zeros
  while (codes.length > 0 && codes[codes.length - 1] === minCode) {
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

function comparePosition(posA: Pos, posB: Pos): number {
  return posA === posB ? 0 : posA < posB ? -1 : 1;
}

export { asPos, comparePosition, makePosition };

// For use in unit tests only
export {
  after as __after,
  before as __before,
  between as __between,
  isPos as __isPos,
  nthDigit as __nthDigit,
  NUM_DIGITS as __NUM_DIGITS,
};
