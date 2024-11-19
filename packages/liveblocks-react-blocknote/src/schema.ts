import {
  BlockNoteSchema,
  BlockSchema,
  createInlineContentSpecFromTipTapNode,
  InlineContentSchema,
  StyleSchema,
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
export const withLiveblocks = <
  B extends BlockSchema,
  I extends InlineContentSchema,
  S extends StyleSchema
>(
  schema: BlockNoteSchema<B, I, S>
) => {
  return BlockNoteSchema.create({
    blockSpecs: schema.blockSpecs,
    inlineContentSpecs: {
      ...schema.inlineContentSpecs,
      liveblocksMention: mentionSpec,
    },
    styleSpecs: schema.styleSpecs,
  }) as any as BlockNoteSchema<
    // typescript needs some help here
    B ,
    I & {
      mention: typeof mentionSpec.config;
    },
    S
  >;
};
