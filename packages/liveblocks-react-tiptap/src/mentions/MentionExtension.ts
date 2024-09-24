import { mergeAttributes, Node } from "@tiptap/core";
import { PluginKey } from "@tiptap/pm/state";
import { ReactNodeViewRenderer, ReactRenderer } from "@tiptap/react";
import Suggestion from "@tiptap/suggestion";

import Mention from "./Mention";
import MentionsList from "./MentionsList";

export const LIVEBLOCKS_MENTION_KEY = new PluginKey("lb-plugin-mention");

export const MentionExtension = Node.create({
  name: "liveblocksMention",
  group: "inline",
  inline: true,
  selectable: true,
  atom: true,

  parseHTML() {
    return [
      {
        tag: "liveblocks-mention",
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return ["liveblocks-mention", mergeAttributes(HTMLAttributes), 0];
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
            "data-id": attributes.id,
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
                type: this.name,
                attrs: props,
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
          const $from = state.doc.resolve(range.from);
          const type = state.schema.nodes[this.name];
          const allow = !!$from.parent.type.contentMatch.matchType(type);

          return allow;
        },
        allowSpaces: true,
        items: () => [], // we'll let the mentions list component do this
        render: () => {
          let component: ReactRenderer<any, any>;

          return {
            onStart: (props) => {
              component = new ReactRenderer(MentionsList, {
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

              return component.ref?.onKeyDown(props);
            },

            onExit() {
              document.body.removeChild(component.element);
              component.destroy();
            },
          };
        },
      }),
    ];
  },
});
