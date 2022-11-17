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

const min = 32; // " ", think 0 (zero)
const max = 126; // "~", think 9 (nine)

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
type Pos = string;

/**
 * The "first" canonical position.
 * In an equivalent decimal number system, think of this as the value .1.
 */
const first: Pos = "!"; // = pos([min + 1])

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
    : first;
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
  const result = [];
  const afterCodes = posCodes(value);
  for (let i = 0; i < afterCodes.length; i++) {
    const code = afterCodes[i];

    if (code <= min + 1) {
      result.push(min);
      if (afterCodes.length - 1 === i) {
        result.push(max);
        break;
      }
    } else {
      result.push(code - 1);
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
  const result = [];
  const beforeCodes = posCodes(value);
  for (let i = 0; i < beforeCodes.length; i++) {
    const code = beforeCodes[i];

    if (code === max) {
      result.push(code);
      if (beforeCodes.length - 1 === i) {
        result.push(min + 1);
        break;
      }
    } else {
      result.push(code + 1);
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
function between(before: Pos, after: Pos): Pos {
  return pos(makePositionFromCodes(posCodes(before), posCodes(after)));
}

function makePositionFromCodes(before: number[], after: number[]): number[] {
  let index = 0;
  const result = [];

  while (true) {
    const beforeDigit: number = before[index] || min;
    const afterDigit: number = after[index] || max;

    // istanbul ignore if
    if (beforeDigit > afterDigit) {
      throw new Error(
        `Impossible to generate position between ${before} and ${after}`
      );
    }

    if (beforeDigit === afterDigit) {
      result.push(beforeDigit);
      index++;
      continue;
    }

    if (afterDigit - beforeDigit === 1) {
      result.push(beforeDigit);
      result.push(...makePositionFromCodes(before.slice(index + 1), []));
      break;
    }

    const mid = (afterDigit + beforeDigit) >> 1;
    result.push(mid);
    break;
  }

  return result;
}

function posCodes(str: string): number[] {
  const codes: number[] = [];
  for (let i = 0; i < str.length; i++) {
    codes.push(str.charCodeAt(i));
  }
  return codes;
}

function pos(codes: number[]): Pos {
  return String.fromCharCode(...codes);
}

function comparePosition(posA: Pos, posB: Pos): number {
  const aCodes = posCodes(posA);
  const bCodes = posCodes(posB);

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

export { comparePosition, makePosition };

// For unit tests only
export {
  after as __after,
  before as __before,
  between as __between,
  first as __first,
  max as __max,
  min as __min,
  pos as __pos,
  posCodes as __posCodes,
};
