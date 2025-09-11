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
 * Helper function to add Liveblocks support to BlockNoteEditorOptions
 */
export const withLiveblocksEditorOptions = <
  B extends BlockSchema = DefaultBlockSchema,
  I extends InlineContentSchema = DefaultInlineContentSchema,
  S extends StyleSchema = DefaultStyleSchema,
>(
  liveblocksExtension: Extension,
  blocknoteOptions: Partial<BlockNoteEditorOptions<B, I, S>> = {},
  liveblocksOptions: Partial<{ mentions: boolean }> = {}
): Partial<BlockNoteEditorOptions<B, I, S>> => {
  const {
    schema: blocknoteSchema,
    _extensions: blocknoteExtensions,
    disableExtensions: blocknoteDisableExtensions,
    ...extraBlocknoteOptions
  } = blocknoteOptions;

  return {
    // add the liveblocks schema (i.e.: add the mentions nodes to the schema)
    schema: withLiveblocksSchema(blocknoteSchema, liveblocksOptions),

    // add the liveblocks extension
    _extensions: { liveblocksExtension, ...blocknoteExtensions },

    // disable the history extension
    disableExtensions: ["history", ...(blocknoteDisableExtensions || [])],

    // pass the rest of the options through
    ...extraBlocknoteOptions,
  };
};
