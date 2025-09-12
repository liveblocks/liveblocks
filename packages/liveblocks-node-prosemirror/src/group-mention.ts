import { mergeAttributes, Node } from "@tiptap/core";

export const LIVEBLOCKS_GROUP_MENTION_TYPE = "liveblocksGroupMention";

export const GroupMentionExtension = Node.create({
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
        default: null,
        parseHTML: (element) => {
          const userIdsAttribute = element.getAttribute("data-user-ids");

          if (!userIdsAttribute) {
            return null;
          }

          try {
            const userIds = JSON.parse(userIdsAttribute) as string[];

            return Array.isArray(userIds) ? userIds : null;
          } catch {
            return null;
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
});
