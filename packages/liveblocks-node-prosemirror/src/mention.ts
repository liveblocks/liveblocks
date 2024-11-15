import { mergeAttributes, Node } from "@tiptap/core";

export const LIVEBLOCKS_MENTION_TYPE = "liveblocksMention";

export const MentionExtension = Node.create({
  name: LIVEBLOCKS_MENTION_TYPE,
  group: "inline",
  inline: true,
  selectable: true,
  atom: true,

  priority: 101,
  parseHTML() {
    return [
      {
        tag: "liveblocks-mention",
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return ["liveblocks-mention", mergeAttributes(HTMLAttributes)];
  },

  addAttributes() {
    return {
      id: {
        default: null,
        parseHTML: (element) => element.getAttribute("data-id"),
        renderHTML: (attributes) => {
          if (!attributes.id) {
            return {};
          }

          return {
            "data-id": attributes.id as string, // "as" typing because TipTap doesn't have a way to type attributes
          };
        },
      },
      notificationId: {
        default: null,
        parseHTML: (element) => element.getAttribute("data-notification-id"),
        renderHTML: (attributes) => {
          if (!attributes.notificationId) {
            return {};
          }

          return {
            "data-notification-id": attributes.notificationId as string, // "as" typing because TipTap doesn't have a way to type attributes
          };
        },
      },
    };
  },
});
