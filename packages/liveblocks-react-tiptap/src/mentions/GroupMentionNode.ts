import { mergeAttributes, Node } from "@tiptap/core";
import { ReactNodeViewRenderer } from "@tiptap/react";

import { LIVEBLOCKS_GROUP_MENTION_TYPE } from "../types";
import { Mention } from "./Mention";

export const GroupMentionNode = Node.create({
  name: LIVEBLOCKS_GROUP_MENTION_TYPE,
  group: "inline",
  inline: true,
  selectable: true,
  atom: true,

  priority: 101,
  parseHTML() {
    return [
      {
        tag: "liveblocks-group-mention",
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return ["liveblocks-group-mention", mergeAttributes(HTMLAttributes)];
  },

  addNodeView() {
    return ReactNodeViewRenderer(Mention, {
      contentDOMElementTag: "span",
    });
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
      userIds: {
        default: undefined,
        parseHTML: (element) => {
          const userIdsAttribute = element.getAttribute("data-user-ids");

          if (!userIdsAttribute) {
            return undefined;
          }

          try {
            const userIds = JSON.parse(userIdsAttribute) as string[];

            return Array.isArray(userIds) ? userIds : undefined;
          } catch {
            return undefined;
          }
        },
        renderHTML: (attributes) => {
          if (!attributes.userIds || !Array.isArray(attributes.userIds)) {
            return {};
          }

          return {
            "data-user-ids": JSON.stringify(attributes.userIds),
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
  addKeyboardShortcuts() {
    return {
      Backspace: () =>
        this.editor.commands.command(({ tr, state }) => {
          let isMention = false;
          const { selection } = state;
          const { empty, anchor } = selection;

          if (!empty) {
            return false;
          }

          state.doc.nodesBetween(anchor - 1, anchor, (node, pos) => {
            if (node.type.name === this.name) {
              isMention = true;
              tr.insertText("", pos, pos + node.nodeSize);
            }
          });

          return isMention;
        }),
    };
  },
});
