import type { CheckedDocument } from "./checker";
import { check } from "./checker";
import type { Diagnostic } from "./lib/error-reporting";
import { DiagnosticError, ErrorReporter } from "./lib/error-reporting";
import type { ParserOptions } from "./parser";
import { parseDocument } from "./parser";

// Export all AST nodes and helpers
export * as AST from "./ast";
export type { CheckedDocument } from "./checker";

export type { Diagnostic };

/**
 * Returns a list of issues with the current schema. Useful for use in
 * IDEs and developer tools.
 *
 * There's a symmetry with `parse()`:
 *
 * - If `parse()` throws on the same schema text, this will return at
 *   least one Diagnostic issue.
 * - If `parse()` succeeds, this will return no results.
 */
export function getDiagnostics(
  schemaText: string,
  options?: ParserOptions
): Diagnostic[] {
  try {
    parse(schemaText, options);
    return [];
  } catch (err) {
    if (!(err instanceof DiagnosticError)) {
      // Don't hide unknown errors, re-throw them
      throw err;
    }

    // NOTE: For now, we'll only ever throw one diagnostic error at a time. In
    // the future, we'll collect more before throwing.
    return [err.diagnostic];
  }
}

/**
 * Parses and semantically checks the given schema text into an AST. If this
 * returns an AST, then it will be a valid AST.
 *
 * @throws ParseError If the schema text is syntactically invalid.
 * @throws SemanticError If the schema text is semantically invalid (for
 * example, when referencing a type that does not exist).
 */
export function parse(
  schemaText: string,
  options?: ParserOptions
): CheckedDocument {
  const reporter = ErrorReporter.fromText(schemaText);
  return check(parseDocument(reporter, options), reporter);
}

export { prettify } from "./prettify";
