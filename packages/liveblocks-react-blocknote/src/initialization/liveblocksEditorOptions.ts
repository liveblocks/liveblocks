import type {
  BlockNoteEditorOptions,
  BlockSchema,
  DefaultBlockSchema,
  DefaultInlineContentSchema,
  DefaultStyleSchema,
  InlineContentSchema,
  StyleSchema,
} from "@blocknote/core";
import type { Extension } from "@tiptap/core";

import { withLiveblocksSchema } from "./schema";
/**
 * Helper funcction to add Liveblocks support to BlockNoteEditorOptions
 */
export const withLiveblocksEditorOptions = <
  B extends BlockSchema = DefaultBlockSchema,
  I extends InlineContentSchema = DefaultInlineContentSchema,
  S extends StyleSchema = DefaultStyleSchema,
>(
  liveblocksExtension: Extension,
  blocknoteOptions: Partial<BlockNoteEditorOptions<B, I, S>> = {},
  liveblocksOptions: Partial<{ mentions: boolean }> = {}
): Partial<BlockNoteEditorOptions<B, I, S>> => ({
  // add the liveblocks schema (i.e.: add the mention node to the schema)
  schema: withLiveblocksSchema(blocknoteOptions.schema, liveblocksOptions),

  // add the liveblocks extension
  _extensions: { liveblocksExtension, ...blocknoteOptions._extensions },

  // disable the history extension
  disableExtensions: ["history", ...(blocknoteOptions.disableExtensions || [])],
});
