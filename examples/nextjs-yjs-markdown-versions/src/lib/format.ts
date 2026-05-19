/**
 * Browser-side Prettier wrapper for MDX documents.
 *
 * Uses Prettier's standalone build + the markdown plugin (which ships
 * both the `markdown` and `mdx` parsers in Prettier 3), so we can format
 * directly from the Monaco editor without a server round-trip.
 *
 * `formatWithCursor` lets us pass the user's caret offset in and get
 * back the equivalent offset in the formatted output — that way the
 * caret doesn't jump to the end of the document after every save.
 */

import prettier from "prettier/standalone";
import markdownPlugin from "prettier/plugins/markdown";

export type FormatResult = {
  formatted: string;
  cursorOffset: number;
};

export async function formatMarkdown(
  source: string,
  cursorOffset = 0
): Promise<FormatResult> {
  const result = await prettier.formatWithCursor(source, {
    parser: "mdx",
    plugins: [markdownPlugin],
    proseWrap: "preserve",
    printWidth: 80,
    cursorOffset,
  });

  return {
    formatted: result.formatted,
    cursorOffset: result.cursorOffset,
  };
}
