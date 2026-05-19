/**
 * Browser-side Prettier wrapper for markdown documents.
 *
 * Uses Prettier's standalone build + the markdown parser plugin, so we can
 * format directly from the Monaco editor without round-tripping through a
 * server.
 */

import prettier from "prettier/standalone";
import markdownPlugin from "prettier/plugins/markdown";

export async function formatMarkdown(source: string): Promise<string> {
  return await prettier.format(source, {
    parser: "markdown",
    plugins: [markdownPlugin],
    proseWrap: "preserve",
    printWidth: 80,
  });
}
