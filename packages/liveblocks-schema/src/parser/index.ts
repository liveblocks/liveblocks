import type { Document, Node, TypeExpr } from "../ast";
import type { Source } from "../lib/error-reporting";
import { ErrorReporter } from "../lib/error-reporting";
import * as generatedParser from "./generated-parser";

export type StartRule =
  // See the PEG grammar. These are the valid start rule to kick off the
  // parsing process.  All other grammar rules are internal to the parser.
  "Document" | "TypeExpr";

function parseGrammarRule(
  src: string | Source | ErrorReporter,
  startRule: StartRule
): Node | Node[] {
  const reporter =
    typeof src === "string"
      ? ErrorReporter.fromText(src)
      : "path" in src
      ? ErrorReporter.fromSrc(src)
      : src;

  try {
    return generatedParser.parse(reporter.contents(), { startRule });
  } catch (err_: unknown) {
    const e = err_ as Error;

    /**
     * If this is a parse error (due to a syntax error), report this in
     * a visually pleasing manner in the console.
     */
    if (/SyntaxError/.test(e.name)) {
      type SyntaxError = Error & {
        location: {
          start: { offset: number; line: number; column: number };
          end: { offset: number; line: number; column: number };
        };
      };
      const se = e as SyntaxError;
      reporter.throwParseError(se.message, [
        se.location.start.offset,
        se.location.end.offset,
      ]);
    } else {
      throw e;
    }
  }

  throw new Error("Should never get here");
}

export function parseDocument(src: string | Source | ErrorReporter): Document {
  return parseGrammarRule(src, "Document") as Document;
}

export function parseTypeExpr(src: string | Source | ErrorReporter): TypeExpr {
  return parseGrammarRule(src, "TypeExpr") as TypeExpr;
}
