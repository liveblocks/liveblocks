import type { Document, Node, TypeExpr } from "../../ast";
import { parseGrammarRule } from "..";

type Value = string | number | boolean | null | void | Node | Value[];

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
        // @ts-expect-error
        rv.range = undefined;
        continue;
      }

      // @ts-expect-error
      rv[key] = stripRanges_(value[key]);
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

export function parseDocument(src: string): Document {
  return stripRanges(parseGrammarRule(src, "Document") as Document);
}

function parseTypeExpr(src: string): TypeExpr {
  return stripRanges(parseGrammarRule(src.trim(), "TypeExpr") as TypeExpr);
}

///
/// Custom expecters
///

export function expectDocument(src: string, node: unknown) {
  try {
    return expect(parseDocument(src)).toEqual(node);
  } catch (error: unknown) {
    // Trick from https://kentcdodds.com/blog/improve-test-error-messages-of-your-abstractions
    Error.captureStackTrace(error as Error, expectDocument);
    throw error;
  }
}

export function expectTypeExpr(src: string, node: unknown) {
  try {
    return expect(parseTypeExpr(src)).toEqual(node);
  } catch (error: unknown) {
    // Trick from https://kentcdodds.com/blog/improve-test-error-messages-of-your-abstractions
    Error.captureStackTrace(error as Error, expectTypeExpr);
    throw error;
  }
}

export function expectTypeExprEqual(src1: string, src2: string) {
  try {
    return expect(parseTypeExpr(src2)).toEqual(parseTypeExpr(src1));
  } catch (error: unknown) {
    // Trick from https://kentcdodds.com/blog/improve-test-error-messages-of-your-abstractions
    Error.captureStackTrace(error as Error, expectTypeExprEqual);
    throw error;
  }
}
