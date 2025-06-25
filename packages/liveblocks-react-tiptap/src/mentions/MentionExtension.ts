import { createInboxNotificationId } from "@liveblocks/core";
import {
  combineTransactionSteps,
  Extension,
  getChangedRanges,
} from "@tiptap/core";
import type { Node as ProseMirrorNode } from "@tiptap/pm/model";
import { Slice } from "@tiptap/pm/model";
import { Plugin } from "@tiptap/pm/state";
import { ReactRenderer } from "@tiptap/react";
import Suggestion from "@tiptap/suggestion";
import { ySyncPluginKey } from "y-prosemirror";

import {
  LIVEBLOCKS_GROUP_MENTION_TYPE,
  LIVEBLOCKS_MENTION_EXTENSION,
  LIVEBLOCKS_MENTION_KEY,
  LIVEBLOCKS_MENTION_NOTIFIER_KEY,
  LIVEBLOCKS_MENTION_PASTE_KEY,
  LIVEBLOCKS_MENTION_TYPE,
  type TiptapMentionData,
} from "../types";
import { getMentionsFromNode, mapFragment } from "../utils";
import { GroupMentionNode } from "./GroupMentionNode";
import { MentionNode } from "./MentionNode";
import type { MentionsListHandle, MentionsListProps } from "./MentionsList";
import { MentionsList } from "./MentionsList";

/**
 *
 * Handles creating new notificationIds when notifications are pasted
 *
 * @returns Plugin
 */
const mentionPasteHandler = (): Plugin => {
  return new Plugin({
    key: LIVEBLOCKS_MENTION_PASTE_KEY,
    props: {
      transformPasted: (slice) => {
        const getNewNotificationIds = (node: ProseMirrorNode) => {
          // If this is a mention node, we need to get a new notification id
          if (
            node.type.name === LIVEBLOCKS_MENTION_TYPE ||
            node.type.name === LIVEBLOCKS_GROUP_MENTION_TYPE
          ) {
            return node.type.create(
              { ...node.attrs, notificationId: createInboxNotificationId() },
              node.content
            );
          }
          return node.copy(node.content);
        };
        const fragment = mapFragment(slice.content, getNewNotificationIds);
        return new Slice(fragment, slice.openStart, slice.openEnd);
      },
    },
  });
};

export type MentionExtensionOptions = {
  onCreateMention: (mention: TiptapMentionData) => void;
  onDeleteMention: (notificationId: string) => void;
};
/**
 *
 * The purpose of this plugin is to create inbox notifications when a mention is
 *
 * @returns Plugin (from @tiptap/core)
 */
const notifier = ({
  onCreateMention,
  onDeleteMention,
}: MentionExtensionOptions): Plugin => {
  return new Plugin({
    key: LIVEBLOCKS_MENTION_NOTIFIER_KEY,
    appendTransaction: (transactions, oldState, newState) => {
      const docChanges =
        transactions.some((transaction) => transaction.docChanged) &&
        !oldState.doc.eq(newState.doc);
      // don't run if there was no change
      if (!docChanges) {
        return;
      }
      // don't run if from collab
      if (
        transactions.some((transaction) => transaction.getMeta(ySyncPluginKey))
      ) {
        return;
      }
      const transform = combineTransactionSteps(oldState.doc, [
        ...transactions,
      ]);
      const changes = getChangedRanges(transform);

      changes.forEach(({ newRange, oldRange }) => {
        const newMentions = getMentionsFromNode(newState.doc, newRange);
        const oldMentions = getMentionsFromNode(oldState.doc, oldRange);

        if (oldMentions.size || newMentions.size) {
          // create new mentions
          newMentions.forEach((mention) => {
            if (!oldMentions.has(mention.notificationId)) {
              onCreateMention(mention);
            }
          });
          // delete old mentions
          oldMentions.forEach((mention) => {
            if (!newMentions.has(mention.notificationId)) {
              onDeleteMention(mention.notificationId);
            }
          });
        }
      });

      return undefined;
    },
  });
};

export const MentionExtension = Extension.create<MentionExtensionOptions>({
  name: LIVEBLOCKS_MENTION_EXTENSION,

  priority: 101,
  addOptions() {
    return {
      onCreateMention: () => {},
      onDeleteMention: () => {},
    };
  },

  addExtensions() {
    return [MentionNode, GroupMentionNode];
  },

  addProseMirrorPlugins() {
    return [
      Suggestion({
        editor: this.editor,
        char: "@",
        pluginKey: LIVEBLOCKS_MENTION_KEY,
        command: ({ editor, range, props }) => {
          // increase range.to by one when the next node is of type "text"
          // and starts with a space character
          const nodeAfter = editor.view.state.selection.$to.nodeAfter;
          const overrideSpace = nodeAfter?.text?.startsWith(" ");

          if (overrideSpace) {
            range.to += 1;
          }

          editor
            .chain()
            .focus()
            .insertContentAt(range, [
              {
                type:
                  (props as Record<string, string>).kind === "user"
                    ? LIVEBLOCKS_MENTION_TYPE
                    : LIVEBLOCKS_GROUP_MENTION_TYPE,
                attrs: props as Record<string, string>,
              },
              {
                type: "text",
                text: " ",
              },
            ])
            .run();

          // get reference to `window` object from editor element, to support cross-frame JS usage
          editor.view.dom.ownerDocument.defaultView
            ?.getSelection()
            ?.collapseToEnd();
        },
        allow: ({ state, range }) => {
          const $fromParentType = state.doc.resolve(range.from).parent.type;

          return Boolean(
            $fromParentType.contentMatch.matchType(
              state.schema.nodes[LIVEBLOCKS_MENTION_TYPE]
            ) ||
              $fromParentType.contentMatch.matchType(
                state.schema.nodes[LIVEBLOCKS_GROUP_MENTION_TYPE]
              )
          );
        },
        allowSpaces: true,
        items: () => [], // we'll let the mentions list component do this
        render: () => {
          let component: ReactRenderer<MentionsListHandle, MentionsListProps>;
          return {
            onStart: (props) => {
              component = new ReactRenderer<
                MentionsListHandle,
                MentionsListProps
              >(MentionsList, {
                props,
                editor: props.editor,
              });

              if (!props.clientRect) {
                return;
              }

              document.body.appendChild(component.element);
            },

            onUpdate(props) {
              component.updateProps(props);
            },

            onKeyDown(props) {
              if (props.event.key === "Escape") {
                component.updateProps({
                  ...props,
                  hide: true,
                });
                return true;
              }
              return component.ref?.onKeyDown(props) ?? false;
            },

            onExit() {
              if (document.body.contains(component.element)) {
                document.body.removeChild(component.element);
              }
              component.destroy();
            },
          };
        },
      }),
      notifier(this.options),
      mentionPasteHandler(),
    ];
  },
});
