import colors from "colors";
import fs from "fs";
import prettify from "../prettify";
import { indent } from "./indent";
import type { Range } from "../ast";

const WHITESPACE_ONLY_RE = /^\s*$/;

export class Source {
  path: string;
  #contents: string | undefined;

  static fromPath(path: string): Source {
    return new Source(path);
  }

  static fromText(text: string): Source {
    return new Source("<string>", text);
  }

  constructor(path: string, contents?: string) {
    this.path = path;
    this.#contents = contents;
  }

  contents(): string {
    if (this.#contents === undefined) {
      this.#contents = fs.readFileSync(this.path, "utf-8");
    }
    return this.#contents;
  }
}

export type LineInfo = {
  offset: number;
  line1: number; // 1-based line number
  column1: number; // 1-based column number
};

/**
 * For a string like "foo\nbarbaz\nquxxx\n", builds: [4, 11, 17]
 */
function buildOffsetLUT(lines: Array<string>): Array<number> {
  const offsets = [];
  let total = 0;
  for (const line of lines) {
    total += line.length + 1;
    offsets.push(total);
  }
  return offsets;
}

/**
 * Helper to report inline error messages in source files.
 *
 * Given (at least a) filename, will be able to print error messages in a human
 * friendly way, annotating the source file.
 *
 *     ErrorReporter.fromPath('/path/to/file.lsl')
 *     ErrorReporter.fromText('x = 42')
 *
 */
export class ErrorReporter {
  src: Source;
  #lines: Array<string> | undefined;
  #offsets: Array<number> | undefined;

  static fromPath(path: string): ErrorReporter {
    return new ErrorReporter(Source.fromPath(path));
  }

  static fromText(programText: string): ErrorReporter {
    return new ErrorReporter(Source.fromText(programText));
  }

  constructor(src: string | Source) {
    this.src = typeof src === "string" ? Source.fromText(src) : src;
  }

  contents(): string {
    return this.src.contents();
  }

  lines() {
    if (!this.#lines) {
      this.#lines = this.contents().split("\n");
    }
    return this.#lines;
  }

  offsets() {
    if (!this.#offsets) {
      this.#offsets = buildOffsetLUT(this.lines());
    }
    return this.#offsets;
  }

  lineInfo(offset: number): LineInfo {
    const lines = this.lines();
    const offsets = this.offsets();
    const lineno0 = offsets.findIndex((eol) => offset < eol);
    if (lineno0 < 0) {
      // Offset out of bounds, point to the very last character
      return { offset, line1: lines.length, column1: 1 };
    } else if (lineno0 === 0) {
      return { offset, line1: 1, column1: offset + 1 };
    } else {
      const preveol = offsets[lineno0 - 1];
      const column0 = offset - preveol;
      return { offset, line1: lineno0 + 1, column1: column0 + 1 };
    }
  }

  *iterAnnotateSourceLines(
    startOffset: number,
    endOffset: number
  ): Generator<string> {
    const lines = this.lines();
    const start = this.lineInfo(startOffset);
    const end = this.lineInfo(endOffset);

    // We want to show a bit of leading and trailing context from the
    // source file. To that end, we'll start at most 3 lines before the
    // line with the error on it, and try to "walk back" line by line until
    // we hit the line with the error info, or find a non-empty line. This
    // will effectively strip off any "leading empty lines" from the
    // context.
    let startLineno1 = Math.max(1, start.line1 - 3);
    while (startLineno1 < start.line1) {
      const line = lines[startLineno1 - 1];
      if (WHITESPACE_ONLY_RE.test(line)) {
        startLineno1++;
      } else {
        break;
      }
    }

    // Ditto, but for trailing empty lines
    let endLineno1 = Math.min(end.line1 + 3, lines.length);
    while (endLineno1 > end.line1) {
      const line = lines[endLineno1 - 1];
      if (WHITESPACE_ONLY_RE.test(line)) {
        endLineno1--;
      } else {
        break;
      }
    }

    for (let lineno = startLineno1; lineno <= endLineno1; lineno++) {
      // Print the line itself
      const line = lines[lineno - 1];
      yield `${colors.gray(lineno.toString().padStart(5, " "))}  ${line}`;

      // Print an annotation if this is for the right line
      if (lineno === start.line1) {
        if (start.line1 === end.line1) {
          yield indent(
            6 + start.column1,
            colors.red("^".repeat(end.column1 - start.column1))
          );
        } else {
          yield indent(6 + start.column1, colors.red("^"));
        }
      }
    }
  }

  formatHeading(left: string, right: string): string {
    const twidth: number | null = process.stdout.columns ?? null;

    // If we have access to the terminal's width, use it to spread out the
    // left and right part, otherwise just stick 'em together
    if (twidth) {
      const outerPadding = 2;
      const innerPadding = 1;
      const padding = outerPadding + innerPadding;
      const spacer = "―".repeat(
        twidth - (left.length + padding) - (right.length + padding)
      );
      return `  ${left} ${spacer} ${right}`;
    } else {
      return `  ${left} ${right}`;
    }
  }

  *iterParseError(message: string, range?: Range): Generator<string> {
    const [startOffset, endOffset] = range ?? [undefined, undefined];

    yield "";
    yield colors.cyan(this.formatHeading("Parse error", `in ${this.src.path}`));
    if (startOffset !== undefined && endOffset !== undefined) {
      yield* this.iterAnnotateSourceLines(startOffset, endOffset);
    }
    yield "";
    yield indent(2, colors.red(message));
    yield "";
  }

  getParseError(message: string, range?: Range): string {
    return Array.from(this.iterParseError(message, range)).join("\n");
  }

  throwParseError(message: string, range?: Range): never {
    const err = new Error(this.getParseError(message, range));
    err.name = "ParseError";
    throw err;
  }

  printParseError(message: string, range?: Range): void {
    for (const line of this.iterParseError(message, range)) {
      console.log(line);
    }
  }

  *iterTypeError(
    title: string,
    description: Array<string>,
    range?: Range
  ): Generator<string> {
    const [startOffset, endOffset] = range ?? [undefined, undefined];

    yield "";
    yield colors.cyan(this.formatHeading(`Type error`, ` in ${this.src.path}`));
    if (title) {
      yield "";
      yield indent(2, title);
      yield "";
    }

    if (startOffset !== undefined && endOffset !== undefined) {
      yield* this.iterAnnotateSourceLines(startOffset, endOffset);
    }

    yield "";
    for (const desc of description) {
      const text =
        typeof desc === "string"
          ? desc
          : colors.yellow("    " + prettify(desc));
      yield indent(2, text);
    }
    yield "";
  }

  getTypeError(
    title: string,
    description: Array<string>,
    range?: Range
  ): string {
    return Array.from(this.iterTypeError(title, description, range)).join("\n");
  }

  throwTypeError(
    title: string,
    description: Array<string>,
    range?: Range
  ): void /* throws */ {
    const err = new Error(this.getTypeError(title, description, range));
    err.name = "TypeError";
    throw err;
  }

  printTypeError(
    title: string,
    description: Array<string>,
    range?: Range
  ): void {
    for (const line of this.iterTypeError(title, description, range)) {
      console.log(line);
    }
  }
}
