import type { Document, Node } from "../../ast";
import type { ParserOptions } from "..";
import { parseDocument as originalParseDocument } from "..";

type Value = string | number | boolean | null | undefined | Node | Value[];

describe("helpers", () => {
  it("ignores me", () => {
    // Just here to avoid the "Your test suite must contain at least one
    // test" Jest error.
  });
});

/**
 * This will strip out any range information the parser collected on nodes,
 * since we're not interested in testing those specific values.
 */
function stripRanges_(value: Value): Value {
  if (
    value === null ||
    value === undefined ||
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return value;
  } else if (Array.isArray(value)) {
    return value.map((x) => stripRanges_(x));
  } else {
    const rv = {};
    for (const key of Object.keys(value)) {
      if (key === "range") {
        // @ts-expect-error: Property `range` does not exist on `rv`
        rv.range = undefined;
        continue;
      }

      // @ts-expect-error: rv[key] is too dynamic
      rv[key] = stripRanges_(
        // @ts-expect-error value[key] is implicitly any
        value[key]
      );
    }

    return rv as Node;
  }
}

/**
 * This will strip out any range information the parser collected on nodes,
 * since we're not interested in testing those specific values.
 */
function stripRanges<T extends Node | Node[]>(node: T): T {
  return stripRanges_(node) as T;
}

//
// Custom parse helpers (that parse, but also remove all range information),
// for easier comparison with Jest .toEqual() assertions.
//

export function parseDocument(src: string, options?: ParserOptions): Document {
  return stripRanges(originalParseDocument(src, options));
}

///
/// Custom expecters
///

export function expectDocument(
  src: string,
  expected: Node,
  options?: ParserOptions
): void {
  try {
    return expect(parseDocument(src, options)).toEqual(stripRanges(expected));
  } catch (error: unknown) {
    // Trick from https://kentcdodds.com/blog/improve-test-error-messages-of-your-abstractions
    Error.captureStackTrace(error as Error, expectDocument);
    throw error;
  }
}

export function expectLegacyDocument(src: string, expected: Node): void {
  return expectDocument(src, expected, { allowLegacyBuiltins: true });
}
