import { Mark, mergeAttributes } from "@tiptap/core";
import { HIGHLIGHT_EVENT_NAME, HighlightEvent, highlightEvent } from "@/utils";
import { Editor } from "@tiptap/react";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    commentHighlight: {
      // Create a comment highlight mark
      setCommentHighlight: (attributes: {
        color?: string;
        highlightId: string | null;
        state: "composing" | "complete";
      }) => ReturnType;

      // Toggle a comment highlight mark
      toggleCommentHighlight: (attributes: {
        color?: string;
        highlightId: string | null;
        state: "composing" | "complete";
      }) => ReturnType;

      // Remove a comment highlight mark
      unsetCommentHighlight: () => ReturnType;
    };
  }
}

export interface CommentHighlightOptions {
  HTMLAttributes: Record<string, any>;
}

export interface CommentHighlightStorage {
  // Should show new thread composer?
  showComposer: boolean;

  // The id of the current highlight being created
  currentHighlightId: string | null;

  // The highlight on the page that is being hovered or is active
  activeHighlightId: string | null;
}

export const LiveblocksCommentsHighlight = Mark.create<
  CommentHighlightOptions,
  CommentHighlightStorage
>({
  name: "commentHighlight",

  addOptions() {
    return {
      HTMLAttributes: {},
    };
  },

  addStorage() {
    return {
      showComposer: false,
      currentHighlightId: null,
      activeHighlightId: null,
    };
  },

  addCommands() {
    return {
      setCommentHighlight:
        (attributes) =>
        ({ commands }) => {
          this.storage.currentHighlightId = attributes.highlightId;
          this.storage.showComposer = true;
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
      highlightId: {
        default: null,
        parseHTML: (element) => element.getAttribute("data-highlight-id"),
        renderHTML: (attributes) => {
          // Don't render attribute if no highlightId defined
          if (!attributes.highlightId) {
            return;
          }

          return {
            "data-highlight-id": attributes.highlightId,
          };
        },
      },

      // Color of highlighted text
      state: {
        default: "complete",
        parseHTML: (element) => element.getAttribute("data-state"),
        renderHTML: (attributes) => {
          if (!attributes.state) {
            return {};
          }

          return {
            "data-state": attributes.state,
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

      // If highlight currently active
      // selected: {
      //   default: "false",
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
    const highlightId = HTMLAttributes?.["data-highlight-id"] || null;
    const elem = document.createElement("mark");

    const currentlyActive =
      this.editor?.storage.activeHighlightId ===
      this.options.HTMLAttributes.highlightId;

    // Merge attributes
    Object.entries(
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        "data-selected": "false",
      })
    ).forEach(([attr, val]) => elem.setAttribute(attr, val));

    const handlePointerEnter = (event: MouseEvent) => {
      const targetIsCurrentMark =
        event.target instanceof HTMLElement
          ? event.target === elem || elem.contains(event.target)
          : false;
      elem.dataset.selected = targetIsCurrentMark ? "true" : "false";

      if (!this.editor) {
        return;
      }

      if (targetIsCurrentMark) {
        highlightEvent(highlightId);
        this.editor.storage.commentHighlight.activeHighlightId = highlightId;
        return;
      }

      if (
        this.editor.storage.commentHighlight.activeHighlightId === highlightId
      ) {
        highlightEvent(null);
        this.editor.storage.commentHighlight.activeHighlightId = null;
      }
    };

    const handlePointerLeave = (event: MouseEvent) => {
      elem.dataset.selected = "false";

      if (!this.editor) {
        return;
      }

      highlightEvent(null);
      this.editor.storage.commentHighlight.activeHighlightId = null;
    };

    const handleHighlightEvent = (event: HighlightEvent) => {
      console.log(event.detail.highlightId === highlightId);
      elem.dataset.selected =
        event.detail.highlightId === highlightId ? "true" : "false";
    };

    elem.addEventListener("pointerenter", handlePointerEnter);
    elem.addEventListener("pointerleave", handlePointerLeave);
    // document.documentElement.addEventListener(
    //   HIGHLIGHT_EVENT_NAME,
    //   handleHighlightEvent as any
    // );

    // Set data-selected when last click occurs inside mark
    // TODO send custom event so comments know they're selected
    // const handleClick = (event: MouseEvent) => {
    //   const highlightId = HTMLAttributes?.["data-highlight-id"] || null;
    //
    //   const targetIsCurrentMark =
    //     event.target instanceof HTMLElement
    //       ? event.target === elem || elem.contains(event.target)
    //       : false;
    //   elem.dataset.selected = targetIsCurrentMark ? "true" : "false";
    //
    //   if (!this.editor) {
    //     return;
    //   }
    //
    //   if (targetIsCurrentMark) {
    //     highlightEvent(highlightId);
    //     this.editor.storage.commentHighlight.activeHighlightId = highlightId;
    //     return;
    //   }
    //
    //   if (
    //     this.editor.storage.commentHighlight.activeHighlightId === highlightId
    //   ) {
    //     highlightEvent(null);
    //     this.editor.storage.commentHighlight.activeHighlightId = null;
    //   }
    // };
    //
    // document.documentElement.addEventListener("click", handleClick);

    return elem;
  },
});

type Props = {
  event: MouseEvent;
  editor: Editor;
  elem: HTMLElement;
  HTMLAttributes: Record<string, any>;
};

function handleClickNew({ event, editor, elem, HTMLAttributes }: Props) {
  const highlightId = HTMLAttributes["data-highlight-id"];

  const targetIsCurrentMark =
    event.target instanceof HTMLElement
      ? event.target === elem || elem.contains(event.target)
      : false;

  if (targetIsCurrentMark) {
    elem.dataset.selected = "true";
    if (editor) {
      highlightEvent(highlightId);
      editor.storage.commentHighlight.activeHighlightId = highlightId;
    }
    return;
  }

  elem.dataset.selected = "false";
  if (editor) {
    editor.storage.commentHighlight.activeHighlightId = null;
  }
}
