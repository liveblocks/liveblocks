/**
 * Positions are efficient encodings of "positions" in a list, using the
 * following subset of the ASCII alphabet:
 *
 *    !"#$%&'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\]^_`abcdefghijklmnopqrstuvwxyz{|}~
 *   ^                                                                                             ^
 *   min                                                                                         max
 *
 * Just like with floating point numbers, there is an order to these values,
 * and it's always possible to inject a number between two arbitrary position
 * values.
 *
 * Some facts/examples:
 * - ! < "    (like how  .1 < .2)
 * - ! < ~    (like how  .1 < .9)
 * - !! < !~  (like how .11 < .19)
 * - ~! < ~~  (like how .91 < .99)
 * - ~! > ~   (like how .91 > .9)
 * - !! < !O  (like how .1 < .5)
 * - !O < !~  (like how .5 < .9)
 *
 * - `~! is greater than `~` (similarly to how 9.1 is greater than 9)
 *
 * Weird maybe:
 * - ` ` is less than `!`    (you can think of ` ` as going into negative number territory)
 *
 */

/**
 * A valid "position" string. These values are used as "parentKey"s by LiveList
 * children, and define their relative ordering.
 *
 * A position string consists of 1 or more "digits", which should be thought of
 * as the tail of digits in a floating point number between 0 and 1. The
 * alphabet is equivalent to the numerical "alphabet" 0-9:
 *   0 ≃ ' '
 *   1 ≃ '!'
 *   2 ≃ '"'
 *   ...
 *   9 ≃ '~'
 *
 * Then, think:
 *   '!'    ≃ 0.1
 *   '"'    ≃ 0.2
 *   '!"~'  ≃ 0.129
 *
 */
export type Pos = string & { _brand: "Pos" };

/**
 * The integer value between 32 and 126, representing each character in a valid
 * Pos string numerically.
 */
type Code = number & { _brand: "Code" };

const min = 32 as Code;
const max = 126 as Code;

const ZERO: Pos = pos([min as Code]); // " "

/**
 * The "first" canonical position.
 * In an equivalent decimal number system, think of this as the value .1.
 */
const ONE: Pos = pos([(min + 1) as Code]); // "!"

/**
 * Given two positions, returns the position value that lies in the middle.
 * When given only a `hi` bound, computes the canonical position "before" it.
 * When given only a `lo` bound, computes the canonical position "after" it.
 * When given no bounds at all, returns the "first" canonical position.
 */
function makePosition(lo?: Pos, hi?: Pos): Pos {
  return lo !== undefined && hi !== undefined
    ? between(lo, hi)
    : lo !== undefined
    ? after(lo)
    : hi !== undefined
    ? before(hi)
    : ONE;
}

/**
 * Given any position value, computes the canonical position "before" it.
 *
 * The equivalent in a decimal number system would be:
 *   before(.1)   // .09
 *   before(.2)   // .1
 *   before(.3)   // .2
 *   ...
 *   before(.8)   // .7
 *   before(.9)   // .8
 *   before(.91)  // .909
 *   before(.92)  // .91
 *   before(.93)  // .92
 *   ...
 *   before(.98)  // .97
 *   before(.99)  // .98
 *
 * Note:
 *   before(.01)   // .009
 *   before(.001)  // .0009
 *
 */
function before(value: Pos): Pos {
  const result: Code[] = [];
  const afterCodes = toCodes(value);
  for (let i = 0; i < afterCodes.length; i++) {
    const code = afterCodes[i];

    if (code <= min + 1) {
      result.push(min);
      if (afterCodes.length - 1 === i) {
        result.push(max);
        break;
      }
    } else {
      result.push(
        // Here, `code > min + 1`, so safe to cast to Code
        (code - 1) as Code
      );
      break;
    }
  }

  return pos(result);
}

/**
 * Given any position value, computes the canonical position "after" it.
 *
 * The equivalent in a decimal number system would be:
 *   after(.1)   // .2
 *   after(.2)   // .3
 *   after(.3)   // .4
 *   ...
 *   after(.8)   // .9
 *   after(.9)   // .91
 *   after(.91)  // .92
 *   after(.92)  // .93
 *   after(.93)  // .94
 *   ...
 *   after(.98)  // .99
 *   after(.99)  // .991
 *
 */
