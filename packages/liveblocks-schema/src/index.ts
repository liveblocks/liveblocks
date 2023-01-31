import { ErrorReporter } from "./lib/error-reporting";
import { check } from "./checker";
import { parseDocument } from "./parser";

// Export all AST nodes and helpers
export * as AST from "./ast";

/**
 * Parses and semantically checks the given schema text into an AST. If this
 * returns an AST, then it will be a valid AST.
 *
 * @throws ParseError If the schema text is syntactically invalid.
 * @throws SemanticError If the schema text is semantically invalid (for
 * example, when referencing a type that does not exist).
 */
export async function parse(schemaText: string) {
  const reporter = ErrorReporter.fromText(schemaText);
  return check(parseDocument(reporter), reporter);
}
