import {
  type BlockNoteEditorOptions,
  type BlockSchema,
  createExtension,
  type DefaultBlockSchema,
  type DefaultInlineContentSchema,
  type DefaultStyleSchema,
  type InlineContentSchema,
  type StyleSchema,
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
  liveblocksExtension: Extension<any, any>,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  blocknoteOptions: Partial<BlockNoteEditorOptions<B, I, S>> = {},
  liveblocksOptions: Partial<{ mentions: boolean }> = {}
): Partial<BlockNoteEditorOptions<B, I, S>> => {
  const {
    schema: blocknoteSchema,
    extensions: blocknoteExtensions,
    disableExtensions: blocknoteDisableExtensions,
    ...extraBlocknoteOptions
  } = blocknoteOptions;

  return {
    // add the liveblocks schema (i.e.: add the mentions nodes to the schema)
    schema: withLiveblocksSchema(blocknoteSchema, liveblocksOptions),

    // add the liveblocks extension
    extensions: [
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call
      createExtension({
        key: "liveblocksExtension",
        tiptapExtensions: [liveblocksExtension],
      }),
      ...(blocknoteExtensions ?? []),
    ],

    // disable the history extension
    disableExtensions: ["history", ...(blocknoteDisableExtensions || [])],

    // pass the rest of the options through
    ...extraBlocknoteOptions,
  };
};
