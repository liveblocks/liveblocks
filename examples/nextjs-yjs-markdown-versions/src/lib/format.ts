/**
 * Browser-side Prettier wrapper for MDX documents.
 *
 * Uses Prettier's standalone build + the markdown parser plugin (which
 * ships both the `markdown` and `mdx` parsers in Prettier 3), so we can
 * format directly from the Monaco editor without a server round-trip.
 */

import prettier from "prettier/standalone";
import markdownPlugin from "prettier/plugins/markdown";

export async function formatMarkdown(source: string): Promise<string> {
  return await prettier.format(source, {
    parser: "mdx",
    plugins: [markdownPlugin],
    proseWrap: "preserve",
    printWidth: 80,
  });
}
