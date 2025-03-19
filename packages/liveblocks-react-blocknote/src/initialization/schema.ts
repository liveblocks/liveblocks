import type {
  BlockSchema,
  InlineContentSchema,
  StyleSchema,
} from "@blocknote/core";
import {
  BlockNoteSchema,
  createInlineContentSpecFromTipTapNode,
} from "@blocknote/core";
import { MentionNode } from "@liveblocks/react-tiptap";

const mentionSpec = createInlineContentSpecFromTipTapNode(MentionNode, {
  id: {
    default: "",
  },
  notificationId: {
    default: "",
  },
});
/**
 * Adds the Liveblocks Mention Node as inline content to the BlockNote schema
 *
 * This makes sure BlockNote knows about Liveblocks mentions and that you can read/write mentions via the BlockNote API
 */
export const withLiveblocksSchema = <
  B extends BlockSchema,
  I extends InlineContentSchema,
  S extends StyleSchema,
>(
  schema?: BlockNoteSchema<B, I, S>,
  liveblocksOptions: Partial<{ mentions: boolean }> = {}
): BlockNoteSchema<B, I, S> => {
  const optionalSchema = schema || BlockNoteSchema.create();
  if (!liveblocksOptions.mentions) {
    return optionalSchema as BlockNoteSchema<B, I, S>;
  }
  return BlockNoteSchema.create({
    blockSpecs: optionalSchema.blockSpecs,
    inlineContentSpecs: {
      ...optionalSchema.inlineContentSpecs,
      liveblocksMention: mentionSpec,
    },
    styleSpecs: optionalSchema.styleSpecs,
  }) as any as BlockNoteSchema<
    // typescript needs some help here
    B,
    I & {
      liveblocksMention: typeof mentionSpec.config;
    },
    S
  >;
};
