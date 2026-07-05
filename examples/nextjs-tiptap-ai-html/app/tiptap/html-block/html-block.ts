import { mergeAttributes, Node } from "@tiptap/core";
import { ReactNodeViewRenderer } from "@tiptap/react";
import { HtmlBlockView } from "./html-block-view";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    htmlBlock: {
      insertHtmlBlock: () => ReturnType;
    };
  }
}

export const HtmlBlock = Node.create({
  name: "htmlBlock",

  group: "block",

  atom: true,

  selectable: true,

  draggable: true,

  addAttributes() {
    return {
      prompt: {
        default: "",
        parseHTML: (element) => element.getAttribute("data-prompt") || "",
        renderHTML: (attributes) => ({
          "data-prompt": attributes.prompt || "",
        }),
      },
      html: {
        default: "",
        parseHTML: (element) => element.getAttribute("data-html") || "",
        renderHTML: (attributes) => ({
          "data-html": attributes.html || "",
        }),
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-type="html-block"]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, { "data-type": "html-block" }),
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(HtmlBlockView);
  },

  addCommands() {
    return {
      insertHtmlBlock:
        () =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs: {
              prompt: "",
              html: "",
            },
          });
        },
    };
  },
});
