import { Mark, mergeAttributes } from "@tiptap/core";
import {
  NodeViewContent,
  NodeViewProps,
  NodeViewWrapper,
  ReactNodeViewRenderer,
} from "@tiptap/react";
import styles from "@/components/CustomTaskItem.module.css";
import { Checkbox } from "@/primitives/Checkbox";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    commentHighlight: {
      /**
       * Set a highlight mark
       */
      setCommentHighlight: (attributes?: {
        color: string;
        threadId: string | null;
      }) => ReturnType;
      /**
       * Toggle a highlight mark
       */
      toggleCommentHighlight: (attributes?: {
        color: string;
        threadId: string | null;
      }) => ReturnType;
      /**
       * Unset a highlight mark
       */
      unsetCommentHighlight: () => ReturnType;
    };
  }
}

export interface CommentHighlightOptions {
  HTMLAttributes: Record<string, any>;
}

export const LiveblocksCommentsHighlight = Mark.create<CommentHighlightOptions>(
  {
    name: "commentHighlight",

    addOptions() {
      return {
        HTMLAttributes: {},
      };
    },

    addCommands() {
      return {
        setCommentHighlight:
          (attributes) =>
          ({ commands }) => {
            return commands.setMark(this.name, attributes);
          },
        toggleCommentHighlight:
          (attributes) =>
          ({ commands }) => {
            return commands.toggleMark(this.name, attributes);
          },
        unsetCommentHighlight:
          () =>
          ({ commands }) => {
            return commands.unsetMark(this.name);
          },
      };
    },

    addAttributes() {
      return {
        threadId: {
          default: null,
          parseHTML: (element) => element.getAttribute("data-thread-id"),
          renderHTML: (attributes) => {
            // Don't render attribute if no threadId defined
            if (!attributes.threadId) {
              return;
            }

            return {
              "data-thread-id": attributes.threadId,
            };
          },
        },

        // Color of highlighted text
        color: {
          default: null,
          parseHTML: (element) =>
            element.getAttribute("data-color") || element.style.backgroundColor,
          renderHTML: (attributes) => {
            if (!attributes.color) {
              return {};
            }

            return {
              style: `--commentHighlightColor: ${attributes.color}; background-color: var(--commentHighlightColor); color: inherit`,
            };
          },
        },

        // // If highlight currently active
        // selected: {
        //   default: false,
        //   parseHTML: (element) =>
        //     element.getAttribute("data-selected") === "true",
        //   renderHTML: (attributes) => ({
        //     "data-selected": attributes.dataSelected,
        //   }),
        // },
      };
    },

    parseHTML() {
      return [
        {
          tag: `mark`,
          priority: 51,
        },
      ];
    },

    renderHTML({ HTMLAttributes }) {
      const elem = document.createElement("mark");

      // Merge attributes
      Object.entries(
        mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
          // "data-selected": "false",
        })
      ).forEach(([attr, val]) => elem.setAttribute(attr, val));
      console.log(this.options.HTMLAttributes, HTMLAttributes);

      // Set data-selected when last click occurs inside mark
      // TODO send custom event so comments know they're selected
      window.addEventListener("click", (event: MouseEvent) => {
        if (!event.target || !(event.target instanceof HTMLElement)) {
          // elem.dataset.selected = "false";
          return;
        }

        if (event.target?.contains(elem) && event.target !== elem) {
          // elem.dataset.selected = "false";
          return;
        }

        // elem.dataset.selected = "true";
      });

      return elem;
    },
  }
);