function after(value: Pos): Pos {
  const result: Code[] = [];
  const beforeCodes = toCodes(value);
  for (let i = 0; i < beforeCodes.length; i++) {
    const code = beforeCodes[i];

    if (code === max) {
      result.push(code);
      if (beforeCodes.length - 1 === i) {
        result.push(
          // Guaranteed to be within the min-max range, so safe to cast to Code
          (min + 1) as Code
        );
        break;
      }
    } else {
      // Here, `code >= min && code < max`, so safe to cast
      result.push((code + 1) as Code);
      break;
    }
  }

  return pos(result);
}

/**
 * Given two positions, returns the position value that lies in the middle.
 *
 * Think:
 *   between('!', '%')  // '#'    (like how between(.1, .5) would be .3)
 *   between('!', '"')  // '!O'   (like how between(.1, .2) would be .15)
 *
 */
function between(first: Pos, second: Pos): Pos {
  if (first === second) {
    throw new Error("Cannot compute value between two equal positions");
  } else if (first < second) {
    return pos(makePositionFromCodes(toCodes(first), toCodes(second)));
  } else {
    return pos(makePositionFromCodes(toCodes(second), toCodes(first)));
  }
}

function makePositionFromCodes(lo: Code[], hi: Code[]): Code[] {
  let index = 0;
  const result: Code[] = [];

  while (true) {
    const beforeDigit = lo[index] ?? min;
    const afterDigit = hi[index] ?? max;

    // istanbul ignore if
    if (beforeDigit > afterDigit) {
      throw new Error(
        `Impossible to generate position between ${lo} and ${hi}`
      );
    }

    if (beforeDigit === afterDigit) {
      result.push(beforeDigit);
      index++;
      continue;
    }

    if (afterDigit - beforeDigit === 1) {
      result.push(beforeDigit);
      result.push(...makePositionFromCodes(lo.slice(index + 1), []));
      break;
    }

    const mid = ((afterDigit + beforeDigit) >> 1) as Code;
    result.push(mid);
    break;
  }

  return result;
}

function isCode(n: number): n is Code {
  return n >= min && n <= max;
}

function isPos(str: string): str is Pos {
  // All chars in the string must be in the min-max range
  for (let i = 0; i < str.length; i++) {
    const code = str.charCodeAt(i);
    if (!isCode(code)) {
      return false;
    }
  }

  // Additionally, the string must not be empty and cannot end in "trailing
  // zeroes"
  return str.length > 0 && str[str.length - 1] !== ZERO;
}

function convertToPos(str: string): Pos {
  const codes: Code[] = [];

  // All chars in the string must be in the min-max range
  for (let i = 0; i < str.length; i++) {
    const code = str.charCodeAt(i);

    // Clamp to min-max range
    codes.push(code < min ? min : code > max ? max : (code as Code));
  }

  // Strip all trailing zeros
  while (codes.length > 0 && codes[codes.length - 1] === min) {
    codes.length--;
  }

  return codes.length > 0
    ? pos(codes)
    : // Edge case: the str was a 0-only string, which is invalid. Default back to .1
      ONE;
}

/**
 * Checks that a str is a valid Pos, and converts it to the nearest valid one
 * if not.
 */
function asPos(str: string): Pos {
  // This is a hot code path, so we prefer to only check the value and not
  // compute it, unless it's invalid (which should never happen under normal
  // circumstances)
  return isPos(str) ? str : convertToPos(str);
}

function toCodes(str: Pos): Code[] {
  const codes: Code[] = [];
  for (let i = 0; i < str.length; i++) {
    codes.push(
      // Guaranteed to be a valid Code
      str.charCodeAt(i) as Code
    );
  }
  return codes;
}

function pos(codes: Code[]): Pos {
  return String.fromCharCode(...codes) as Pos;
}

function comparePosition(posA: Pos, posB: Pos): number {
  const aCodes = toCodes(posA);
  const bCodes = toCodes(posB);

  const maxLength = Math.max(aCodes.length, bCodes.length);

  for (let i = 0; i < maxLength; i++) {
    const a = aCodes[i] === undefined ? min : aCodes[i];
    const b = bCodes[i] === undefined ? min : bCodes[i];

    if (a === b) {
      continue;
    } else {
      return a - b;
    }
  }

  throw new Error(
    `Impossible to compare similar position "${posA}" and "${posB}"`
  );
}

export { asPos, comparePosition, makePosition };

// For unit tests only
export {
  after as __after,
  before as __before,
  between as __between,
  max as __max,
  min as __min,
  ONE as __ONE,
  pos as __pos,
  toCodes as __posCodes,
  ZERO as __ZERO,
};

export type { Code as __Code };
