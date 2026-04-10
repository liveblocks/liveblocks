import type {
  BlockSchema,
  CustomInlineContentFromConfig,
  InlineContentSchema,
  StyleSchema,
} from "@blocknote/core";
import {
  BlockNoteSchema,
  createInlineContentSpecFromTipTapNode,
} from "@blocknote/core";
import { GroupMentionNode, MentionNode } from "@liveblocks/react-tiptap";

const mentionSpec = createInlineContentSpecFromTipTapNode(
  MentionNode,
  {
    id: {
      default: "",
    },
    notificationId: {
      default: "",
    },
  },
  {
    render(
      inlineContent: CustomInlineContentFromConfig<
        {
          type: "liveblocksMention";
          content: "styled";
          propSchema: {
            id: {
              default: "";
            };
            notificationId: {
              default: "";
            };
          };
        },
        StyleSchema
      >
    ) {
      const el = document.createElement("liveblocks-mention");
      el.setAttribute("data-id", inlineContent.props.id);
      el.setAttribute(
        "data-notification-id",
        inlineContent.props.notificationId
      );
      return {
        dom: el,
      };
    },
  }
);

const groupMentionSpec = createInlineContentSpecFromTipTapNode(
  GroupMentionNode,
  {
    id: {
      default: "",
    },
    userIds: {
      default: "",
    },
    notificationId: {
      default: "",
    },
  },
  {
    render(
      inlineContent: CustomInlineContentFromConfig<
        {
          type: "liveblocksGroupMention";
          content: "styled";
          propSchema: {
            id: {
              default: "";
            };
            userIds: {
              default: "";
            };
            notificationId: {
              default: "";
            };
          };
        },
        StyleSchema
      >
    ) {
      const el = document.createElement("liveblocks-group-mention");
      el.setAttribute("data-id", inlineContent.props.id);
      el.setAttribute("data-user-ids", inlineContent.props.userIds);
      el.setAttribute(
        "data-notification-id",
        inlineContent.props.notificationId
      );
      return {
        dom: el,
      };
    },
  }
);

/**
 * Adds the Liveblocks Mention and Group Mention nodes as inline content to the BlockNote schema
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
      liveblocksGroupMention: groupMentionSpec,
    },
    styleSpecs: optionalSchema.styleSpecs,
  }) as any as BlockNoteSchema<
    // typescript needs some help here
    B,
    I,
    S
  >;
};
